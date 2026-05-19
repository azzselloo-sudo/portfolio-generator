import { readFileSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { data } = req.body;
  if (!data || !data.name) return res.status(400).json({ error: '이름이 없습니다.' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GitHub 토큰 없음' });

  try {
    // portfolio.html 읽기
    const templatePath = join(process.cwd(), 'portfolio.html');
    let html = readFileSync(templatePath, 'utf-8');

    // _INLINE_DATA 스크립트 삽입 (</head> 바로 앞)
    const inlineScript = `<script>window._INLINE_DATA = ${JSON.stringify(data)};</script>`;
    html = html.replace('</head>', inlineScript + '\n</head>');

    // 슬러그 생성
    const slug = `${data.name.replace(/[^a-zA-Z0-9가-힣]/g, '-')}-${Date.now()}`;
    const filePath = `portfolios/${slug}.html`;
    const content = Buffer.from(html).toString('base64');

    // GitHub API로 파일 업로드
    const apiUrl = `https://api.github.com/repos/azzselloo-sudo/azzselloo-portfolio/contents/${filePath}`;
    const ghRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `포트폴리오 배포: ${data.name}`,
        content,
        branch: 'master',
      }),
    });

    if (!ghRes.ok) {
      const err = await ghRes.json();
      throw new Error(err.message || 'GitHub API 오류');
    }

    const url = `https://azzselloo-sudo.github.io/azzselloo-portfolio/${filePath}`;
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
