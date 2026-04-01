// pages/api/prices.js
// DeepTradeScan — Live Market Prices v1.0
// Binance 24hr ticker, tek istekte tüm desteklenen coinlerin anlık fiyatı

// Coin → Binance symbol haritası
const COIN_SYMBOLS = {
  BTC:'BTCUSDT',  ETH:'ETHUSDT',  BNB:'BNBUSDT',  SOL:'SOLUSDT',  XRP:'XRPUSDT',
  ADA:'ADAUSDT',  AVAX:'AVAXUSDT',DOT:'DOTUSDT',  LINK:'LINKUSDT', LTC:'LTCUSDT',
  BCH:'BCHUSDT',  XLM:'XLMUSDT',  VET:'VETUSDT',  TRX:'TRXUSDT',  DOGE:'DOGEUSDT',
  MATIC:'MATICUSDT', ARB:'ARBUSDT',  OP:'OPUSDT',  IMX:'IMXUSDT',  STRK:'STRKUSDT',
  NEAR:'NEARUSDT', APT:'APTUSDT',  SUI:'SUIUSDT',  SEI:'SEIUSDT',  INJ:'INJUSDT',
  TIA:'TIAUSDT',  TON:'TONUSDT',  KAS:'KASUSDT',  HBAR:'HBARUSDT', STX:'STXUSDT',
  FTM:'FTMUSDT',  ATOM:'ATOMUSDT', ICP:'ICPUSDT',  ALGO:'ALGOUSDT', RUNE:'RUNEUSDT',
  SHIB:'SHIBUSDT', PEPE:'PEPEUSDT', WIF:'WIFUSDT', FLOKI:'FLOKIUSDT', BONK:'BONKUSDT',
  TRUMP:'TRUMPUSDT', NOT:'NOTUSDT',
  AAVE:'AAVEUSDT', CRV:'CRVUSDT',  MKR:'MKRUSDT',  SNX:'SNXUSDT',   COMP:'COMPUSDT',
  DYDX:'DYDXUSDT', GMX:'GMXUSDT', PENDLE:'PENDLEUSDT', LDO:'LDOUSDT', GRT:'GRTUSDT',
  UNI:'UNIUSDT',  CAKE:'CAKEUSDT', SUSHI:'SUSHIUSDT',
  FET:'FETUSDT',  RENDER:'RENDERUSDT', TAO:'TAOUSDT', WLD:'WLDUSDT',
  OCEAN:'OCEANUSDT', AR:'ARUSDT', FIL:'FILUSDT', THETA:'THETAUSDT',
  ORDI:'ORDIUSDT', JUP:'JUPUSDT', PYTH:'PYTHUSDT', JTO:'JTOUSDT', RAY:'RAYUSDT',
  ENA:'ENAUSDT', ETHFI:'ETHFIUSDT', ONDO:'ONDOUSDT', BLUR:'BLURUSDT',
  SAND:'SANDUSDT', MANA:'MANAUSDT', AXS:'AXSUSDT', ENJ:'ENJUSDT',
  GALA:'GALAUSDT', MAGIC:'MAGICUSDT',
  CHZ:'CHZUSDT',  ENS:'ENSUSDT',  APE:'APEUSDT',   CRO:'CROUSDT',   BAT:'BATUSDT',
};

const SYMBOL_TO_COIN = Object.fromEntries(
  Object.entries(COIN_SYMBOLS).map(([c, s]) => [s, c])
);

// Sunucu-tarafı basit bellek cache (30 saniye)
let _cache = null;
let _cacheTs = 0;
const CACHE_TTL = 30_000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const now = Date.now();

  // Cache hit
  if (_cache && (now - _cacheTs) < CACHE_TTL) {
    return res.status(200).json(_cache);
  }

  try {
    const symbols = Object.values(COIN_SYMBOLS);
    const symbolsJson = JSON.stringify(symbols);

    // Binance tek istekte tüm sembollerin 24hr istatistiklerini döndürür
    const r = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsJson)}`,
      { headers: { 'User-Agent': 'DeepTradeScan/1.0' } }
    );

    if (!r.ok) throw new Error(`Binance HTTP ${r.status}`);

    const data = await r.json();
    if (!Array.isArray(data)) throw new Error('Geçersiz Binance yanıtı');

    const prices = data
      .filter(t => SYMBOL_TO_COIN[t.symbol])
      .map(t => ({
        coin:      SYMBOL_TO_COIN[t.symbol],
        symbol:    t.symbol,
        price:     parseFloat(t.lastPrice),
        change24h: parseFloat(t.priceChangePercent),
        volume:    parseFloat(t.quoteVolume),   // USDT cinsinden 24h hacim
        high:      parseFloat(t.highPrice),
        low:       parseFloat(t.lowPrice),
        count:     parseInt(t.count || 0),       // 24h işlem sayısı
      }))
      .sort((a, b) => b.volume - a.volume);     // varsayılan sıra: hacim azalan

    const result = {
      ok: true,
      ts: now,
      count: prices.length,
      prices,
    };

    _cache = result;
    _cacheTs = now;

    return res.status(200).json(result);

  } catch (e) {
    // Hata durumunda boş fiyat listesi döndür (UI graceful handle eder)
    return res.status(200).json({
      ok: false,
      ts: now,
      error: e.message,
      prices: [],
    });
  }
}
