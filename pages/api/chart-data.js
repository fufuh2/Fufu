// pages/api/chart-data.js — OHLCV proxy for lightweight-charts
// GET /api/chart-data?coin=BTC&interval=4H&limit=200
// Returns: { candles: [{time (unix seconds), open, high, low, close, volume}] }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { coin = 'BTC', interval = '4H', limit = '200' } = req.query;
  const sym = `${coin.toUpperCase().replace(/USDT?$/i, '')}-USDT`;
  const bar = interval.toUpperCase();
  const lim = Math.min(parseInt(limit) || 200, 300);

  try {
    let rawCandles = null;

    // 1) OKX market/candles (recent)
    const r1 = await fetch(
      `https://www.okx.com/api/v5/market/candles?instId=${sym}&bar=${bar}&limit=${lim}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (r1.ok) {
      const d1 = await r1.json();
      if (Array.isArray(d1?.data) && d1.data.length >= 10) rawCandles = d1.data;
    }

    // 2) OKX history-candles fallback
    if (!rawCandles) {
      const r2 = await fetch(
        `https://www.okx.com/api/v5/market/history-candles?instId=${sym}&bar=${bar}&limit=${lim}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (r2.ok) {
        const d2 = await r2.json();
        if (Array.isArray(d2?.data) && d2.data.length >= 10) rawCandles = d2.data;
      }
    }

    if (!rawCandles) return res.status(502).json({ error: 'OKX veri alınamadı' });

    // OKX returns newest first → reverse to oldest first
    // Format: [ts_ms, open, high, low, close, vol, ...]
    const candles = rawCandles.slice().reverse().map(k => ({
      time:   Math.floor(parseInt(k[0]) / 1000), // unix seconds for lightweight-charts
      open:   parseFloat(k[1]),
      high:   parseFloat(k[2]),
      low:    parseFloat(k[3]),
      close:  parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));

    return res.status(200).json({ candles, coin: sym, bar });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Sunucu hatası' });
  }
}
