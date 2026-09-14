const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const lan = process.argv.includes('--lan');
const root = path.resolve(__dirname, '..', lan ? 'www' : '.');
const types = { '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png', '.mp3':'audio/mpeg', '.wav':'audio/wav', '.ttf':'font/ttf', '.json':'application/json' };
const server = http.createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end(); return;
    }
    res.setHeader('Content-Type', types[path.extname(file).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    require('./serve-file')(req,res,file);
  } catch { res.writeHead(400); res.end(); }
});
server.listen(0, lan ? '0.0.0.0' : '127.0.0.1', () => {
  const port=server.address().port;
  console.log('Preview: http://127.0.0.1:'+port);
  if(lan)for(const addresses of Object.values(require('node:os').networkInterfaces()))for(const address of addresses||[])if(address.family==='IPv4'&&!address.internal)console.log('Phone (same network): http://'+address.address+':'+port);
});
