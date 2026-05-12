// routes/search.js — AI-powered natural language document search
const https  = require('https');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');
const router = require('express').Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL   = 'gemini-2.5-flash';

function callGemini(prompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 300, temperature: 0.1 },
    });
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST', timeout: 20000,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode !== 200) return reject(new Error(parsed?.error?.message || 'Gemini error'));
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          resolve(text.replace(/```json|```/g, '').trim());
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(payload); req.end();
  });
}

async function parseIntent(query, folders, investors) {
  const prompt = `Analyze this Vietnamese document search query and return ONLY a valid JSON object (no markdown, no explanation):
Query: "${query}"
Available folders: ${folders.map(f=>f.name).join(', ') || 'none'}
Available investors: ${investors.map(i=>i.name).join(', ') || 'none'}
Return: {"keywords":["word1","word2"],"folder_name":null,"investor_name":null,"file_type":null,"province":null,"project_type":null,"summary":"short Vietnamese summary"}
Rules: keywords = individual meaningful words. folder_name/investor_name = exact match from lists or null.`;

  const text = await callGemini(prompt);
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed.keywords)) {
    parsed.keywords = typeof parsed.keywords === 'string'
      ? parsed.keywords.split(/[\s,]+/).filter(Boolean) : [];
  }
  return parsed;
}

// Build WHERE conditions (excluding keyword clause) + params
function buildMetaConditions(intent, folders, investors, req) {
  const params = [];
  const conditions = ['d.is_deleted = false'];

  if (intent.folder_name) {
    const folder = folders.find(f =>
      f.name.toLowerCase().includes(intent.folder_name.toLowerCase()) ||
      intent.folder_name.toLowerCase().includes(f.name.toLowerCase())
    );
    if (folder) { params.push(folder.id); conditions.push(`d.folder_id = $${params.length}`); }
  }
  if (intent.investor_name) {
    const inv = investors.find(i =>
      i.name.toLowerCase().includes(intent.investor_name.toLowerCase()) ||
      intent.investor_name.toLowerCase().includes(i.name.toLowerCase())
    );
    if (inv) { params.push(inv.id); conditions.push(`d.investor_id = $${params.length}`); }
  }
  if (intent.file_type) {
    const TG = { pdf:['pdf'], word:['doc','docx'], excel:['xls','xlsx'], powerpoint:['ppt','pptx'] };
    const exts = TG[intent.file_type] || [intent.file_type];
    const si = params.length;
    exts.forEach(e => params.push(e));
    conditions.push(`d.file_type IN (${exts.map((_,i) => `$${si+i+1}`).join(',')})`);
  }
  if (intent.province)     { params.push(intent.province);     conditions.push(`d.province = $${params.length}`); }
  if (intent.project_type) { params.push(intent.project_type); conditions.push(`d.project_type = $${params.length}`); }
  if (req.user.role !== 'admin') {
    conditions.push(`(d.access_level IN ('public','internal') OR d.uploaded_by = '${req.user.id}' OR EXISTS(
      SELECT 1 FROM document_permissions dp WHERE dp.document_id=d.id AND dp.user_id='${req.user.id}' AND dp.can_view=true
    ))`);
  }
  return { params, conditions };
}

async function runQuery(whereConditions, params, pool) {
  // Score params are appended after filter params
  const scoreKws = params._scoreKws || [];
  const allParams = [...params];
  const scoreClauses = scoreKws.map(kw => {
    allParams.push(`%${kw}%`);
    const i = allParams.length;
    return `(CASE WHEN d.title ILIKE $${i} THEN 3 ELSE 0 END + CASE WHEN d.description ILIKE $${i} THEN 1 ELSE 0 END + CASE WHEN d.file_name ILIKE $${i} THEN 1 ELSE 0 END)`;
  });
  const scoreExpr = scoreClauses.length > 0 ? scoreClauses.join(' + ') : '0';
  const where = whereConditions.join(' AND ');

  const { rows } = await pool.query(
    `SELECT d.id, d.title, d.description, d.file_type, d.file_size,
            d.current_version, d.updated_at, d.file_name,
            f.name AS folder_name, ci.name AS investor_name,
            d.province, d.project_type,
            (${scoreExpr}) AS match_score
     FROM documents d
     LEFT JOIN folders f   ON f.id = d.folder_id
     LEFT JOIN catalogs ci ON ci.id = d.investor_id
     WHERE ${where}
     ORDER BY match_score DESC, d.updated_at DESC
     LIMIT 20`,
    allParams
  );
  return rows;
}

// POST /api/search/ai
router.post('/ai', authenticate, async (req, res) => {
  const { query } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: 'Thieu query' });

  try {
    const [foldersRes, investorsRes] = await Promise.all([
      pool.query('SELECT id, name FROM folders ORDER BY name'),
      pool.query("SELECT id, name FROM catalogs WHERE type='investor' ORDER BY name"),
    ]);
    const folders   = foldersRes.rows;
    const investors = investorsRes.rows;

    let intent = { keywords: [], summary: `Tim kiem: "${query.trim()}"` };
    try { intent = await parseIntent(query.trim(), folders, investors); }
    catch(e) { console.error('[AI Search] Parse error:', e.message); }

    const aiKws  = Array.isArray(intent.keywords) ? intent.keywords : [];
    const rawKws = query.trim().split(/\s+/).filter(k => k.length > 1);
    // Meaningful keywords: merge AI + raw, dedupe, max 8
    const allKws = [...new Set([...aiKws, ...rawKws])].filter(k => k.length > 1).slice(0, 8);
    if (allKws.length === 0) allKws.push(query.trim());

    const { params: metaParams, conditions: metaConditions } = buildMetaConditions(intent, folders, investors, req);

    // ── Strategy 1: AND — must match ALL keywords ──────────────────────────
    const andParams = [...metaParams];
    const andConditions = [...metaConditions];
    const andClauses = allKws.map(kw => {
      andParams.push(`%${kw}%`);
      const i = andParams.length;
      return `(d.title ILIKE $${i} OR d.description ILIKE $${i} OR d.file_name ILIKE $${i})`;
    });
    andConditions.push(andClauses.join(' AND ')); // AND between keywords
    andParams._scoreKws = allKws;

    let rows = await runQuery(andConditions, andParams, pool);

    // ── Strategy 2: Fallback OR — if AND found nothing ─────────────────────
    if (rows.length === 0) {
      const orParams = [...metaParams];
      const orConditions = [...metaConditions];
      const orClauses = allKws.map(kw => {
        orParams.push(`%${kw}%`);
        const i = orParams.length;
        return `(d.title ILIKE $${i} OR d.description ILIKE $${i} OR d.file_name ILIKE $${i})`;
      });
      orConditions.push(`(${orClauses.join(' OR ')})`);
      orParams._scoreKws = allKws;
      rows = await runQuery(orConditions, orParams, pool);
      intent._fallback = true; // signal to frontend
    }

    res.json({ results: rows, intent, total: rows.length });
  } catch(err) {
    console.error('[AI Search] error:', err.message);
    res.status(500).json({ error: err.message || 'Loi tim kiem' });
  }
});

module.exports = router;
