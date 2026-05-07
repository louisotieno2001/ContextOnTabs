const fs = require('fs');
const path = require('path');

const buildDir = process.argv[2] || 'build/chrome-mv3-prod';
const manifestPath = path.join(buildDir, 'manifest.json');
const optionsHtmlSrc = '.plasmo/options.html';
const optionsHtmlDest = path.join(buildDir, 'options.html');
const isDev = buildDir.includes('-dev');

function copyOptionsHtml() {
  if (!fs.existsSync(optionsHtmlSrc)) return false;
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
  fs.copyFileSync(optionsHtmlSrc, optionsHtmlDest);
  return true;
}

function updateManifest() {
  if (!fs.existsSync(manifestPath)) return false;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!manifest.options_ui) {
    manifest.options_ui = {
      page: 'options.html',
      open_in_tab: false
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }
  return true;
}

if (isDev) {
  const maxAttempts = 60;
  let attempts = 0;
  const tryCopy = () => {
    if (copyOptionsHtml() && updateManifest()) {
      console.log('options.html setup complete');
      return true;
    }
    if (++attempts < maxAttempts) {
      setTimeout(tryCopy, 1000);
    } else {
      console.error('Failed: .plasmo/options.html not generated after 60s');
    }
  };
  tryCopy();
} else {
  copyOptionsHtml();
  updateManifest();
}
