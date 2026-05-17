const Anthropic = require('@anthropic-ai/sdk');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');
const router = require('express').Router();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL  = 'claude-haiku-4-5'; // dùng Haiku cho search vì nhanh và rẻ hơn

async function parseIntent(query, folders, investors) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Phân tích câu tìm kiếm tài liệu tiếng Việt và trả về JSON (không có markdown):
Query: "${query}"
Thư mục: ${folders.map(f=>f.name).join(', ') || 'none'}
Chủ đầu tư: ${investors.map(i=>i.name).join(', ') || 'none'}
Trả về: {"keywords":["từ1","từ2"],"folder_name":null,"investor_name":null,"file_type":null,"province":null}`
    }]
  });

  const text = message.content[0]?.text || '{}';
  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);
  if (!Array.isArray(parsed.keywords)) {
    parsed.keywords = query.trim().split(/\s+/).filter(Boolean);
  }
  return parsed;
}

router.post('/ai', authenticate, async (req, res) => {
  const { query } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: 'Thiếu query' });

  try {
    const [foldersRes, investorsRes] = await Promise.all([
      pool.query('SELECT id, name FROM folders ORDER BY name'),
      pool.query("SELECT id, name FROM catalogs WHERE type='investor' ORDER BY name"),
    ]);
    const folders   = foldersRes.rows;
    const investors = investorsRes.rows;

    let intent = { keywords: query.trim().split(/\s+/).filter(Boolean) };
    try { intent = await parseIntent(query.trim(), folders, investors); } catch(e) {}

    const allKws = [...new Set([...(intent.keywords||[]), ...query.trim().split(/\s+/)])].filter(k=>k.length>1).slice(0,8);

    const conditions = ['d.is_deleted = false'];
    const params = [];

    if (intent.folder_name) {
      const folder = folders.find(f => f.name.toLowerCase().includes(intent.folder_name.toLowerCase()));
      if (folder) { params.push(folder.id); conditions.push(`d.folder_id = $${params.length}`); }
    }
    if (intent.investor_name) {
      const inv = investors.find(i => i.name.toLowerCase().includes(intent.investor_name.toLowerCase()));
      if (inv) { params.push(inv.id); conditions.push(`d.investor_id = $${params.length}`); }
    }
    if (req.user.role !== 'admin') {
      conditions.push(`(d.access_level IN ('public','internal') OR d.uploaded_by = '${req.user.id}')`);
    }

    const andParams = [...params];
    const andConds  = [...conditions];
    const andClauses = allKws.map(kw => {
      andParams.push(`%${kw}%`);
      return `(d.title ILIKE $${andParams.length} OR d.description ILIKE $${andParams.length} OR d.file_name ILIKE $${andParams.length})`;
    });
    andConds.push(andClauses.join(' AND '));

    let { rows } = await pool.query(
      `SELECT d.id,d.title,d.description,d.file_type,d.file_size,d.current_version,d.updated_at,d.file_name,
              f.name AS folder_name, ci.name AS investor_name, d.province, d.project_type
       FROM documents d
       LEFT JOIN folders f   ON f.id=d.folder_id
       LEFT JOIN catalogs ci ON ci.id=d.investor_id
       WHERE ${andConds.join(' AND ')}
       ORDER BY d.updated_at DESC LIMIT 20`, andParams
    );

    if (rows.length === 0) {
      const orParams = [...params];
      const orConds  = [...conditions];
      const orClauses = allKws.map(kw => {
        orParams.push(`%${kw}%`);
        return `(d.title ILIKE $${orParams.length} OR d.description ILIKE $${orParams.length} OR d.file_name ILIKE $${orParams.length})`;
      });
      orConds.push(`(${orClauses.join(' OR ')})`);
      const result = await pool.query(
        `SELECT d.id,d.title,d.description,d.file_type,d.file_size,d.current_version,d.updated_at,d.file_name,
                f.name AS folder_name, ci.name AS investor_name, d.province, d.project_type
         FROM documents d
         LEFT JOIN folders f   ON f.id=d.folder_id
         LEFT JOIN catalogs ci ON ci.id=d.investor_id
         WHERE ${orConds.join(' AND ')}
         ORDER BY d.updated_at DESC LIMIT 20`, orParams
      );
      rows = result.rows;
    }

    res.json({ results: rows, intent, total: rows.length });
  } catch(err) {
    console.error('[AI Search Claude]', err.message);
    res.status(500).json({ error: err.message || 'Lỗi tìm kiếm' });
  }
});

module.exports = router;
