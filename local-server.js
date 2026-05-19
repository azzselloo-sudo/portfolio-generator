// 로컬 테스트용 서버 — OPENAI_API_KEY 환경변수 자동 읽음
// 실행: node local-server.js
// 접속: http://localhost:3000

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

http.createServer(async (req, res) => {
  // ── /api/ai 프록시 ──
  if (req.method === 'POST' && req.url === '/api/ai') {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { message: 'OPENAI_API_KEY 환경변수가 없습니다.' } }));
    }
    let body = '';
    req.on('data', d => body += d);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini', ...payload }),
        });
        const data = await upstream.json();
        res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: e.message } }));
      }
    });
    return;
  }

  // ── 정적 파일 서빙 ──
  let url = req.url.split('?')[0];
  if (url === '/') url = '/generator.html';
  const filePath = path.join(__dirname, url);

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`✓ http://localhost:${PORT} 에서 실행 중`);
  console.log(`  API 키: ${process.env.OPENAI_API_KEY ? '✓ 연결됨' : '✗ OPENAI_API_KEY 환경변수 없음'}`);
});
