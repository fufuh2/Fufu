// pages/api/coins.js — META ELITE MARKET SCANNER
// Çok daha hızlı (High-Frequency) coin veri tarayıcısı. Cache süresi 10 dakikaya indirildi.

const CACHE_TTL = 10 * 60 * 1000; // 10 Dakika
let cachedCoins = null;
let lastFetch = 0;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Eğer veri çok yeniyse API'yi yormadan doğrudan önbellekten (RAM) ver
  if (cachedCoins && Date.now() - lastFetch < CACHE_TTL) {
    return res.status(200).json({ ...cachedCoins, _cached: true, latency: '1ms' });
  }

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000); // 8 Saniye Timeout koruması
    
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=300&page=1&sparkline=false',
      { headers: { Accept: 'application/json' }, signal: controller.signal }
    );
    clearTimeout(id);

    if (!response.ok) throw new Error('Veri kaynağı reddetti');
    
    const coins = await response.json();
    
    // Yalnızca hacmi olan, işlem yapılabilir coinleri filtrele
    const coinList = coins
      .filter(c => c.total_volume > 1000000) // 1 Milyon dolardan az hacmi olan çöp coinleri eler
      .map(c => ({
        symbol: c.symbol.toUpperCase(),
        name: c.name,
        rank: c.market_cap_rank,
        price: c.current_price,
        change24h: c.price_change_percentage_24h,
      }));

    const result = { 
      total_scanned: coinList.length, 
      coins: coinList, 
      updated_at: new Date().toISOString() 
    };
    
    cachedCoins = result;
    lastFetch = Date.now();
    return res.status(200).json(result);
  } catch (err) {
    // Hata anında son bilinen iyi veriyi (fallback) döndür
    if (cachedCoins) return res.status(200).json({ ...cachedCoins, _warning: 'Stale data' });
    return res.status(200).json({ total_scanned: 0, coins: [], error: 'Veri Ağı Hatası' });
  }
}
