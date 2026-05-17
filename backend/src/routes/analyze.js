const Anthropic = require('@anthropic-ai/sdk');
const path   = require('path');
const fs     = require('fs');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');
const router = require('express').Router();

let mammoth, XLSX;
try { mammoth = require('mammoth'); } catch(e) {}
try { XLSX = require('xlsx'); } catch(e) {}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL  = 'claude-haiku-4-5';

async function extractWordText(filePath) {
  if (mammoth) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value?.trim();
      if (text && text.length > 10) return text.slice(0, 30000);
    } catch(e) {}
  }
  try {
    const WordExtractor = require('word-extractor');
    const extractor = new WordExtractor();
    const doc = await extractor.extract(filePath);
    const text = doc.getBody()?.trim();
    if (text && text.length > 10) return text.slice(0, 30000);
  } catch(e) {}
  throw new Error('Không đọc được file Word');
}

function extractExcelText(filePath) {
  if (!XLSX) throw new Error('xlsx chưa cài');
  const wb = XLSX.readFile(filePath);
  let text = '';
  wb.SheetNames.forEach(name => {
    text += `\n=== Sheet: ${name} ===\n${XLSX.utils.sheet_to_csv(wb.Sheets[name])}`;
  });
  return text.slice(0, 30000);
}

async function extractPdfText(filePath) {
  try {
    const { PDFParse } = require('pdf-parse');
    const buf = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buf });
    const data = await parser.getText();
    return data.text?.slice(0, 30000) || '';
  } catch(e) { return ''; }
}

async function callClaudeText(prompt, text) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `${prompt}\n\n--- Nội dung tài liệu ---\n${text}`
    }]
  });
  return message.content[0]?.text || '';
}

async function callClaudeImage(prompt, base64data, mimeType) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64data } },
        { type: 'text', text: prompt }
      ]
    }]
  });
  return message.content[0]?.text || '';
}

const MIME_MAP = { png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', webp:'image/webp' };

const MODES = {
  summary:   { prompt: 'Hãy tóm tắt ngắn gọn các điểm chính của tài liệu này trong 200-300 từ. Trả lời bằng tiếng Việt.' },
  detail:    { prompt: 'Hãy phân tích chi tiết tài liệu: cấu trúc, luận điểm chính, số liệu quan trọng và kết luận. Trả lời bằng tiếng Việt.' },
  keypoints: { prompt: 'Liệt kê các điểm cốt lõi quan trọng nhất cần chú ý trong tài liệu này (dạng danh sách). Trả lời bằng tiếng Việt.' },
  questions: { prompt: 'Dựa vào nội dung tài liệu, hãy tạo ra 5 câu hỏi quan trọng và trả lời chi tiết từng câu. Trả lời bằng tiếng Việt.' },
  translate: { prompt: 'Please summarize the content of this document in English in 200-300 words.' },
};

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

router.post('/', authenticate, async (req, res) => {
  req.setTimeout(90000);
  res.setTimeout(90000);

  const { document_id, mode = 'summary' } = req.body;
  if (!document_id) return res.status(400).json({ error: 'Thiếu document_id' });

  const modeConfig = MODES[mode];
  if (!modeConfig) return res.status(400).json({ error: 'Mode không hợp lệ' });

  try {
    const { rows } = await pool.query(
      'SELECT * FROM documents WHERE id=$1 AND is_deleted=false', [document_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Không tìm thấy tài liệu' });

    const doc = rows[0];
    const filePath = path.resolve(UPLOAD_DIR, doc.file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File không tồn tại trên server' });

    const ft = doc.file_type?.toLowerCase();
    const { prompt } = modeConfig;
    let result = '';

    if (['png','jpg','jpeg','webp'].includes(ft)) {
      const base64data = fs.readFileSync(filePath).toString('base64');
      result = await callClaudeImage(prompt, base64data, MIME_MAP[ft]);

    } else if (ft === 'pdf') {
      const text = await extractPdfText(filePath);
      if (text.trim().length > 100) {
        result = await callClaudeText(prompt, text);
      } else {
        // PDF scan → gửi như ảnh (Claude hỗ trợ PDF base64)
        const base64data = fs.readFileSync(filePath).toString('base64');
        const message = await client.messages.create({
          model: MODEL,
          max_tokens: 2048,
          messages: [{
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64data } },
              { type: 'text', text: prompt }
            ]
          }]
        });
        result = message.content[0]?.text || '';
      }

    } else if (['doc','docx'].includes(ft)) {
      const text = await extractWordText(filePath);
      result = await callClaudeText(prompt, text);

    } else if (['xls','xlsx'].includes(ft)) {
      const text = extractExcelText(filePath);
      result = await callClaudeText(prompt, text);

    } else if (['txt','csv','md'].includes(ft)) {
      const text = fs.readFileSync(filePath, 'utf8').slice(0, 30000);
      result = await callClaudeText(prompt, text);

    } else {
      return res.status(400).json({ error: `Định dạng .${ft} chưa được hỗ trợ` });
    }

    await pool.query(
      `INSERT INTO activity_logs(user_id,document_id,action,details) VALUES($1,$2,'analyze',$3)`,
      [req.user.id, document_id, JSON.stringify({ mode })]
    );

    res.json({ result, mode, document_title: doc.title });
  } catch(err) {
    console.error('[Analyze Claude]', err.message);
    res.status(500).json({ error: err.message || 'Lỗi phân tích' });
  }
});

module.exports = router;
