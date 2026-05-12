const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ALLOWED = (process.env.ALLOWED_TYPES || 'pdf,doc,docx,xls,xlsx,ppt,pptx,txt,png,jpg,jpeg')
  .split(',').map(e => e.trim().toLowerCase());

const MAX_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 100) * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(process.env.UPLOAD_DIR || './uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).slice(1).toLowerCase();
  if (ALLOWED.includes(ext)) cb(null, true);
  else cb(new Error(`Định dạng file không được hỗ trợ: .${ext}`), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });

module.exports = { upload };
