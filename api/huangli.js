/**
 * 黄历代理：聚合数据 key 仅存于服务端环境变量，前端只请求本接口。
 * 部署到 Vercel 后，在项目 Settings → Environment Variables 添加 JUHE_ALMANAC_KEY。
 * 请求：GET /api/huangli?date=YYYY-MM-DD
 * 返回：{ yi: "宜1 宜2", ji: "忌1 忌2" }（与聚合接口一致）
 */
module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.end();
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const date = (req.query && req.query.date) || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'date required, format YYYY-MM-DD' });
    return;
  }
  const key = process.env.JUHE_ALMANAC_KEY;
  if (!key) {
    res.status(500).json({ error: 'JUHE_ALMANAC_KEY not configured' });
    return;
  }
  const url = 'https://v.juhe.cn/laohuangli/d?key=' + encodeURIComponent(key) + '&date=' + encodeURIComponent(date);
  try {
    const r = await fetch(url);
    const json = await r.json();
    if (json.error_code !== 0) {
      res.status(502).json({ error: json.reason || 'upstream error', error_code: json.error_code });
      return;
    }
    const result = json.result;
    if (!result) {
      res.status(502).json({ error: 'no result' });
      return;
    }
    res.status(200).json({ yi: result.yi || '', ji: result.ji || '' });
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
};
