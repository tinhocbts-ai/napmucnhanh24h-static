// Xem thu local: node serve.js  ->  http://localhost:8124
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = __dirname, PORT = 8124;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  let f = path.join(ROOT, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(ROOT, p, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(fs.readFileSync(path.join(ROOT, '404.html'))); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
}).listen(PORT, () => console.log('http://localhost:' + PORT));
