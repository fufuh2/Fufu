// Internal connectivity test — protected in production
export default async function handler(req, res) {
  const secret = req.headers['x-internal-secret'] || req.query.secret;
  const expected = process.env.INTERNAL_SECRET;
  if (!expected || secret !== expected) return res.status(404).json({ error: 'Not found.' });

  const results = {};
  try {
    const r = await fetch('https://www.okx.com/api/v5/market/history-candles?instId=BTC-USDT&bar=1D&limit=5');
    results.okx_status = r.status;
    if (r.ok) { const d = await r.json(); results.okx_ok = (d?.data?.length || 0) > 0; }
  } catch(e) { results.okx_error = e.message; }

  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    results.cg_status = r.status;
    if (r.ok) { const d = await r.json(); results.cg_btc_price = d?.bitcoin?.usd; results.cg_ok = !!d?.bitcoin?.usd; }
  } catch(e) { results.cg_error = e.message; }

  res.json(results);
}
