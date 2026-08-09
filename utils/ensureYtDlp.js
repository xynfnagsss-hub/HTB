const { execFileSync, execSync } = require('child_process');
const { createWriteStream } = require('fs');
const fs = require('fs');
const path = require('path');
const https = require('https');

const BIN_DIR = path.join(__dirname, '../bin');
const BIN_PATH = path.join(BIN_DIR, 'yt-dlp');

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
  // 1. Already downloaded
  if (fs.existsSync(BIN_PATH)) {
    console.log('[yt-dlp] Using cached binary at', BIN_PATH);
    return BIN_PATH;
  }

  // 2. System install
  try {
    execSync('yt-dlp --version', { timeout: 5000, stdio: 'pipe' });
    console.log('[yt-dlp] Using system binary');
    return 'yt-dlp';
  } catch {}

  // 3. Download from GitHub
  console.log('[yt-dlp] Downloading binary from GitHub...');
  if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });

  const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
  await download(url, BIN_PATH);
  fs.chmodSync(BIN_PATH, '755');
  console.log('[yt-dlp] Downloaded to', BIN_PATH);
  return BIN_PATH;
}

module.exports = { ensureYtDlp };
