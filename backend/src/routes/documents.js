const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { pool } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

async function canAccess(userId, userRole, doc) {
  if (userRole === 'admin') return true;
  if (doc.access_level === 'public') return true;
  if (doc.access_level === 'internal') return true;
  if (doc.uploaded_by === userId) return true;
  const { rows } = await pool.query('SELECT can_view FROM document_permissions WHERE document_id=$1 AND user_id=$2', [doc.id, userId]);
  return rows[0]?.can_view === true;
}

router.get('/', authenticate, async (req, res) => {
  const { q, folder_id, type, access_level, province, investor_id, partner_id, project_type, period_type, period_from, period_to, page=1, limit=20 } = req.query;
  const offset = (page-1)*limit;
  const params = [];
  const conditions = ['d.is_deleted = false'];
  const TG = { pdf:['pdf'], word:['doc','docx'], excel:['xls','xlsx'], powerpoint:['ppt','pptx'], image:['png','jpg','jpeg','gif','webp','svg'], text:['txt','csv','md'] };

  if (q)           { params.push(`%${q}%`);    conditions.push(`(d.title ILIKE $${params.length} OR d.description ILIKE $${params.length})`); }
  if (folder_id)   { params.push(folder_id);   conditions.push(`d.folder_id=$${params.length}`); }
  if (access_level){ params.push(access_level);conditions.push(`d.access_level=$${params.length}`); }
  if (province)    { params.push(province);    conditions.push(`d.province=$${params.length}`); }
  if (investor_id) { params.push(investor_id); conditions.push(`d.investor_id=$${params.length}`); }
  if (partner_id)  { params.push(partner_id);  conditions.push(`d.partner_id=$${params.length}`); }
  if (project_type){ params.push(project_type);conditions.push(`d.project_type=$${params.length}`); }
  if (period_type) { params.push(period_type); conditions.push(`d.period_type=$${params.length}`); }
  if (period_from) { params.push(period_from); conditions.push(`d.period_from>=$${params.length}`); }
  if (period_to)   { params.push(period_to);   conditions.push(`d.period_to<=$${params.length}`); }
  if (type) {
    const exts = TG[type]||[type]; const si=params.length;
    exts.forEach(e=>params.push(e));
    conditions.push(`d.file_type IN (${exts.map((_,i)=>`$${si+i+1}`).join(',')})`);
  }
  if (req.user.role!=='admin') {
    conditions.push(`(d.access_level IN ('public','internal') OR d.uploaded_by='${req.user.id}' OR EXISTS(SELECT 1 FROM document_permissions dp WHERE dp.document_id=d.id AND dp.user_id='${req.user.id}' AND dp.can_view=true))`);
  }

  const where = conditions.join(' AND ');
  try {
    const [docs, count] = await Promise.all([
      pool.query(`SELECT d.*,u.name AS uploader_name,u.avatar_initials,f.name AS folder_name,ci.name AS investor_name,cp.name AS partner_name FROM documents d LEFT JOIN users u ON u.id=d.uploaded_by LEFT JOIN folders f ON f.id=d.folder_id LEFT JOIN catalogs ci ON ci.id=d.investor_id LEFT JOIN catalogs cp ON cp.id=d.partner_id WHERE ${where} ORDER BY d.updated_at DESC LIMIT ${limit} OFFSET ${offset}`, params),
      pool.query(`SELECT COUNT(*) FROM documents d WHERE ${where}`, params),
    ]);
    res.json({ data: docs.rows, total: parseInt(count.rows[0].count), page: +page, limit: +limit });
  } catch(err){ console.error(err); res.status(500).json({ error:'Lỗi truy vấn' }); }
});

router.get('/check-duplicate', authenticate, async (req, res) => {
  const { title, folder_id, exclude_id } = req.query;
  if (!title) return res.status(400).json({ error:'Thiếu title' });
  const params=[title.trim()];
  let sql=`SELECT id,title,folder_id,current_version,(SELECT name FROM folders WHERE id=folder_id) AS folder_name FROM documents WHERE LOWER(title)=LOWER($1) AND is_deleted=false`;
  if (folder_id) { params.push(folder_id); sql+=` AND folder_id=$${params.length}`; }
  if (exclude_id){ params.push(exclude_id);sql+=` AND id!=$${params.length}`; }
  const { rows } = await pool.query(sql, params);
  res.json({ duplicate: rows.length>0, matches: rows });
});

router.get('/:id', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT d.*,u.name AS uploader_name,f.name AS folder_name,ci.name AS investor_name,cp.name AS partner_name FROM documents d LEFT JOIN users u ON u.id=d.uploaded_by LEFT JOIN folders f ON f.id=d.folder_id LEFT JOIN catalogs ci ON ci.id=d.investor_id LEFT JOIN catalogs cp ON cp.id=d.partner_id WHERE d.id=$1 AND d.is_deleted=false`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error:'Tài liệu không tồn tại' });
  if (!await canAccess(req.user.id, req.user.role, rows[0])) return res.status(403).json({ error:'Không có quyền' });
  await pool.query(`INSERT INTO activity_logs(user_id,document_id,action)VALUES($1,$2,'view')`,[req.user.id,req.params.id]);
  res.json(rows[0]);
});

router.post('/', authenticate, requireRole('admin','editor'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error:'Không có file' });
  const { title, description, folder_id, access_level='internal', version='v1.0', force='false',
    doc_date, period_type, period_from, period_to, province, investor_id, partner_id, project_type } = req.body;
  if (!title) return res.status(400).json({ error:'Vui lòng nhập tên tài liệu' });

  if (force!=='true') {
    const dp=[title.trim()]; let ds=`SELECT id,title FROM documents WHERE LOWER(title)=LOWER($1) AND is_deleted=false`;
    if (folder_id){ dp.push(folder_id); ds+=` AND folder_id=$${dp.length}`; }
    const { rows:dr } = await pool.query(ds,dp);
    if (dr.length>0){ try{fs.unlinkSync(path.resolve(process.env.UPLOAD_DIR||'./uploads',req.file.filename));}catch{}; return res.status(409).json({ error:'duplicate', message:`Tài liệu "${dr[0].title}" đã tồn tại.`, existing:dr[0] }); }
  }

  const ext=path.extname(req.file.originalname).slice(1).toLowerCase();
  try {
    const { rows } = await pool.query(
      `INSERT INTO documents(title,description,folder_id,uploaded_by,file_path,file_name,file_type,file_size,access_level,current_version,doc_date,period_type,period_from,period_to,province,investor_id,partner_id,project_type)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)RETURNING *`,
      [title.trim(),description,folder_id||null,req.user.id,req.file.filename,req.file.originalname,ext,req.file.size,access_level,version,doc_date||null,period_type||null,period_from||null,period_to||null,province||null,investor_id||null,partner_id||null,project_type||null]
    );
    await pool.query(`INSERT INTO document_versions(document_id,version,file_path,file_size,change_note,uploaded_by)VALUES($1,$2,$3,$4,$5,$6)`,[rows[0].id,version,req.file.filename,req.file.size,'Phiên bản đầu tiên',req.user.id]);
    await pool.query(`INSERT INTO activity_logs(user_id,document_id,action,details)VALUES($1,$2,'upload',$3)`,[req.user.id,rows[0].id,JSON.stringify({file_name:req.file.originalname})]);
    res.status(201).json(rows[0]);
  } catch(err){ console.error(err); res.status(500).json({ error:'Lỗi tải file lên' }); }
});

router.put('/:id', authenticate, requireRole('admin','editor'), async (req, res) => {
  const { title,description,folder_id,access_level,doc_date,period_type,period_from,period_to,province,investor_id,partner_id,project_type } = req.body;
  if (title) {
    const tf=folder_id!==undefined?folder_id:null; const dp=[title.trim(),req.params.id];
    let ds=`SELECT id,title FROM documents WHERE LOWER(title)=LOWER($1) AND is_deleted=false AND id!=$2`;
    if (tf){ dp.push(tf); ds+=` AND folder_id=$${dp.length}`; }
    const { rows:dr }=await pool.query(ds,dp);
    if (dr.length>0) return res.status(409).json({ error:'duplicate', message:`Tên "${dr[0].title}" đã tồn tại.`, existing:dr[0] });
  }
  const { rows }=await pool.query(
    `UPDATE documents SET title=COALESCE($1,title),description=COALESCE($2,description),folder_id=CASE WHEN $3::text IS NOT NULL THEN $3::uuid ELSE folder_id END,access_level=COALESCE($4,access_level),doc_date=COALESCE($5,doc_date),period_type=COALESCE($6,period_type),period_from=COALESCE($7,period_from),period_to=COALESCE($8,period_to),province=COALESCE($9,province),investor_id=CASE WHEN $10::text IS NOT NULL THEN $10::uuid ELSE investor_id END,partner_id=CASE WHEN $11::text IS NOT NULL THEN $11::uuid ELSE partner_id END,project_type=COALESCE($12,project_type),updated_at=NOW() WHERE id=$13 AND is_deleted=false RETURNING *`,
    [title?.trim()||null,description??null,folder_id||null,access_level||null,doc_date||null,period_type||null,period_from||null,period_to||null,province||null,investor_id||null,partner_id||null,project_type||null,req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error:'Tài liệu không tồn tại' });
  await pool.query(`INSERT INTO activity_logs(user_id,document_id,action,details)VALUES($1,$2,'edit',$3)`,[req.user.id,req.params.id,JSON.stringify({title})]);
  res.json(rows[0]);
});

router.post('/:id/version', authenticate, requireRole('admin','editor'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error:'Không có file' });
  const { version, change_note } = req.body;
  if (!version) return res.status(400).json({ error:'Vui lòng nhập phiên bản' });
  await pool.query(`INSERT INTO document_versions(document_id,version,file_path,file_size,change_note,uploaded_by)VALUES($1,$2,$3,$4,$5,$6)`,[req.params.id,version,req.file.filename,req.file.size,change_note,req.user.id]);
  const { rows }=await pool.query(`UPDATE documents SET current_version=$1,file_path=$2,file_size=$3,updated_at=NOW() WHERE id=$4 RETURNING *`,[version,req.file.filename,req.file.size,req.params.id]);
  res.json(rows[0]);
});

router.get('/:id/versions', authenticate, async (req, res) => {
  const { rows }=await pool.query(`SELECT dv.*,u.name AS uploader_name FROM document_versions dv LEFT JOIN users u ON u.id=dv.uploaded_by WHERE dv.document_id=$1 ORDER BY dv.created_at DESC`,[req.params.id]);
  res.json(rows);
});

router.get('/:id/download', authenticate, async (req, res) => {
  const { rows }=await pool.query('SELECT * FROM documents WHERE id=$1 AND is_deleted=false',[req.params.id]);
  if (!rows[0]) return res.status(404).json({ error:'Không tìm thấy' });
  if (!await canAccess(req.user.id,req.user.role,rows[0])) return res.status(403).json({ error:'Không có quyền' });
  await pool.query('UPDATE documents SET download_count=download_count+1 WHERE id=$1',[req.params.id]);
  await pool.query(`INSERT INTO activity_logs(user_id,document_id,action)VALUES($1,$2,'download')`,[req.user.id,req.params.id]);
  res.download(path.resolve(process.env.UPLOAD_DIR||'./uploads',rows[0].file_path),rows[0].file_name);
});

router.get('/:id/view-token', authenticate, async (req, res) => {
  const { rows }=await pool.query('SELECT * FROM documents WHERE id=$1 AND is_deleted=false',[req.params.id]);
  if (!rows[0]) return res.status(404).json({ error:'Không tìm thấy' });
  if (!await canAccess(req.user.id,req.user.role,rows[0])) return res.status(403).json({ error:'Không có quyền' });
  const jwt=require('jsonwebtoken');
  const token=jwt.sign({ file:rows[0].file_path,doc_id:rows[0].id,purpose:'view' },process.env.JWT_SECRET,{ expiresIn:'15m' });
  await pool.query(`INSERT INTO activity_logs(user_id,document_id,action)VALUES($1,$2,'view')`,[req.user.id,req.params.id]);
  res.json({ token,file_name:rows[0].file_name,file_type:rows[0].file_type,file_path:rows[0].file_path,view_url:`/files/${rows[0].file_path}` });
});

router.put('/:id/permissions', authenticate, requireRole('admin'), async (req, res) => {
  const { user_id,can_view,can_edit,can_delete }=req.body;
  const { rows }=await pool.query(`INSERT INTO document_permissions(document_id,user_id,can_view,can_edit,can_delete,granted_by)VALUES($1,$2,$3,$4,$5,$6)ON CONFLICT(document_id,user_id)DO UPDATE SET can_view=$3,can_edit=$4,can_delete=$5,granted_by=$6 RETURNING *`,[req.params.id,user_id,can_view,can_edit,can_delete,req.user.id]);
  res.json(rows[0]);
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  await pool.query('UPDATE documents SET is_deleted=true,updated_at=NOW() WHERE id=$1',[req.params.id]);
  await pool.query(`INSERT INTO activity_logs(user_id,document_id,action)VALUES($1,$2,'delete')`,[req.user.id,req.params.id]);
  res.json({ message:'Đã xoá tài liệu' });
});

module.exports = router;
