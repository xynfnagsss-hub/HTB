const { execSync } = require('child_process');
const { createWriteStream } = require('fs');
const fs = require('fs');
const path = require('path');
const https = require('https');

const isWin = process.platform === 'win32';
const BIN_DIR = path.join(__dirname, '../bin');
const BIN_NAME = isWin ? 'yt-dlp.exe' : 'yt-dlp';
const BIN_PATH = path.join(BIN_DIR, BIN_NAME);

function download(url, dest) {
  return new Promise((resolve, reject) => {
    function get(u) {
      https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
        if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location);
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} downloading yt-dlp`));
        const file = createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', reject);
      }).on('error', reject);
    }
    get(url);
  });
}

async function ensureYtDlp() {
  // 1. System install check
  try {
    execSync('yt-dlp --version', { timeout: 3000, stdio: 'pipe' });
    return 'yt-dlp';
  } catch {}

  // 2. Already downloaded check
  if (fs.existsSync(BIN_PATH)) {
    if (!isWin) {
      try { fs.chmodSync(BIN_PATH, '755'); } catch {}
    }
    return BIN_PATH;
  }

  // 3. Download appropriate platform binary from GitHub
  console.log(`[yt-dlp] Downloading ${BIN_NAME} from GitHub...`);
  if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });

  const url = isWin
    ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
    : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

  await download(url, BIN_PATH);
  if (!isWin) {
    try { fs.chmodSync(BIN_PATH, '755'); } catch {}
  }
  return BIN_PATH;
}

module.exports = { ensureYtDlp };
