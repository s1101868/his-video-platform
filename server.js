require('dotenv').config(); // <- 新增：讀取 .env
const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, 'uploads') });

const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'service-account.json'),
  scopes: ['https://www.googleapis.com/auth/drive.file']
});

async function uploadToDrive(filePath, fileName) {
  const drive = google.drive({ version: 'v3', auth });
  const fileMetadata = { name: fileName };
  const media = { mimeType: 'video/mp4', body: fs.createReadStream(filePath) };
  
  const res = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, webContentLink, webViewLink'
  });

  return res.data.webContentLink; // 可直接下載/播放的 URL
}

const app = express();
const PORT = process.env.PORT || 3000;
let VIDEOS_DIR, VIDEOS_DIR2;

if (process.platform === 'win32') {
  // Windows 本機
  VIDEOS_DIR = 'C:\\HIS\\WHO';
  VIDEOS_DIR2 = 'C:\\HIS\\WHO2';
} else {
  // Linux / Render
  VIDEOS_DIR = path.join(__dirname, 'WHO');
  VIDEOS_DIR2 = path.join(__dirname, 'WHO2');
}

// 確保資料夾存在
fs.mkdirSync(VIDEOS_DIR, { recursive: true });
fs.mkdirSync(VIDEOS_DIR2, { recursive: true });

console.log('VIDEOS_DIR:', VIDEOS_DIR);
console.log('VIDEOS_DIR2:', VIDEOS_DIR2);

app.use('/videos', express.static(VIDEOS_DIR));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/videos2', express.static(VIDEOS_DIR2));

// 新增：解析 JSON body（用於登入 POST）
app.use(express.json());

// 新增：從 users.csv 驗證帳號密碼
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ ok: false, message: '請輸入使用者名稱與密碼' });

  const csvPath = path.resolve(__dirname, 'users.csv');
  fs.readFile(csvPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ ok: false, message: '讀取帳號檔案失敗' });

    const lines = data.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const found = lines.find(line => {
      const [u, p] = line.split(',').map(s => (s || '').trim());
      return u === username && p === password;
    });

    if (found) return res.json({ ok: true, name: username });
    return res.status(401).json({ ok: false, message: '帳號或密碼錯誤' });
  });
});

// 新增：註冊 API（放在 /api/login 之附近）
app.post('/api/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ ok: false, message: '請輸入使用者名稱與密碼' });

  // 不允許包含逗號或換行以避免損壞 CSV
  if (/[,\r\n]/.test(username) || /[,\r\n]/.test(password)) {
    return res.status(400).json({ ok: false, message: '帳號或密碼包含不允許的字元' });
  }

  const csvPath = path.resolve(__dirname, 'users.csv');
  fs.readFile(csvPath, 'utf8', (err, data) => {
    // 若檔案不存在，直接建立新的
    const contents = err ? '' : data;
    const lines = contents.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const exists = lines.some(line => {
      const [u] = line.split(',').map(s => (s || '').trim());
      return u === username;
    });
    if (exists) return res.status(409).json({ ok: false, message: '使用者名稱已存在' });

    const toAppend = `\n${username},${password}`;
    fs.appendFile(csvPath, toAppend, 'utf8', (aerr) => {
      if (aerr) return res.status(500).json({ ok: false, message: '寫入帳號檔案失敗' });
      return res.status(201).json({ ok: true, name: username });
    });
  });
});

// server.js
// const path = require('path');
// const fs = require('fs');

function getVideosDirByDept(dept) {
  const baseDir = VIDEOS_DIR;

  switch(dept) {
    case '感染科':
      return path.join(baseDir, '感染科');
    case '手術科':
      return path.join(baseDir, '手術科');
    case '護士科':
      return path.join(baseDir, '護士科');
    default:
      return baseDir;
  }
}

function getVideosDir2ByDept(dept) {
  const baseDir = VIDEOS_DIR2;

  switch(dept) {
    case '感染科':
      return path.join(baseDir, '感染科');
    case '手術科':
      return path.join(baseDir, '手術科');
    case '護士科':
      return path.join(baseDir, '護士科');
    default:
      return baseDir;
  }
}
app.get('/api/videos', (req, res) => {
  const dept = req.query.dept;
  if (!dept) return res.status(400).json({ error: '請提供科別' });

  const dir = getVideosDirByDept(dept);

  fs.readdir(dir, (err, files) => {
    if (err) return res.status(500).json({ error: '無法讀取影片資料夾' });

    const videos = files
      .filter(f => /\.(mp4|webm|mov|mkv)$/i.test(f))
      .map(f => ({
        name: f,
        url: `/videos/${encodeURIComponent(dept)}/${encodeURIComponent(f)}`
      }));

    res.json(videos);
  });
});

// 靜態路徑對應科別


app.get('/api/videos2', (req, res) => {
  const dept = req.query.dept; // 新增科別參數
  let dir = dept ? getVideosDir2ByDept(dept) : VIDEOS_DIR2;

  fs.readdir(dir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Cannot read videos2 directory' });

    const videos = files
      .filter(f => /\.(mp4|webm|mov|mkv)$/i.test(f))
      .map(f => ({
        name: f,
        url: `/videos2/${encodeURIComponent(dept || '')}/${encodeURIComponent(f)}`
      }));

    res.json(videos);
  });
});

// 新增：產生題目（呼叫 Python generate_quiz.py，需在系統環境設定 GEMINI_API_KEY）
// 產生題目（呼叫 Python generate_quiz.py，先直接回傳原始文字）
app.get('/api/quiz', (req, res) => {
  const video = req.query.video;
  const source = req.query.source || 'videos'; // 默認 WHO

  if (!video) return res.status(400).json({ error: 'no_video' });
  if (video.includes('/') || video.includes('\\')) 
    return res.status(400).json({ error: 'invalid_video' });

  // 根據 source 選擇資料夾
  let dir;
  if (source === 'videos2') {
    dir = VIDEOS_DIR2; // WHO2
  } else {
    dir = VIDEOS_DIR;  // WHO
  }

  const videoPath = path.join(dir, video);
  if (!fs.existsSync(videoPath)) return res.status(404).json({ error: 'video_not_found' });

  const py = spawn('python', [path.join(__dirname, 'generate_quiz.py'), video], { env: process.env });
  py.stdout.setEncoding('utf8');
  let out = '', errOut = '';

  py.stdout.on('data', d => out += d.toString());
  py.stderr.on('data', d => errOut += d.toString());

  py.on('close', (code) => {
    if (code !== 0) {
      console.error('generate_quiz.py stderr:', errOut);
      console.error('generate_quiz.py stdout:', out);
      return res.status(500).json({ 
        error: 'quiz_generation_failed', 
        detail: out || errOut 
      });
    }

    try {
      const data = JSON.parse(out);
      res.json(data);
    } catch (e) {
      console.error('JSON parse failed:', out);
      res.status(500).json({ error: 'invalid_quiz_json', detail: out });
    }
  });
});

// 新增：處理後台上傳並回傳 JSON 結果
app.post('/api/admin/generate-video', upload.single('image'), (req, res) => {
  const file = req.file;
  const dept = req.body.dept || '';
  const prompt = req.body.prompt || '';
  const source = req.body.source || 'WHO'; // WHO or WHO2

  if (!file) return res.status(400).json({ ok: false, message: 'no_file' });

  // 根據 source 決定目標資料夾（WHO 或 WHO2），並建立資料夾
  let destDir, urlPrefix;
  if (source === 'WHO2') {
    destDir = dept ? getVideosDir2ByDept(dept) : VIDEOS_DIR2;
    urlPrefix = '/videos2/';
  } else {
    destDir = dept ? getVideosDirByDept(dept) : VIDEOS_DIR;
    urlPrefix = '/videos/';
  }
  try { fs.mkdirSync(destDir, { recursive: true }); } catch (e) {}

  const ext = path.extname(file.originalname) || '.jpg';
  const destName = Date.now() + ext;
  const destPath = path.join(destDir, destName);

  fs.rename(file.path, destPath, (err) => {
    if (err) {
      console.error('move failed:', err);
      return res.status(500).json({ ok: false, message: 'move_failed' });
    }
    // 使用 ffmpeg 將圖片轉成短影片（5 秒 mp4），並確保寬/高為偶數
    const outputName = destName.replace(path.extname(destName), '.mp4');
    const outputPath = path.join(destDir, outputName);
    console.log('ffmpeg will save video to:', outputPath);
    const ffargs = [
      '-y',
      '-loop', '1',
      '-i', destPath,
      '-c:v', 'libx264',
      '-t', '5',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-pix_fmt', 'yuv420p',
      outputPath
    ];

    const ff = spawn('ffmpeg', ffargs);
    let ffout = '', fferr = '';
    ff.stdout.on('data', d => ffout += d.toString());
    ff.stderr.on('data', d => fferr += d.toString());

    ff.on('close', async (code) => {
  if (code !== 0) {
    console.error('ffmpeg failed:', code, fferr);
    return res.status(500).json({ ok: false, message: 'ffmpeg_failed', detail: fferr });
  }

  try {
    // 上傳影片到 Google Drive
    const driveUrl = await uploadToDrive(outputPath, outputName);

    // 刪除本地暫存檔案
    fs.unlink(destPath, () => {});
    fs.unlink(outputPath, () => {});

    return res.json({ ok: true, url: driveUrl });
  } catch (e) {
    console.error('Google Drive upload failed:', e);
    return res.status(500).json({ ok: false, message: 'drive_upload_failed', detail: e.message });
  }
});
    });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Serving videos from ${VIDEOS_DIR}`);
});
