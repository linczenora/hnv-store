const router = require('express').Router();
const path   = require('path');
const fs     = require('fs');
const https  = require('https');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL   = 'gemini-2.5-flash';

// ── Prompts ───────────────────────────────────────────────────────────────────
const SYSTEM_VI = 'Bạn là chuyên gia phân tích tài liệu. Hãy trả lời HOÀN TOÀN bằng tiếng Việt, kể cả khi tài liệu viết bằng ngôn ngữ khác.';
const SYSTEM_EN = 'You are a professional document analyst. Respond only in English.';

const PROMPTS = {
  summary:   (t) => `Tài liệu: "${t}"\n\nHãy tóm tắt nội dung tài liệu này bằng tiếng Việt theo cấu trúc:\n1. Mục đích / Chủ đề chính\n2. Nội dung tóm tắt (3-5 câu)\n3. Kết luận hoặc điểm đáng chú ý`,
  detail:    (t) => `Tài liệu: "${t}"\n\nHãy phân tích chi tiết bằng tiếng Việt:\n1. Tổng quan và mục đích\n2. Cấu trúc nội dung\n3. Các luận điểm / số liệu / thông tin chính\n4. Nhận xét chất lượng\n5. Kết luận`,
  keypoints: (t) => `Tài liệu: "${t}"\n\nHãy liệt kê các điểm quan trọng nhất bằng tiếng Việt dạng danh sách bullet, mỗi điểm là một ý cần ghi nhớ.`,
  questions: (t) => `Tài liệu: "${t}"\n\nDựa trên nội dung, hãy tạo 5 câu hỏi kiểm tra hiểu biết và trả lời từng câu. Viết bằng tiếng Việt.`,
  translate: (t) => `Document: "${t}"\n\nProvide an English summary:\n1. Main topic and purpose\n2. Key content (3-5 sentences)\n3. Important conclusions`,
};

const MIME_MAP = {
  pdf:  'application/pdf',
  png:  'image/png',
  jpg:  'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', gif: 'image/gif',
};

// ── Gọi Gemini API ────────────────────────────────────────────────────────────
function callGeminiAPI(parts, systemInstruction) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.3,
      },
    });

    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      timeout: 120000, // 2 phút timeout
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode !== 200) {
            const msg = parsed?.error?.message || `Gemini API lỗi ${res.statusCode}`;
            return reject(new Error(msg));
          }
          // Lấy toàn bộ text từ tất cả parts
          const candidate = parsed?.candidates?.[0];
          const finishReason = candidate?.finishReason;
          const text = candidate?.content?.parts
            ?.map(p => p.text || '').join('') || '';

          // Nếu bị cắt do MAX_TOKENS — vẫn trả về phần đã có + ghi chú
          if (finishReason === 'MAX_TOKENS' && text) {
            return resolve(text + '\n\n_(Lưu ý: Nội dung dài, kết quả có thể chưa đầy đủ. Thử chọn chế độ "Tóm tắt nội dung" để có kết quả gọn hơn.)_');
          }
          if (!text) {
            const reason = finishReason || 'UNKNOWN';
            return reject(new Error(`Gemini không trả về nội dung (finishReason: ${reason})`));
          }
          resolve(text);
        } catch (e) {
          reject(new Error('Lỗi parse response từ Gemini: ' + e.message));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Quá thời gian chờ (120s). File quá lớn, vui lòng thử lại.'));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// GET /api/analyze/models — kiểm tra model nào available với API key hiện tại
router.get('/models', async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(503).json({ error: 'Chưa có GEMINI_API_KEY' });
  const https = require('https');
  let data = '';
  https.get(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`,
    (r) => {
      r.on('data', c => data += c);
      r.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const names = (parsed.models || [])
            .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
            .map(m => m.name);
          res.json({ available_models: names });
        } catch { res.status(500).json({ error: 'Parse lỗi', raw: data.slice(0, 500) }); }
      });
    }
  ).on('error', e => res.status(500).json({ error: e.message }));
});

// ── POST /api/analyze ─────────────────────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  // Tăng timeout lên 90 giây cho tài liệu lớn
  req.socket.setTimeout(90000);
  res.setTimeout(90000);

  const { document_id, mode = 'summary' } = req.body;

  if (!GEMINI_API_KEY) {
    return res.status(503).json({
      error: 'Chưa cấu hình GEMINI_API_KEY trong file .env của backend.'
    });
  }
  if (!document_id) return res.status(400).json({ error: 'Thiếu document_id' });

  try {
    // Lấy thông tin tài liệu
    const { rows } = await pool.query(
      'SELECT * FROM documents WHERE id = $1 AND is_deleted = false',
      [document_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Tài liệu không tồn tại' });

    const doc      = rows[0];
    const ft       = doc.file_type?.toLowerCase();
    const prompt   = (PROMPTS[mode] || PROMPTS.summary)(doc.title);
    const system   = mode === 'translate' ? SYSTEM_EN : SYSTEM_VI;
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath  = path.resolve(uploadDir, doc.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File không tồn tại trên server' });
    }

    let parts;

    if (['txt', 'csv', 'md'].includes(ft)) {
      // Text file — đọc nội dung
      const content = fs.readFileSync(filePath, 'utf8').slice(0, 60000);
      parts = [{ text: `${prompt}\n\n--- Nội dung tài liệu ---\n${content}` }];

    } else if (MIME_MAP[ft]) {
      // PDF hoặc ảnh — gửi base64
      const fileBuffer = fs.readFileSync(filePath);
      const base64data = fileBuffer.toString('base64');
      parts = [
        { inline_data: { mime_type: MIME_MAP[ft], data: base64data } },
        { text: prompt },
      ];

    } else {
      return res.status(400).json({
        error: `Định dạng .${ft} chưa được hỗ trợ. Hỗ trợ: PDF, ảnh (PNG/JPG), TXT, CSV, MD`
      });
    }

    const result = await callGeminiAPI(parts, system);

    // Ghi log
    await pool.query(
      `INSERT INTO activity_logs (user_id, document_id, action, details)
       VALUES ($1, $2, 'view', $3)`,
      [req.user.id, document_id, JSON.stringify({ action: 'analyze', mode })]
    );

    res.json({ result, mode, document_id });

  } catch (err) {
    console.error('[Analyze Gemini]', err.message);
    res.status(500).json({ error: err.message || 'Lỗi phân tích tài liệu' });
  }
});

module.exports = router;
