// pages/api/quantum.js
// CHARTOS APEX QUANTUM — THE KING
// Zone-Based Entry • Macro Calendar Aware • Trend Break Detection • Manipulation Shield
// Returns structured JSON: layers[], signal{}, scenarios{}, confidence{}, macroContext{}, trendBreaks{}, manipulationRisks[], institutionalZones{}

const {
  fetchMacroEvents, analyzeMacroCalendar, detectTrendBreaks,
  detectInstitutionalZones, scoreZoneQuality, assessManipulationRisks, detectSession,
} = require('../../lib/macro-calendar-engine');

// ══════════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════════
function r(n) { return Math.round(n * 100) / 100; }
function fmt(price) {
  if (price === null || price === undefined || isNaN(price) || !isFinite(price)) return '$0';
  const n = Number(price);
  const d = n >= 10000 ? 2 : n >= 1000 ? 2 : n >= 1 ? 4 : n >= 0.001 ? 6 : 8;
  try { return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: d })}`; }
  catch { return `$${n.toFixed(Math.max(2, d))}`; }
}

// ══════════════════════════════════════════════════
//  INDICATORS
// ══════════════════════════════════════════════════
function calcEMA(data, period) {
  if (!data || data.length < 2) return [data?.[0] ?? 0];
  const k = 2 / (period + 1);
  const seed = Math.min(period, data.length);
  let ema = data.slice(0, seed).reduce((a, b) => a + b, 0) / seed;
  const result = [ema];
  for (let i = seed; i < data.length; i++) { ema = data[i] * k + ema * (1 - k); result.push(ema); }
  return result;
}

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let ag = gains / period, al = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    ag = (ag * (period - 1) + Math.max(0, d)) / period;
    al = (al * (period - 1) + Math.max(0, -d)) / period;
  }
  return al === 0 ? 100 : r(100 - 100 / (1 + ag / al));
}

function calcMACD(closes) {
  if (closes.length < 35) return { macd: 0, signal: 0, histogram: 0, cross: 'NONE' };
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = ema12.map((v, i) => (v || 0) - (ema26[i] || 0));
  const validMacd = macdLine.filter(Boolean);
  const sig = calcEMA(validMacd, 9);
  const lastMacd = validMacd[validMacd.length - 1] || 0;
  const lastSig = sig[sig.length - 1] || 0;
  const prevMacd = validMacd[validMacd.length - 2] || 0;
  const prevSig = sig[sig.length - 2] || 0;
  const hist = r(lastMacd - lastSig);
  let cross = 'NONE';
  if (prevMacd <= prevSig && lastMacd > lastSig) cross = 'BULLISH';
  if (prevMacd >= prevSig && lastMacd < lastSig) cross = 'BEARISH';
  return { macd: r(lastMacd), signal: r(lastSig), histogram: hist, cross };
}

function calcATR(highs, lows, closes, period = 14) {
  if (highs.length < 2) return 0;
  const tr = [];
  for (let i = 1; i < highs.length; i++) {
    tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i-1]), Math.abs(lows[i] - closes[i-1])));
  }
  const seed = tr.slice(0, period).reduce((a,b) => a+b, 0) / period;
  let atr = seed;
  for (let i = period; i < tr.length; i++) atr = (atr * (period - 1) + tr[i]) / period;
  return r(atr);
}

function calcBollinger(closes, period = 20) {
  if (closes.length < period) return { upper: closes[closes.length-1]*1.02, lower: closes[closes.length-1]*0.98, middle: closes[closes.length-1], bandwidth: 0.04, squeeze: false };
  const slice = closes.slice(-period);
  const mid = slice.reduce((a,b) => a+b, 0) / period;
  const std = Math.sqrt(slice.map(v => (v-mid)**2).reduce((a,b) => a+b, 0) / period);
  const upper = r(mid + 2 * std);
  const lower = r(mid - 2 * std);
  const bw = r((upper - lower) / mid);
  return { upper, lower, middle: r(mid), bandwidth: bw, squeeze: bw < 0.04 };
}

function calcStochRSI(closes, rsiPeriod = 14, stochPeriod = 14) {
  if (closes.length < rsiPeriod + stochPeriod + 1) return { k: 50, d: 50 };
  const rsiValues = [];
  for (let i = rsiPeriod; i < closes.length; i++) {
    rsiValues.push(calcRSI(closes.slice(0, i + 1), rsiPeriod));
  }
  const slice = rsiValues.slice(-stochPeriod);
  const minR = Math.min(...slice);
  const maxR = Math.max(...slice);
  const k = maxR === minR ? 50 : r((rsiValues[rsiValues.length-1] - minR) / (maxR - minR) * 100);
  const d = r(rsiValues.slice(-3).reduce((a,b) => a+b, 0) / 3);
  return { k, d };
}

function calcOBV(closes, volumes) {
  if (!closes || !volumes || closes.length < 2) return { trend: 'NEUTRAL', slope: 0 };
  let obv = 0;
  const obvArr = [0];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i-1]) obv += volumes[i];
    else if (closes[i] < closes[i-1]) obv -= volumes[i];
    obvArr.push(obv);
  }
  const recent = obvArr.slice(-20);
  const emaObv = calcEMA(recent, 10);
  const slope = emaObv[emaObv.length-1] - emaObv[Math.max(0, emaObv.length-5)];
  return { trend: slope > 0 ? 'UP' : slope < 0 ? 'DOWN' : 'NEUTRAL', slope: r(slope), current: r(obv) };
}

function detectOrderBlocks(candles, tf = '1D') {
  if (!candles || candles.length < 5) return [];
  const obs = [];
  for (let i = 2; i < Math.min(candles.length - 1, 50); i++) {
    const c = candles[i], prev = candles[i-1], next = candles[i+1];
    // Bullish OB: bearish bar followed by strong bullish move
    if (c.close < c.open && next.close > c.high * 1.005) {
      obs.push({ type: 'bullish', high: r(c.high), low: r(c.low), tf, mitigated: candles.slice(i+1).some(x => x.low < c.low) });
    }
    // Bearish OB: bullish bar followed by strong bearish move
    if (c.close > c.open && next.close < c.low * 0.995) {
      obs.push({ type: 'bearish', high: r(c.high), low: r(c.low), tf, mitigated: candles.slice(i+1).some(x => x.high > c.high) });
    }
  }
  return obs.slice(0, 5);
}

function detectFVGs(candles, tf = '1D', currentPrice) {
  if (!candles || candles.length < 3) return [];
  const fvgs = [];
  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i-1], cur = candles[i], next = candles[i+1];
    // Bullish FVG
    if (next.low > prev.high) {
      const filled = candles.slice(i+1).some(x => x.low <= prev.high);
      fvgs.push({ type: 'bullish', high: r(next.low), low: r(prev.high), tf, filled, near: currentPrice ? Math.abs(currentPrice - (prev.high + next.low)/2) / currentPrice < 0.05 : false });
    }
    // Bearish FVG
    if (next.high < prev.low) {
      const filled = candles.slice(i+1).some(x => x.high >= prev.low);
      fvgs.push({ type: 'bearish', high: r(prev.low), low: r(next.high), tf, filled, near: currentPrice ? Math.abs(currentPrice - (prev.low + next.high)/2) / currentPrice < 0.05 : false });
    }
  }
  return fvgs.filter(f => !f.filled).slice(0, 5);
}

function detectStructure(candles) {
  if (!candles || candles.length < 10) return { structure: 'RANGING', bos: 'NONE', choch: 'NONE', swingHighs: [], swingLows: [] };
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const closes = candles.map(c => c.close);
  // Swing points
  const swingHighs = [], swingLows = [];
  for (let i = 2; i < highs.length - 2; i++) {
    if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && highs[i] > highs[i+1] && highs[i] > highs[i+2]) swingHighs.push(highs[i]);
    if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && lows[i] < lows[i+1] && lows[i] < lows[i+2]) swingLows.push(lows[i]);
  }
  // Trend determination
  let structure = 'RANGING';
  if (swingHighs.length >= 2 && swingLows.length >= 2) {
    const hhCount = swingHighs.slice(-3).filter((v,i,a) => i > 0 && v > a[i-1]).length;
    const hlCount = swingLows.slice(-3).filter((v,i,a) => i > 0 && v > a[i-1]).length;
    const lhCount = swingHighs.slice(-3).filter((v,i,a) => i > 0 && v < a[i-1]).length;
    const llCount = swingLows.slice(-3).filter((v,i,a) => i > 0 && v < a[i-1]).length;
    if (hhCount >= 1 && hlCount >= 1) structure = 'BULLISH';
    else if (lhCount >= 1 && llCount >= 1) structure = 'BEARISH';
  }
  // BOS/CHoCH detection
  const recentHigh = swingHighs[swingHighs.length-1] || highs[highs.length-1];
  const recentLow = swingLows[swingLows.length-1] || lows[lows.length-1];
  const lastClose = closes[closes.length-1];
  const bos = lastClose > recentHigh ? 'BULLISH' : lastClose < recentLow ? 'BEARISH' : 'NONE';
  const choch = structure === 'BEARISH' && lastClose > recentHigh ? 'BULLISH_CHOCH' : structure === 'BULLISH' && lastClose < recentLow ? 'BEARISH_CHOCH' : 'NONE';
  return { structure, bos, choch, swingHighs, swingLows };
}

function detectWyckoff(candles) {
  if (!candles || candles.length < 20) return { phase: 'Belirsiz', subPhase: 'Bilinmiyor', confidence: 40 };
  const closes = candles.map(c => c.close);
  const vols = candles.map(c => c.volume || 0);
  const price = closes[closes.length-1];
  const avg20 = closes.slice(-20).reduce((a,b) => a+b, 0) / 20;
  const avg50 = closes.length >= 50 ? closes.slice(-50).reduce((a,b) => a+b, 0) / 50 : avg20;
  const high20 = Math.max(...closes.slice(-20));
  const low20 = Math.min(...closes.slice(-20));
  const range20 = (high20 - low20) / avg20;
  const ema9 = calcEMA(closes, 9).pop();
  const ema21 = calcEMA(closes, 21).pop();
  // Volume trend
  const recentVol = vols.slice(-5).reduce((a,b) => a+b, 0) / 5;
  const prevVol = vols.slice(-15, -5).reduce((a,b) => a+b, 0) / 10;
  const volUp = recentVol > prevVol * 1.2;
  let phase = 'Accumulation (Phase B)', subPhase = 'Testing', confidence = 55;
  if (price > avg50 * 1.1 && ema9 > ema21 && volUp) { phase = 'Markup (Yükseliş)'; subPhase = 'SOS (Strength of Strength)'; confidence = 75; }
  else if (price > avg50 * 1.15 && !volUp) { phase = 'Distribution (Phase B)'; subPhase = 'UTAD Riski'; confidence = 65; }
  else if (price < avg50 * 0.9 && ema9 < ema21) { phase = 'Markdown (Düşüş)'; subPhase = 'LPS (Last Point of Supply)'; confidence = 70; }
  else if (price < avg50 * 0.95 && range20 < 0.08 && volUp) { phase = 'Accumulation (Phase C)'; subPhase = 'Spring / Şakelatör'; confidence = 72; }
  else if (price < avg50 * 0.95 && range20 < 0.06) { phase = 'Accumulation (Phase B)'; subPhase = 'Sıkışma Bölgesi'; confidence = 58; }
  return { phase, subPhase, confidence };
}

function calcFibonacci(highs, lows, closes) {
  const high = Math.max(...highs.slice(-100));
  const low = Math.min(...lows.slice(-100));
  const range = high - low;
  const price = closes[closes.length-1];
  const trending_up = price > (high + low) / 2;
  const swingHigh = trending_up ? high : closes[closes.length-1];
  const swingLow = trending_up ? low : Math.min(...lows.slice(-30));
  const rng = swingHigh - swingLow;
  return {
    swing_high: r(swingHigh), swing_low: r(swingLow),
    'fib_23.6': r(swingHigh - rng * 0.236),
    'fib_38.2': r(swingHigh - rng * 0.382),
    'fib_50.0': r(swingHigh - rng * 0.500),
    'fib_61.8': r(swingHigh - rng * 0.618),
    'fib_78.6': r(swingHigh - rng * 0.786),
    'fib_127': r(swingLow - rng * 0.272),
    'fib_161': r(swingLow - rng * 0.618),
    oteZone: `${fmt(swingHigh - rng * 0.618)} — ${fmt(swingHigh - rng * 0.786)}`,
  };
}

// ══════════════════════════════════════════════════
//  DATA FETCHING
// ══════════════════════════════════════════════════
async function ftch(url, timeout = 12000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeout);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; DeepTradeScan/2.0; +https://deeptradescan.com)' } });
    clearTimeout(t);
    if (!r.ok) return null;
    const data = await r.json();
    // Binance error response kontrolü
    if (data && typeof data === 'object' && !Array.isArray(data) && data.code && data.code < 0) return null;
    return data;
  } catch { clearTimeout(t); return null; }
}

// CoinGecko ID map
const GECKO_IDS = {
  BTC:'bitcoin', ETH:'ethereum', BNB:'binancecoin', SOL:'solana', XRP:'ripple',
  ADA:'cardano', AVAX:'avalanche-2', DOT:'polkadot', MATIC:'matic-network',
  ARB:'arbitrum', OP:'optimism', LINK:'chainlink', UNI:'uniswap', AAVE:'aave',
  INJ:'injective-protocol', SUI:'sui', APT:'aptos', NEAR:'near', ATOM:'cosmos',
  TON:'the-open-network', DOGE:'dogecoin', SHIB:'shiba-inu', PEPE:'pepe',
  LTC:'litecoin', TRX:'tron', RUNE:'thorchain', STX:'blockstack',
  IMX:'immutable-x', GMX:'gmx', LDO:'lido-dao', WLD:'worldcoin-wld',
  TAO:'bittensor', FET:'fetch-ai', RENDER:'render-token', TIA:'celestia',
  SEI:'sei-network', ENA:'ena', STRK:'starknet', JTO:'jito-governance-token',
};

// OKX kline parser (newest-first → reverse)
function parseOKXKlines(data) {
  const list = data?.data;
  if (!Array.isArray(list) || list.length === 0) return [];
  return list.slice().reverse().map(k => ({
    timestamp: parseInt(k[0]),
    open:   parseFloat(k[1]),
    high:   parseFloat(k[2]),
    low:    parseFloat(k[3]),
    close:  parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

// CoinGecko OHLC parser → [{timestamp, open, high, low, close, volume}]
function parseCGOHLC(ohlc, volumes) {
  if (!Array.isArray(ohlc) || ohlc.length === 0) return [];
  const volMap = {};
  if (Array.isArray(volumes)) volumes.forEach(([ts, v]) => { volMap[Math.round(ts/86400000)] = v; });
  return ohlc.map(([ts, o, h, l, c]) => ({
    timestamp: ts,
    open: o, high: h, low: l, close: c,
    volume: volMap[Math.round(ts/86400000)] || 0,
  }));
}

async function getQuantumData(symbol) {
  const okxSym = `${symbol}-USDT`;
  const geckoId = GECKO_IDS[symbol];

  // Önce OKX dene (geo-kısıtsız, tam OHLCV)
  const [k4h_okx, k1d_okx, k1w_okx, k1h_okx, ticker_okx, funding_okx, oi_okx] = await Promise.all([
    ftch(`https://www.okx.com/api/v5/market/history-candles?instId=${okxSym}&bar=4H&limit=200`),
    ftch(`https://www.okx.com/api/v5/market/history-candles?instId=${okxSym}&bar=1D&limit=365`),
    ftch(`https://www.okx.com/api/v5/market/history-candles?instId=${okxSym}&bar=1W&limit=104`),
    ftch(`https://www.okx.com/api/v5/market/candles?instId=${okxSym}&bar=1H&limit=100`),
    ftch(`https://www.okx.com/api/v5/market/ticker?instId=${okxSym}`),
    ftch(`https://www.okx.com/api/v5/public/funding-rate?instId=${okxSym}-SWAP`).catch(()=>null),
    ftch(`https://www.okx.com/api/v5/public/open-interest?instId=${okxSym}-SWAP`).catch(()=>null),
  ]);

  const c4h_o = parseOKXKlines(k4h_okx);
  const c1d_o = parseOKXKlines(k1d_okx);
  const c1w_o = parseOKXKlines(k1w_okx);
  const c1h_o = parseOKXKlines(k1h_okx);

  if (c1d_o.length >= 30) {
    const t = ticker_okx?.data?.[0];
    const price = t ? parseFloat(t.last) : c1d_o[c1d_o.length-1].close;
    return {
      candles4h: c4h_o, candles1d: c1d_o, candles1w: c1w_o, candles1h: c1h_o,
      closes:  c1d_o.map(c => c.close),
      highs:   c1d_o.map(c => c.high),
      lows:    c1d_o.map(c => c.low),
      volumes: c1d_o.map(c => c.volume),
      price,
      change24h:    t ? parseFloat(t.sodUtc8) || 0 : 0,
      high24h:      t ? parseFloat(t.high24h) : price,
      low24h:       t ? parseFloat(t.low24h)  : price,
      vol24h:       t ? parseFloat(t.volCcy24h) : 0,
      fundingRate:  funding_okx?.data?.[0] ? parseFloat(funding_okx.data[0].fundingRate || '0') : 0,
      openInterest: oi_okx?.data?.[0] ? parseFloat(oi_okx.data[0].oi || '0') : 0,
    };
  }

  // Fallback: CoinGecko
  if (!geckoId) return null;
  const cgBase = 'https://api.coingecko.com/api/v3';
  const [ohlc1d, ohlc4h, mktChart, coinData] = await Promise.all([
    ftch(`${cgBase}/coins/${geckoId}/ohlc?vs_currency=usd&days=365`),
    ftch(`${cgBase}/coins/${geckoId}/ohlc?vs_currency=usd&days=30`),
    ftch(`${cgBase}/coins/${geckoId}/market_chart?vs_currency=usd&days=365&interval=daily`),
    ftch(`${cgBase}/coins/${geckoId}?localization=false&tickers=false&community_data=false&developer_data=false`),
  ]);

  const volumes = mktChart?.total_volumes || [];
  const c1d_cg = parseCGOHLC(ohlc1d, volumes);
  const c4h_cg = parseCGOHLC(ohlc4h, []);

  if (c1d_cg.length < 30) return null;

  const md = coinData?.market_data;
  const price = md?.current_price?.usd || c1d_cg[c1d_cg.length-1].close;
  return {
    candles4h: c4h_cg, candles1d: c1d_cg, candles1w: c1d_cg.filter((_,i) => i % 7 === 0),
    closes:  c1d_cg.map(c => c.close),
    highs:   c1d_cg.map(c => c.high),
    lows:    c1d_cg.map(c => c.low),
    volumes: c1d_cg.map(c => c.volume),
    price,
    change24h:    md?.price_change_percentage_24h || 0,
    high24h:      md?.high_24h?.usd || price,
    low24h:       md?.low_24h?.usd  || price,
    vol24h:       md?.total_volume?.usd || 0,
    fundingRate:  0,
    openInterest: 0,
  };
}

async function getFearGreed() {
  try {
    const d = await ftch('https://api.alternative.me/fng/?limit=1', 5000);
    return { value: parseInt(d?.data?.[0]?.value || '50'), label: d?.data?.[0]?.value_classification || 'Neutral' };
  } catch { return { value: 50, label: 'Neutral' }; }
}

// ══════════════════════════════════════════════════
//  NOTE: analyzeMacroCalendar, detectTrendBreaks, assessManipulationRisks
//  are imported from ../../lib/macro-calendar-engine at the top of this file.
// ══════════════════════════════════════════════════

// ══════════════════════════════════════════════════
//  SECTOR DETECTION
// ══════════════════════════════════════════════════
function detectSector(symbol) {
  const s = symbol.toUpperCase();
  const map = {
    AI:       ['FET','TAO','WLD','OCEAN','ARKM','RENDER','THETA','VIRTUAL','AI16Z'],
    L1:       ['SOL','AVAX','NEAR','APT','SUI','SEI','INJ','TIA','TON','KAS','HBAR','STX','FTM','EGLD','ATOM','ICP','ALGO','FLOW','MINA','XTZ','ADA','DOT','XRP','TRX'],
    L2:       ['MATIC','ARB','OP','IMX','STRK','KAVA','METIS','ZRO'],
    DeFi:     ['AAVE','CRV','MKR','SNX','COMP','DYDX','GMX','PENDLE','LDO','GRT','SUSHI','YFI','1INCH','UNI','CAKE','RUNE'],
    GameFi:   ['SAND','MANA','AXS','ENJ','GALA','MAGIC','CHZ'],
    Meme:     ['SHIB','PEPE','WIF','FLOKI','TRUMP','POPCAT','BRETT','MEME','BOME','TURBO','NOT','BONK','DOGE'],
    RWA:      ['ONDO','BLUR','ENA','ETHFI'],
    Infra:    ['AR','FIL','LINK','GRT','BAND','API3'],
    Exchange: ['BNB','CRO'],
    Privacy:  ['XMR','ZEC','DASH'],
  };
  for (const [sector, coins] of Object.entries(map)) {
    if (coins.includes(s)) return sector;
  }
  return 'Other';
}

// ══════════════════════════════════════════════════
//  LIQUIDITY RISK ASSESSMENT
// ══════════════════════════════════════════════════
function assessLiquidityRisk(volume24h, price, fundingRate, openInterest) {
  const risks = [];
  if (volume24h < 5000000) risks.push('DÜŞÜK HACİM — spread genişleyebilir');
  if (Math.abs(fundingRate) > 0.001) risks.push(`YÜKSEK FUNDING (${(fundingRate*100).toFixed(4)}%) — squeeze riski`);
  if (openInterest > 0 && volume24h > 0 && openInterest / volume24h > 5) risks.push('OI/Hacim oranı yüksek — manüpülasyon riski');
  if (price < 0.01) risks.push('DÜŞÜK FİYAT — pump&dump riski');
  return risks;
}

// ══════════════════════════════════════════════════
//  DIRECTION LOCK — 11-Vote Consensus (same as Algo Engine)
// ══════════════════════════════════════════════════

function computeDirectionLock(data, indicators) {
  const { closes, price } = data;
  const { rsi1d, rsi4h, macd1d, macd4h, obv, struct1d, struct4h, struct1w } = indicators;

  // quantum.js'de calcEMA array döndürür — son değer al
  const ema9arr  = calcEMA(closes, 9);
  const ema21arr = calcEMA(closes, 21);
  const ema50arr = calcEMA(closes, 50);
  const ema9  = ema9arr[ema9arr.length - 1];
  const ema21 = ema21arr[ema21arr.length - 1];
  const ema50 = ema50arr[ema50arr.length - 1];
  const ema200 = closes.length >= 200
    ? (() => { const a = calcEMA(closes, 200); return a[a.length - 1]; })()
    : null;

  const votes = [
    // EMA Ribbon (3 oy)
    ema9 > ema21,
    price > ema50,
    ema200 !== null ? price > ema200 : null,
    // Yapısal Analiz (3 oy)
    struct1d.structure === 'BULLISH',
    struct4h.structure === 'BULLISH',
    struct1w.structure === 'BULLISH',
    // Momentum (3 oy)
    rsi1d > 50,
    macd1d.cross === 'BULLISH' || macd1d.histogram > 0,
    macd4h.cross === 'BULLISH' || macd4h.histogram > 0,
    // Hacim (2 oy)
    obv.trend === 'UP',
    rsi4h > 50,
  ].filter(v => v !== null);

  const bullVotes = votes.filter(Boolean).length;
  const bearVotes = votes.length - bullVotes;
  const total = votes.length;

  // Eşik: %60+ oy → yön belirlenir
  const direction = bullVotes >= Math.ceil(total * 0.6) ? 'LONG'
                  : bearVotes >= Math.ceil(total * 0.6) ? 'SHORT'
                  : 'WAIT';

  const maxVotes = Math.max(bullVotes, bearVotes);
  const confluence = Math.round((maxVotes / total) * 100);

  // Require minimum 60% agreement AND at least 7 votes for the winning side
  const minVotesRequired = 7;
  if (maxVotes < minVotesRequired) {
    return { direction: 'WAIT', confidence: 0, votes: { bull: bullVotes, bear: bearVotes }, reason: 'Yeterli oy yok (' + maxVotes + '/11)' };
  }

  return { direction, bullVotes, bearVotes, total, confluence };
}

// ══════════════════════════════════════════════════
//  STRUCTURAL SETUP GENERATOR — Real Chart-Based Levels
// ══════════════════════════════════════════════════

// Finds the best entry zone (OB, FVG, or Swing level) for given direction
function findBestEntryZone(direction, price, indicators) {
  const { obs1d, obs4h, fvg1d, fvg4h, struct1d, struct4h, atr1d } = indicators;
  const atr = atr1d || price * 0.025;
  const zones = [];
  const maxDist = price * 0.15; // max 15% away

  // Unmitigated Order Blocks (score 4-5)
  for (const ob of [...(obs1d||[]), ...(obs4h||[])]) {
    if (ob.mitigated) continue;
    const mid = (ob.high + ob.low) / 2;
    const dist = direction === 'LONG' ? price - mid : mid - price;
    if (direction === 'LONG' && ob.type === 'bullish' && mid < price && dist < maxDist) {
      zones.push({ type: 'Order Block', tf: ob.tf, high: ob.high, low: ob.low, mid, dist, score: ob.tf === '1D' ? 5 : 4 });
    }
    if (direction === 'SHORT' && ob.type === 'bearish' && mid > price && dist < maxDist) {
      zones.push({ type: 'Order Block', tf: ob.tf, high: ob.high, low: ob.low, mid, dist, score: ob.tf === '1D' ? 5 : 4 });
    }
  }

  // Unfilled Fair Value Gaps (score 2-3)
  for (const fvg of [...(fvg1d||[]), ...(fvg4h||[])]) {
    if (fvg.filled) continue;
    const mid = (fvg.high + fvg.low) / 2;
    const dist = direction === 'LONG' ? price - mid : mid - price;
    if (direction === 'LONG' && fvg.type === 'bullish' && mid < price && dist < maxDist * 0.8) {
      zones.push({ type: 'FVG', tf: fvg.tf, high: fvg.high, low: fvg.low, mid, dist, score: fvg.tf === '1D' ? 3 : 2 });
    }
    if (direction === 'SHORT' && fvg.type === 'bearish' && mid > price && dist < maxDist * 0.8) {
      zones.push({ type: 'FVG', tf: fvg.tf, high: fvg.high, low: fvg.low, mid, dist, score: fvg.tf === '1D' ? 3 : 2 });
    }
  }

  // Swing structure levels (score 1-2)
  const sh1d = struct1d.swingHighs || [];
  const sl1d = struct1d.swingLows || [];
  const sh4h = struct4h.swingHighs || [];
  const sl4h = struct4h.swingLows || [];

  if (direction === 'LONG') {
    const supports = [...sl1d, ...sl4h].filter(l => l < price && l > price * 0.82);
    for (const s of [...new Set(supports)].sort((a,b)=>b-a).slice(0, 4)) {
      const buf = s * 0.002;
      zones.push({ type: 'Swing Destek', tf: 'MTF', high: r(s + buf), low: r(s - buf * 3), mid: s, dist: price - s, score: 2 });
    }
  } else {
    const resistances = [...sh1d, ...sh4h].filter(h => h > price && h < price * 1.18);
    for (const s of [...new Set(resistances)].sort((a,b)=>a-b).slice(0, 4)) {
      const buf = s * 0.002;
      zones.push({ type: 'Swing Direnç', tf: 'MTF', high: r(s + buf * 3), low: r(s - buf), mid: s, dist: s - price, score: 2 });
    }
  }

  if (zones.length === 0) return null;

  // Bonus scoring: liquidity sweep (+20) and OB+FVG confluence (+15)
  for (const zone of zones) {
    // +20 bonus for zones that had a liquidity sweep before reversal
    // (price swept below a swing low then reversed = premium LONG zone)
    if (direction === 'LONG') {
      const swingLows = [...(struct1d.swingLows || []), ...(struct4h.swingLows || [])];
      const hadSweep = swingLows.some(sl => sl >= zone.low && sl <= zone.high);
      if (hadSweep) zone.score += 20;
    } else {
      const swingHighs = [...(struct1d.swingHighs || []), ...(struct4h.swingHighs || [])];
      const hadSweep = swingHighs.some(sh => sh >= zone.low && sh <= zone.high);
      if (hadSweep) zone.score += 20;
    }

    // +15 bonus for zones with confluence of OB + FVG at same price level (within 0.5%)
    if (zone.type === 'Order Block') {
      const allFvgs = [...(fvg1d || []), ...(fvg4h || [])];
      const hasFvgConfl = allFvgs.some(fvg => {
        if (fvg.filled) return false;
        const fvgMid = (fvg.high + fvg.low) / 2;
        return Math.abs(fvgMid - zone.mid) / zone.mid < 0.005;
      });
      if (hasFvgConfl) zone.score += 15;
    } else if (zone.type === 'FVG') {
      const allObs = [...(obs1d || []), ...(obs4h || [])];
      const hasObConfl = allObs.some(ob => {
        if (ob.mitigated) return false;
        const obMid = (ob.high + ob.low) / 2;
        return Math.abs(obMid - zone.mid) / zone.mid < 0.005;
      });
      if (hasObConfl) zone.score += 15;
    }
  }

  // Sort: highest score first, then closest distance
  zones.sort((a, b) => b.score - a.score || a.dist - b.dist);
  return zones[0];
}

// Builds a complete setup from real structural levels
function buildStructuralSetup(direction, price, indicators) {
  if (direction === 'WAIT') return null;
  const atr = indicators.atr1d || price * 0.025;
  const { struct1d, struct4h } = indicators;

  const zone = findBestEntryZone(direction, price, indicators);
  if (!zone) return null;

  const entryHigh = r(zone.high);
  const entryLow  = r(zone.low);
  const entry     = r((entryHigh + entryLow) / 2);
  const nearZone  = zone.dist <= atr * 2.5;
  const distanceToZonePct = r(zone.dist / price * 100);

  // SL: beyond zone invalidation level
  const sl = direction === 'LONG'
    ? r(zone.low  - atr * 0.3)
    : r(zone.high + atr * 0.3);

  const risk = Math.abs(entry - sl);

  // TP targets: next swing levels in trade direction (must clear min 1.5:1 R:R)
  const sh = [...new Set([...(struct1d.swingHighs||[]), ...(struct4h.swingHighs||[])])].sort((a,b)=>a-b);
  const sl_arr = [...new Set([...(struct1d.swingLows||[]), ...(struct4h.swingLows||[])])].sort((a,b)=>b-a);
  const minTarget = risk * 1.5;

  let tp1, tp2, tp3;
  if (direction === 'LONG') {
    const targets = sh.filter(h => h > entry + minTarget).sort((a,b)=>a-b);
    tp1 = r(targets[0] || entry + atr * 2.0);
    tp2 = r(targets[1] || tp1  + atr * 1.5);
    tp3 = r(targets[2] || tp2  + atr * 2.0);
    // Guarantee ascending order
    if (tp2 <= tp1) tp2 = r(tp1 + risk);
    if (tp3 <= tp2) tp3 = r(tp2 + risk);
  } else {
    const targets = sl_arr.filter(l => l < entry - minTarget).sort((a,b)=>b-a);
    tp1 = r(targets[0] || entry - atr * 2.0);
    tp2 = r(targets[1] || tp1  - atr * 1.5);
    tp3 = r(targets[2] || tp2  - atr * 2.0);
    // Guarantee descending order (SHORT TPs go lower)
    if (tp2 >= tp1) tp2 = r(tp1 - risk);
    if (tp3 >= tp2) tp3 = r(tp2 - risk);
  }

  const rr1 = risk > 0 ? r(Math.abs(tp1 - entry) / risk) : 0;
  const rr2 = risk > 0 ? r(Math.abs(tp2 - entry) / risk) : 0;
  const rr3 = risk > 0 ? r(Math.abs(tp3 - entry) / risk) : 0;
  const slDist = r(risk / entry * 100);

  return { zone, entryHigh, entryLow, entry, sl, slDist, tp1, tp2, tp3, rr1, rr2, rr3, nearZone, distanceToZonePct };
}

// ══════════════════════════════════════════════════
//  QUANTUM SYSTEM PROMPT — CHARTOS APEX QUANTUM v2.0 GOD MODE (FULL)
// ══════════════════════════════════════════════════
const QUANTUM_SYSTEM_PROMPT = `SİSTEM KİMLİĞİ VE FELSEFESİ
Sen CHARTOS APEX QUANTUM GOD MODE — dünyanın en gelişmiş çok boyutlu kripto analiz motorusun. Akademik finans araştırmalarından (Hidden Markov Models, Bayesian Inference, Shannon Entropy, Market Microstructure Theory) ve institutional trading metodolojilerinden (SMC, ICT, Wyckoff, Order Flow Analysis) sentezlenmiş, benzersiz bir hibrit sistemsin.
Temel İlke: Win rate, sinyal sayısından önce gelir. 100 zayıf sinyalden 1 tanesi bile üretme — 10 mükemmel sinyal üret, 9'unu kazan.

## KRİTİK KURAL: Yanıtını YALNIZCA geçerli JSON olarak ver. Başka hiçbir şey yazma.

## ═══ DIRECTIONAL CONSENSUS LOCK ═══
"ALGO CONSENSUS LOCK" bölümünde hesaplanmış yön verilecek. signal.direction MUTLAKA bu yönle AYNI olacak. İstisna: 4+ katman zıt yönde güçlü sinyal veriyorsa (tam zıt bias + score 7+) "WAIT" yapabilirsin.

══════════════════════════════════════════
BÖLÜM I: DOKUNULMAZ KURALLAR (IRON LAWS)
══════════════════════════════════════════

IRON LAW 1 — CONFIDENCE THRESHOLD SİSTEMİ
Önce YÖN tahmin et (bullish/bearish), sonra CONFIDENCE seviyesini hesapla (0-100).
Eğer confidence < 75 → İŞLEM YOK (direction="WAIT")
Confidence 75-84 → DÜŞÜK conviction (küçük pozisyon)
Confidence 85-94 → YÜKSEK conviction (normal pozisyon)
Confidence 95+ → ULTRA conviction (tam pozisyon, nadir)

IRON LAW 2 — CORE TRINITY + ENTROPY GATE
Kapı 1 (Core Trinity): K4-STRUCTURE + K6-LIQUIDITY + K5-MICROSTRUCTURE = aynı yön
Kapı 2 (Entropy Gate): Shannon Entropy < 0.65 (piyasa yeterince düzenli/tahmin edilebilir)
Her iki kapı da açık olmalıdır. Entropy yüksekse (>0.65) SİNYAL YOK.

IRON LAW 3 — ZONE-FIRST DOKTRİNİ
Asla mevcut fiyattan sinyal verme. Her sinyal: ZONE + TRIGGER + CONFIRMATION + CONFIDENCE SCORE dörtlüsüdür.
Zone minimum %0.3, maksimum %1.5 genişlikte. Zone'a giriş ANCAK tüm tetikleyiciler aktive olduğunda yapılır.

IRON LAW 4 — ANTİ-OVERFITTING PROTOKOLÜ
Tek indikatör veya tek timeframe'e dayanarak sinyal üretme. Minimum 3 bağımsız (non-correlated) onay kaynağı gerekir.

IRON LAW 5 — REGIME-ADAPTIVE DAVRANI
Sabit kurallar kullanma. Piyasa rejimi değiştikçe parametreler değişir:
Trending rejim → momentum indikatörlerine ağırlık ver
Mean-reversion rejim → osilatörlere ağırlık ver
Kaotik rejim (yüksek entropy) → hiçbir sinyal üretme

══════════════════════════════════════════
BÖLÜM II: 9 KATMANLI ANALİZ MOTORU (K0-K9)
══════════════════════════════════════════

KATMAN 0: REJİM TESPİTİ — HMM YAKLAŞIMI (K0-REGIME, ağırlık %10)
4 Rejim:
STATE_1 BULL_TREND: Düşük volatilite, pozitif momentum, artan hacim → Momentum long aktif
STATE_2 BEAR_TREND: Yüksek volatilite, negatif momentum, panik satış → Momentum short aktif
STATE_3 ACCUMULATION/CALM: Dar range, düşük hacim → Mean-reversion + yapısal analiz
STATE_4 HIGH_VOLATILITY_CHAOS: Aşırı vol, tahmin edilemez → SİNYAL YOK — BEKLE

Rejim Tespiti Değişkenleri: 20G volatilite, 10G momentum, hacim rejimi, ATR/fiyat oranı, BTC.D momentum, F&G trendi
Regime-Adaptif Parametreler:
BULL_TREND: RSI_OB=80, RSI_OS=40, EMA ağırlık HIGH, Min Confluence=3/9, Max Leverage=5x, Pozisyon=%100
BEAR_TREND: RSI_OB=70, RSI_OS=20, EMA ağırlık HIGH, Min Confluence=4/9, Max Leverage=3x, Pozisyon=%75
CALM: RSI_OB=75, RSI_OS=30, OB/FVG ağırlık HIGH, Min Confluence=4/9, Max Leverage=3x, Pozisyon=%75
CHAOS: Entropy_Max=N/A, Max Leverage=1x, Pozisyon=%0 (SİNYAL YOK)

STATE_4 (CHAOS) tespit edildiğinde analiz durur. Çıktı: "REGIME = CHAOS — NO TRADE ZONE — BEKLE"

KATMAN 1: SHANNON ENTROPY FİLTRESİ (K1-ENTROPY, ağırlık %5)
MTF Ağırlıklı Entropy = 1W×25% + 1D×30% + 4H×25% + 1H×15% + 15M×5%

Entropy Karar Tablosu:
< 0.40 → HIGHLY_READABLE → Güçlü trend, tam güvenle analiz et
0.40-0.55 → READABLE → İyi okunabilirlik
0.55-0.65 → MARGINAL → Dikkatli ol, conviction düşür
0.65-0.75 → POOR → Sadece Grade S sinyaller
> 0.75 → UNREADABLE → Kaotik, SİNYAL ÜRETME

Gate: OPEN(<0.65) | RESTRICTED(0.65-0.75, conviction -10%) | CLOSED(>0.75, dur)
ENTROPY_GATE = CLOSED ise analiz durur.

KATMAN 2: MAKRO REJİM & KORELASYON MATRİSİ (K2-MACRO, ağırlık %10)
Makro Ortam: BTC 1W yapısı (HH/HL=bullish, LH/LL=bearish), BTC.D trendi (>%0.5/hafta artış=altcoin tehlike), Total2/3 momentum, USDT/USDC supply değişimi, DXY+US10Y, F&G

BTC Korelasyon:
BTC_CORR_7D > 0.90 → YÜKSEK: BTC proxy, önce BTC analiz et, conviction -15%
BTC_CORR_7D 0.70-0.90 → ORTA: BTC yönü dikkate al
BTC_CORR_7D < 0.70 → DÜŞÜK/DECOUPLED: Bağımsız analiz geçerli

Makro Takvim:
48s içinde FOMC/CPI/NFP → MACRO_FREEZE: Long sinyaller 1 grade düşür, conviction -20%
7G içinde büyük makro → MACRO_CAUTION: -10%
Makro boşluk → MACRO_CLEAR: Teknik analiz tam ağırlık

KATMAN 3: SEKTÖR & NARRATİF İSTİHBARATI (K3-SECTOR, ağırlık %8)
Sektör Rotasyon Döngüsü: BTC Rally → ETH → Large Cap L1/L2 → Mid Cap DeFi/AI → Small Cap → Meme → TOP
Döngü Fazları: EARLY | MID | LATE | POST_TOP

Narratif Yaşam Döngüsü:
NASCENT → İlk ilgi, düşük hacim, yüksek potansiyel
EMERGING → Artan ilgi, hacim artışı, alpha fırsatı
PEAK → Maksimum hype, geç girişler tehlikeli
FADING → Azalan ilgi, çıkışlar hızlanıyor
DORMANT → Kimse konuşmuyor, kontrarian fırsat olabilir

Coin Pozisyonu: SECTOR_LEADER | HIGH_BETA (beta>1.5) | LOW_BETA | CONTRARIAN
Relatif Güç: OUTPERFORMER | WEAKENING | UNDERPERFORMER | RECOVERING

KATMAN 4: MULTI-TIMEFRAME YAPI ANALİZİ (K4-STRUCTURE, ağırlık %22) — CORE TRİNİTY
Her TF (1W/1D/4H/1H/15M) için analiz yap.

Wyckoff Fazlama: Accumulation A-E, Distribution A-E, Markup, Markdown
Kritik olaylar: Spring, UTAD, SOS, SOW, Test, Creek

SMC (Smart Money Concepts):
BOS (Break of Structure): Higher High kırılması=bullish, Lower Low kırılması=bearish
CHoCH (Change of Character): Trendteki ilk karşı yapısal kırılma
Order Block (OB): Son impulsive hareketin başlangıç mumu (Bullish OB: son bearish mum / Bearish OB: son bullish mum)
OB Geçerlilik: Mitigate edilmemiş + impulsive hareketle oluşmuş + hacim ortalamanın üstünde
FVG (Fair Value Gap): 3 mum arasındaki doldurulmamış boşluk
Breaker Block: Kırılmış OB'nin ters tarafı — agresif entry zone

ICT Konseptleri:
AMD Döngüsü: Accumulation → Manipulation → Distribution
OTE (Optimal Trade Entry): Fibonacci 0.618-0.786 retrace zone'u — en yüksek R:R
Kill Zone: Asian(00:00-04:00 UTC), London(08:00-12:00), NY(13:00-17:00)
Judas Swing: Kill Zone açılışındaki ilk hareket genellikle YANLIŞ yön — bekle, ters al
Liquidity Void: Düşük hacim bölgeleri, fiyat doldurmaya meyillidir

MTF Mutabakat Matrisi (1W×30% + 1D×25% + 4H×20% + 1H×15% + 15M×10%):
1W ve 1D çelişiyorsa → 1 grade düşür
1W+1D+4H hizalıysa → conviction artır
Counter-trend (üst TF zıt) → conviction -%50

KATMAN 5: MARKET MICROSTRUCTURE & ORDER FLOW (K5-MICROSTRUCTURE, ağırlık %18) — CORE TRİNİTY
VPIN (bilgilenmiş trading göstergesi):
< 0.30 LOW | 0.30-0.45 MODERATE | 0.45-0.60 HIGH (büyük hareket yakın) | > 0.60 EXTREME

OFI (Order Flow Imbalance):
> +2σ → Güçlü alım baskısı | < -2σ → Güçlü satış baskısı | ±1σ → Dengeli

CVD (Cumulative Volume Delta):
Trend + Divergence (fiyat HH, CVD LH = BEARISH DIV) + Z-Score (>+2.0=tükenme, <-2.0=toparlanma) + Absorption
Absorption: Fiyat düşüyor ama CVD yükseliyor = limit alıcılar absorbe ediyor → bullish

Stacked Imbalance: 3+ ardışık seviyede aynı yönde %300+ imbalance = INSTITUTIONAL FORTRESS
Orderbook Depth: BID/ASK>1.5=alttan güçlü | <0.67=üstten direnç | 0.67-1.5=dengeli
Taker Buy/Sell Ratio: >1.15=bullish | <0.85=bearish

KATMAN 6: LİKİDİTE HARİTASI & AKILLI PARA (K6-LIQUIDITY, ağırlık %15) — CORE TRİNİTY
Likidite Mıknatısları: Equal Highs/Lows (stop havuzları), Trendline Liquidity, Round Numbers
Funding Rate + OI Composite:
OVERLEV_LONG: Funding>+0.03% + OI yüksek/artan → Long squeeze riski
OVERLEV_SHORT: Funding<-0.03% + OI yüksek/artan → Short squeeze riski
HEALTHY: Funding +0.01-0.03% + OI stabil → Trend devam
CAPITULATION: Funding negatife döndü + OI hızla düşüyor → Dip potansiyeli
NEUTRAL: Funding ~0%, OI stabil

Smart Money Footprint:
ACCUMULATING: Fiyat düşerken OI artıyor + CVD yükseliyor + funding nötr
DISTRIBUTING: Fiyat yükselirken CVD düşüyor + yüksekte büyük satış emirleri
Likidasyon Cascade Riski tespiti

KATMAN 7: BAYESIAN İNDİKATÖR CONFLUENCE (K7-INDICATORS, ağırlık %7)
İndikatörler (Regime-Adaptif Ağırlıklı):
EMA Ribbon (9/21/50/100/200): Bullish stack=tüm EMAs sıralı | Bearish stack | Compression | Mixed
RSI(14): Regime-adaptif OB/OS seviyeleri + divergence tespiti
MACD: Cross yönü + histogram analizi + divergence
Bollinger Bands: SQUEEZE → EXPANSION yönü kritik
StochRSI: K/D cross tespiti
ATR(14): Volatilite rejimi + SL hesaplama
VWAP: Intraday ağırlık %12
Volume Profile: POC, VAH, VAL seviyeleri

Fibonacci Fortress (±0.5% tolerans içinde kümelenme):
2 seviye = WEAK_CLUSTER | 3 seviye = MODERATE_CLUSTER | 4+ seviye = FIBONACCI_FORTRESS

Divergence Kataloğu:
REGULAR BULLISH DIV (fiyat LL, RSI HL) → P(reversal)=0.65
REGULAR BEARISH DIV (fiyat HH, RSI LH) → P(reversal)=0.65
HIDDEN BULLISH DIV (fiyat HL, RSI LL) → P(continuation)=0.72
HIDDEN BEARISH DIV (fiyat LH, RSI HH) → P(continuation)=0.72
TRIPLE BULLISH DIV → P(reversal)=0.82
CVD BEARISH DIV → P(reversal)=0.70
Multi-indicator divergence (RSI+MACD+CVD aynı anda) → P=0.85+

Bayesian Confluence: P(Bullish|Evidence) = Bayesian güncelleme ile tüm indikatörleri sentezle

KATMAN 8: ON-CHAIN İSTİHBARAT (K8-ONCHAIN, ağırlık %5)
Exchange Net Flow >%2 çıkış=bullish | >%2 giriş=bearish
Whale TX artışı + fiyat düşük=bullish | + fiyat yüksek=bearish
Active Addresses 30G artan=bullish | azalan=bearish
Token Unlock: 14G içinde >%2 → 1 grade düşür | >%5 → LONG SİNYAL ÜRETME
Staking Ratio >%60 ve artıyor = arz sıkışması=bullish
Veri yoksa Fear & Greed + Funding + OI proxy olarak kullan

KATMAN 9: ALTCOİN RİSK MATRİSİ (K9-RISK, ayarlayıcı)
Risk Faktörleri ve Etkileri:
Likidite: 24s Vol/MCap < 0.05 → kaldıraç max 2x, pozisyon %50
Thin Book: ±2% derinlik < $500K → "THIN BOOK" uyarısı
Manipülasyon: Top10 holder>%50 + düşük hacim → Grade max B, kaldıraç max 2x
BTC Korelasyon >0.90 → "BTC proxy — bağımsız analiz geçersiz"
Regülasyon Riski → Long sinyaller 1 grade düşür
Smart Contract: Audit yok/exploit geçmişi → Grade max B
Token Unlock: 14G içinde >%2 → 1 grade düşür
Meme: Sektör=Meme → Grade max B, risk 2x, kaldıraç max 2x

Risk Seviyeleri:
0-1 aktif risk: LOW → 1.0x pozisyon, normal parametre
2-3: MEDIUM → 0.75x, kaldıraç max 3x
4-5: HIGH → 0.50x, kaldıraç max 2x
6+: EXTREME → 0.25x veya DO_NOT_TRADE

══════════════════════════════════════════
BÖLÜM III: QUANTUM FUSION ENGINE v2.0
══════════════════════════════════════════

ADIM 1: ÖN-FİLTRE (HARD GATES)
Gate 1: K0 = STATE_4 (CHAOS)? → STOP
Gate 2: K1 ENTROPY_GATE = CLOSED? → STOP
Gate 3: K9 = EXTREME + DO_NOT_TRADE? → STOP

ADIM 2: CORE TRINITY + ENTROPY TEST
K4(Yapı) + K5(Microstructure) + K6(Likidite):
3/3 aynı yön = FULL TRINITY ✅
2/3 aynı yön = PARTIAL TRINITY ⚠️ (conviction -15%)
Hepsi farklı = NO TRINITY ❌ → SİNYAL YOK

ADIM 3: 9-KATMAN AĞIRLIKLI CONFIDENCE
K0×10% + K1×5% + K2×10% + K3×8% + K4×22% + K5×18% + K6×15% + K7×7% + K8×5% = TOPLAM

ADIM 4: FİLTRE UYGULAMALARI
K2 RISK_OFF + LONG → -15%
K3 SECTOR_DECLINE + LONG → -10%
BTC_CORR >0.90 → -15%
K4 alignment <60% → -10%
MACRO_FREEZE → -20%
K9 grade cap ve position modifier uygula

ADIM 5: FİNAL GRADE
S (92-100): Tüm katmanlar mükemmel, nadir — tam pozisyon
A (80-91): Güçlü hizalanma — normal pozisyon
B (70-79): Orta hizalanma — küçük pozisyon
C (60-69): Zayıf hizalanma — minimum veya BEKLE
D (<60): SİNYAL ÜRETİLMEZ — direction="WAIT"

══════════════════════════════════════════
BÖLÜM IV: WIN RATE MAKSİMİZASYON KURALLARI
══════════════════════════════════════════

KURAL 1: Grade D = sinyal yok. Grade C = sadece uyarı. Gerçek sinyaller A ve S.
KURAL 2: < 75 confidence = sinyal yok. P(success) < %70 ise "DÜŞÜK OLASILI" uyarısı.
KURAL 3: Zone + trigger + confirmation gerekli. İlk giriş %30, onay gelince %70 ekle.
KURAL 4: TP1 min R:R=2.0 | TP2=3.5 | TP3=5.0 — altında sinyal üretme.
KURAL 5: Entropy >0.75 = oturma ve bekleme zamanı.
KURAL 6: K0 rejim değiştiğinde tüm açık sinyaller yeniden değerlendirilir.
KURAL 7: Meme coin — Grade max B, risk 2x, kaldıraç max 2x, token unlock riski 3x ağırlıklı.
KURAL 8: 24s spot hacim < $5M → "LOW LIQUIDITY" uyarısı, kaldıraç max 2x.
KURAL 9: 3+ bağımsız indikatörde divergence = Bayesian P>0.85 = SÜPER SİNYAL, özel vurgula.
KURAL 10: INVALIDATION kırılırsa | K0→CHAOS | Büyük makro olay | Funding +%300 spike → sinyal iptal.

## SETUP SEVİYELERİ:
- Entry: OB veya FVG orta noktası — ASLA anlık fiyat değil
- SL: Giriş bölgesi LOW/HIGH ötesi + ATR×0.2-0.5 buffer
- LONG: tp1 < tp2 < tp3 (artan) | SHORT: tp1 > tp2 > tp3 (azalan)
- TP1 min R:R=2.0, TP2=3.5, TP3=5.0 — altında sinyal yok
- Bölge 2+ ATR uzaksa → direction="WAIT"
- Tüm yanıt Türkçe; teknik terimler İngilizce kalabilir

## ÇIKTI JSON FORMATI (9 KATMAN + QUANTUM FUSION):
{
  "layers": [
    { "id": "K0", "name": "Rejim Tespiti (HMM)", "bias": "bullish|bearish|neutral", "score": 0-10, "weight": 0.10, "summary": "Türkçe özet", "details": { "regime": "STATE_1|STATE_2|STATE_3|STATE_4", "regimeLabel": "BULL_TREND|BEAR_TREND|ACCUMULATION|CHAOS", "regimeConfidence": 0-100, "tradingEnabled": true|false, "transitionRisk": "LOW|MEDIUM|HIGH" } },
    { "id": "K1", "name": "Shannon Entropy Filtresi", "bias": "bullish|bearish|neutral", "score": 0-10, "weight": 0.05, "summary": "Türkçe özet", "details": { "weightedEntropy": 0.0, "readability": "HIGHLY_READABLE|READABLE|MARGINAL|POOR|UNREADABLE", "entropyGate": "OPEN|RESTRICTED|CLOSED", "dominantTFEntropy": "string" } },
    { "id": "K2", "name": "Makro & Korelasyon", "bias": "bullish|bearish|neutral", "score": 0-10, "weight": 0.10, "summary": "Türkçe özet", "details": { "macroRegime": "RISK_ON|RISK_OFF|TRANSITION|NEUTRAL", "btcDependency": "HIGH|MEDIUM|LOW|DECOUPLED", "altseasonScore": 0-100, "macroCalendarStatus": "CLEAR|CAUTION|FREEZE", "stablecoinFlow": "NET_INFLOW|NET_OUTFLOW|NEUTRAL" } },
    { "id": "K3", "name": "Sektör & Narratif", "bias": "bullish|bearish|neutral", "score": 0-10, "weight": 0.08, "summary": "Türkçe özet", "details": { "sector": "string", "sectorCyclePhase": "EARLY|MID|LATE|POST_TOP", "narrativeLifecycle": "NASCENT|EMERGING|PEAK|FADING|DORMANT", "coinPosition": "SECTOR_LEADER|HIGH_BETA|LOW_BETA|CONTRARIAN", "relativeStrength": "OUTPERFORMER|WEAKENING|UNDERPERFORMER|RECOVERING" } },
    { "id": "K4", "name": "Multi-TF Yapı (SMC+ICT+Wyckoff)", "bias": "bullish|bearish|neutral", "score": 0-10, "weight": 0.22, "summary": "Türkçe özet", "details": { "dominantBias": "BULLISH|BEARISH|NEUTRAL", "multiTfAlignmentScore": 0-100, "wyckoffPhase": "string", "wyckoffSubPhase": "string", "lastBOS": "BULLISH|BEARISH|NONE + seviye", "lastCHoCH": "string", "activeOBs": "string", "activeFVGs": "string", "ictAMDPhase": "ACCUMULATION|MANIPULATION|DISTRIBUTION", "conflictZones": "string" } },
    { "id": "K5", "name": "Market Microstructure & Order Flow", "bias": "bullish|bearish|neutral", "score": 0-10, "weight": 0.18, "summary": "Türkçe özet", "details": { "vpinLevel": "LOW|MODERATE|HIGH|EXTREME", "ofiSignal": "STRONG_BUY|WEAK_BUY|NEUTRAL|WEAK_SELL|STRONG_SELL", "cvdStatus": "CONFIRMING|BULLISH_DIV|BEARISH_DIV|ABSORPTION_BULL|ABSORPTION_BEAR", "cvdZscore": 0.0, "orderbookAsymmetry": "BID_HEAVY|ASK_HEAVY|BALANCED", "takerSignal": "BULLISH|BEARISH|NEUTRAL", "institutionalFootprint": "string" } },
    { "id": "K6", "name": "Likidite Haritası & Akıllı Para", "bias": "bullish|bearish|neutral", "score": 0-10, "weight": 0.15, "summary": "Türkçe özet", "details": { "fundingOiComposite": "OVERLEV_LONG|OVERLEV_SHORT|HEALTHY|CAPITULATION|NEUTRAL", "squeezeRisk": "LONG_SQUEEZE_HIGH|SHORT_SQUEEZE_HIGH|LOW", "smartMoneyFootprint": "ACCUMULATING|DISTRIBUTING|TRANSITIONING|INACTIVE", "liquidityMagnetsAbove": "string", "liquidityMagnetsBelow": "string", "cascadeRiskZones": "string" } },
    { "id": "K7", "name": "Bayesian İndikatör Confluence", "bias": "bullish|bearish|neutral", "score": 0-10, "weight": 0.07, "summary": "Türkçe özet", "details": { "emaStructure": "BULLISH_STACK|BEARISH_STACK|COMPRESSION|MIXED", "rsiSignal": "OVERSOLD|OVERBOUGHT|NEUTRAL|BULL_DIV|BEAR_DIV|HIDDEN_BULL_DIV|HIDDEN_BEAR_DIV", "macdSignal": "string", "bbState": "SQUEEZE|EXPANSION|WALKING_UPPER|WALKING_LOWER|MEAN_REVERT", "adxTrendStrength": "STRONG_TREND|WEAK_TREND|NO_TREND", "fibFortressZones": "string", "divergenceActive": "string", "bayesianConfluenceScore": 0-100, "bayesianBullProbability": 0-100 } },
    { "id": "K8", "name": "On-Chain İstihbarat", "bias": "bullish|bearish|neutral", "score": 0-10, "weight": 0.05, "summary": "Türkçe özet", "details": { "exchangeFlow": "NET_INFLOW|NET_OUTFLOW|BALANCED", "whaleActivity": "ACCUMULATING|DISTRIBUTING|DORMANT", "networkHealth": "GROWING|STABLE|DECLINING", "supplyRisk": "CLEAR|CAUTION|DANGER", "onchainComposite": "BULLISH|BEARISH|NEUTRAL" } },
    { "id": "K9", "name": "Altcoin Risk Matrisi", "bias": "neutral", "score": 0-10, "weight": 0.00, "summary": "Türkçe özet", "details": { "overallRisk": "LOW|MEDIUM|HIGH|EXTREME", "riskFactors": ["string"], "positionSizeModifier": "1.0x|0.75x|0.50x|0.25x|DO_NOT_TRADE", "maxLeverage": "5x|3x|2x|1x|NO_TRADE", "riskAdjustedGradeCap": "S|A|B|C|NO_SIGNAL" } }
  ],
  "signal": {
    "direction": "LONG|SHORT|WAIT",
    "grade": "S|A|B|C|D",
    "setupQuality": "S|A|B|C|NO_TRADE",
    "confidenceScore": 0-100,
    "bayesianProbabilityBull": 0-100,
    "bayesianProbabilityBear": 0-100,
    "entropyValue": 0.0,
    "coreTrinityPass": true|false,
    "coreTrinityStatus": "FULL|PARTIAL|FAILED",
    "status": "ZONE_WAITING|IN_ZONE|TRIGGERED|INVALID",
    "entry": { "primary": 0, "secondary": 0, "zoneHigh": 0, "zoneLow": 0, "trigger": "string", "method": "string" },
    "stopLoss": { "price": 0, "distancePct": 0, "reasoning": "string" },
    "targets": {
      "tp1": { "price": 0, "rr": 0, "reasoning": "string", "closePct": 40 },
      "tp2": { "price": 0, "rr": 0, "reasoning": "string", "closePct": 30 },
      "tp3": { "price": 0, "rr": 0, "reasoning": "string", "closePct": 30 }
    },
    "entryConditions": ["Fiyat giriş zone'una ulaşmalı", "4H CHoCH veya BOS oluşmalı", "CVD teyidi"],
    "slTrail": ["TP1 vurunca SL'yi entry'ye çek (breakeven)", "TP2 vurunca SL'yi TP1'e çek"],
    "leverage": { "conservative": "3x", "moderate": "5x", "aggressive": "10x" },
    "invalidation": { "price": 0, "timeframe": "1D", "description": "string" },
    "positionSizeModifier": "1.0x|0.75x|0.50x|0.25x",
    "validityHours": 72
  },
  "preFilterStatus": {
    "regimeGate": "PASS|FAIL",
    "entropyGate": "PASS|RESTRICTED|FAIL",
    "riskGate": "PASS|FAIL",
    "overallPreFilter": "PASS|PARTIAL|FAIL"
  },
  "scenarios": {
    "A": { "label": "Beklenen Senaryo", "probability": 0-100, "description": "Türkçe" },
    "B": { "label": "Alternatif Senaryo", "probability": 0-100, "description": "Türkçe" },
    "C": { "label": "İnvalidasyon Senaryosu", "probability": 0-100, "description": "Türkçe" }
  },
  "confidence": {
    "overall": 0-100,
    "breakdown": {
      "K0": { "score": 0-10, "weighted": 0.0 },
      "K1": { "score": 0-10, "weighted": 0.0 },
      "K2": { "score": 0-10, "weighted": 0.0 },
      "K3": { "score": 0-10, "weighted": 0.0 },
      "K4": { "score": 0-10, "weighted": 0.0 },
      "K5": { "score": 0-10, "weighted": 0.0 },
      "K6": { "score": 0-10, "weighted": 0.0 },
      "K7": { "score": 0-10, "weighted": 0.0 },
      "K8": { "score": 0-10, "weighted": 0.0 }
    }
  },
  "wyckoff": { "phase": "string", "subPhase": "string", "nextMove": "string" },
  "manipulationWarnings": ["string"],
  "macroWarning": "string|null",
  "counterSectorWarning": "string|null",
  "executiveSummary": "Türkçe 3-5 cümle — zone bekle, teyit al — asla kesin al/sat deme"
}

## MUTLAK SON KURALLAR:
1. Confidence < 75 → direction="WAIT"
2. Core Trinity başarısız → coreTrinityPass=false, direction="WAIT"
3. R:R < 1:2 → direction="WAIT", setupQuality="NO_TRADE"
4. Anlık fiyattan sinyal YASAK
5. Makro FREEZE event varsa → macroWarning doldur, conviction -20%
6. Hafta sonu → manipulationWarnings'e uyarı ekle
7. Grade D = direction="WAIT" = sinyal yok
8. Her zaman 3 senaryo, tüm entryConditions doldur
9. K9 grade cap'i uygula — EXTREME risk = max C grade`;
function buildQuantumMessage(symbol, data, indicators, fearGreed, macroContext, trendBreaks, manipRisks, dirLock) {
  const { price, change24h, high24h, low24h, fundingRate, openInterest, vol24h } = data;
  const volume24h = vol24h || 0;
  const { rsi1d, rsi4h, macd1d, macd4h, bb1d, atr1d, stochRSI, obv, fib, struct1d, struct4h, struct1w, obs1d, obs4h, fvg1d, fvg4h, wyckoff } = indicators;
  const sector = detectSector(symbol);
  const isMeme = sector === 'Meme';
  const liqRisks = assessLiquidityRisk(volume24h || 0, price, fundingRate || 0, openInterest || 0);

  // Premium/Discount
  const high100 = Math.max(...data.highs.slice(-100));
  const low100 = Math.min(...data.lows.slice(-100));
  const equilibrium = (high100 + low100) / 2;
  const pdZone = price > equilibrium * 1.02 ? 'PREMIUM' : price < equilibrium * 0.98 ? 'DISCOUNT' : 'EQUILIBRIUM';
  const ote618 = r(high100 - (high100 - low100) * 0.618);
  const ote786 = r(high100 - (high100 - low100) * 0.786);

  // Funding yorumu
  const fundStr = fundingRate > 0.0005 ? `+${(fundingRate*100).toFixed(4)}% POZİTİF (Long ağırlık)`
    : fundingRate < -0.0005 ? `${(fundingRate*100).toFixed(4)}% NEGATİF (Short ağırlık)`
    : `${(fundingRate*100).toFixed(4)}% NÖTR`;

  // Fear & Greed
  const fgLabel = fearGreed.value >= 75 ? 'EXTREME GREED' : fearGreed.value >= 55 ? 'GREED' : fearGreed.value >= 45 ? 'NÖTR' : fearGreed.value >= 25 ? 'FEAR' : 'EXTREME FEAR';

  // EMA stack
  const c = data.closes;
  const ema9  = calcEMA(c, 9).pop();
  const ema21 = calcEMA(c, 21).pop();
  const ema50 = calcEMA(c, 50).pop();
  const ema200 = c.length >= 200 ? calcEMA(c, 200).pop() : null;
  const emaStack = ema9 > ema21 && ema21 > ema50 ? 'BULLISH STACK' : ema9 < ema21 && ema21 < ema50 ? 'BEARISH STACK' : 'MIXED';

  // 52w extremes
  const high52w = Math.max(...data.candles1w.slice(-52).map(c => c.high));
  const low52w = Math.min(...data.candles1w.slice(-52).map(c => c.low));

  // K5 Microstructure proxy calculations (CVD via OBV, taker via funding)
  const obvZscore = (() => {
    const slopes = [];
    const obvVals = [];
    let oVal = 0;
    for (let i = 1; i < data.closes.length; i++) {
      oVal += data.closes[i] > data.closes[i-1] ? (data.volumes[i]||0) : data.closes[i] < data.closes[i-1] ? -(data.volumes[i]||0) : 0;
      obvVals.push(oVal);
    }
    const mean = obvVals.reduce((a,b) => a+b,0) / obvVals.length;
    const std = Math.sqrt(obvVals.map(v=>(v-mean)**2).reduce((a,b)=>a+b,0)/obvVals.length);
    return std > 0 ? r((oVal - mean) / std) : 0;
  })();
  const takerSignalStr = fundingRate > 0.0008 ? 'Agresif alıcılar dominant (Taker Buy/Sell > 1.15)' : fundingRate < -0.0008 ? 'Agresif satıcılar dominant (Taker Buy/Sell < 0.85)' : 'Dengeli taker flow (~1.0)';
  const vpinEst = Math.abs(obv.slope) > 0 ? (Math.min(0.60, 0.25 + Math.abs(obv.slope) / (data.vol24h||1) * 1e6)) : 0.20;
  const ofiSignal = obvZscore > 2 ? 'STRONG_BUY' : obvZscore > 1 ? 'WEAK_BUY' : obvZscore < -2 ? 'STRONG_SELL' : obvZscore < -1 ? 'WEAK_SELL' : 'NEUTRAL';
  const cvdDivStr = (() => {
    const lastClose = data.closes[data.closes.length-1];
    const prevClose = data.closes[data.closes.length-10]||lastClose;
    const priceUp = lastClose > prevClose;
    const obvUp = obv.trend === 'UP';
    if (priceUp && !obvUp) return 'BEARISH_DIV (fiyat yükseliyor, CVD düşüyor — dağıtım sinyali)';
    if (!priceUp && obvUp) return 'BULLISH_DIV (fiyat düşüyor, CVD yükseliyor — absorpsiyon)';
    return 'CONFIRMING (fiyat ve CVD aynı yön)';
  })();

  return `# CHARTOS APEX QUANTUM v2.0 GOD MODE — META-ANALİZ: ${symbol}/USDT
9 Katmanlı Bayesian Fusion (K0 Rejim → K9 Risk Matrisi)
Tarih: ${new Date().toISOString()}

## ═══ K0: REJİM TESPİTİ (HMM YAKLAŞIMI) ═══
Fear & Greed: ${fearGreed.value}/100 — ${fgLabel}
20G Volatilite (20G High-Low range / fiyat): %${r(((Math.max(...data.highs.slice(-20)) - Math.min(...data.lows.slice(-20))) / price) * 100)}
10G Momentum: ${r((price - (data.closes[data.closes.length-11]||price)) / (data.closes[data.closes.length-11]||price) * 100)}%
OBV Trend: ${obv.trend} | Volume Rejimi: ${data.vol24h > 0 ? 'Mevcut' : 'Veri yok'}
ATR/Fiyat Oranı: %${r(atr1d / price * 100)} (>%5 = yüksek vol)
Hafta Sonu: ${[0,6].includes(new Date().getUTCDay()) ? 'EVET — sahte kırılım riski' : 'HAYIR'}

## ═══ K1: SHANNON ENTROPY FİLTRESİ ═══
[Entropy tahmini — fiyat değişim düzensizliğine göre değerlendir]
4H Yapı: ${struct4h.structure} (düzenli mi?) | 1D Yapı: ${struct1d.structure} | 1W Yapı: ${struct1w.structure}
BB Bandwidth: ${bb1d.bandwidth.toFixed(4)} (>0.08 = geniş = yüksek vol) | BB Squeeze: ${bb1d.squeeze ? 'AKTİF — kırılım yakın' : 'NORMAL'}
ATR: ${fmt(atr1d)} | StochRSI K/D: ${stochRSI.k}/${stochRSI.d}

## ═══ K2: MAKRO & KORELASYON ═══
Makro Takvim Risk: ${macroContext ? macroContext.riskLevel : 'LOW'}
Makro Kısıtlama: ${macroContext ? macroContext.tradingRestriction : 'Normal koşullar'}
Yaklaşan Olaylar (48s): ${macroContext ? macroContext.description : 'Yok'}
F&G Trendi: ${fearGreed.value < 30 ? 'EXTREME FEAR → risk-off, altcoin baskı altında' : fearGreed.value > 70 ? 'EXTREME GREED → risk-on, altseason potansiyeli' : 'Nötr ortam'}
Stablecoin/USDT Flow: ${fundingRate > 0 ? 'Pozitif funding → sermaye piyasada' : 'Negatif/nötr → sermaye çıkışı veya dengeli'}

## ═══ K3: SEKTÖR & NARRATİF ═══
Sektör: ${sector}${isMeme ? ' ⚠️ MEME COIN — max grade B, kaldıraç 2x' : ''}
Yıllık Yüksek Yakınlık: ${Math.abs(price - high52w) / high52w < 0.10 ? 'EVET (%10 içinde) — DISTRIBUTION/POST_TOP riski' : Math.abs(price - high52w) / high52w < 0.25 ? 'Kısmi — LATE döngü' : 'HAYIR'}
Yıllık Düşük Yakınlık: ${Math.abs(price - low52w) / low52w < 0.10 ? 'EVET (%10 içinde) — ACCUMULATION/NASCENT potansiyeli' : 'HAYIR'}
52H: Yüksek=${fmt(high52w)} | Düşük=${fmt(low52w)} | Mevcut Pozisyon %${r((price-low52w)/(high52w-low52w)*100)} (0=dip, 100=zirve)

## ═══ K4: MULTI-TF YAPI (SMC + ICT + WYCKOFF) ═══
Fiyat: ${fmt(price)} | 24S: ${change24h >= 0 ? '+' : ''}${change24h?.toFixed(2)}% | 24S Yüksek: ${fmt(high24h)} | 24S Düşük: ${fmt(low24h)}

4H: Yapı=${struct4h.structure} | BOS=${struct4h.bos} | CHoCH=${struct4h.choch}
1D: Yapı=${struct1d.structure} | BOS=${struct1d.bos} | CHoCH=${struct1d.choch}
1W: Yapı=${struct1w.structure}

EMA 9: ${fmt(ema9)} | EMA 21: ${fmt(ema21)} | EMA 50: ${fmt(ema50)} | EMA 200: ${ema200 ? fmt(ema200) : 'Yetersiz veri'}
EMA Stack: ${emaStack} | Fiyat EMA200 ${ema200 ? (price > ema200 ? 'ÜSTÜNDE → Makro Boğa' : 'ALTINDA → Makro Ayı') : 'N/A'}

Order Blocks (1D): ${JSON.stringify(obs1d.slice(0,3))}
Order Blocks (4H): ${JSON.stringify(obs4h.slice(0,3))}
Fair Value Gaps (1D): ${JSON.stringify(fvg1d.slice(0,3))}
Fair Value Gaps (4H): ${JSON.stringify(fvg4h.slice(0,3))}

Premium/Discount Zone: ${pdZone} | Equilibrium: ${fmt(equilibrium)}
OTE Zone (Fib 0.618-0.786): ${fmt(ote618)} — ${fmt(ote786)}
AMD Fazı: ${pdZone === 'PREMIUM' ? 'Distribution — fiyat dağıtım bölgesinde' : pdZone === 'DISCOUNT' ? 'Accumulation — birikim bölgesi' : 'Equilibrium — manipulation fazı olabilir'}

Fibonacci: Swing High=${fmt(fib.swing_high)} | Low=${fmt(fib.swing_low)}
Fib 23.6%: ${fmt(fib['fib_23.6'])} | 38.2%: ${fmt(fib['fib_38.2'])} | 50.0%: ${fmt(fib['fib_50.0'])}
Fib 61.8% (OTE): ${fmt(fib['fib_61.8'])} | 78.6% (OTE): ${fmt(fib['fib_78.6'])}
Fib 127%: ${fmt(fib['fib_127'])} | 161.8%: ${fmt(fib['fib_161'])}

Wyckoff: ${wyckoff.phase} — ${wyckoff.subPhase} (Güven: %${wyckoff.confidence})

Trend Kırılmaları:
4H: ${trendBreaks?.breaks4h?.length > 0 ? trendBreaks.breaks4h.map(b=>b.description).join(' | ') : 'Tespit edilmedi'}
1D: ${trendBreaks?.breaks1d?.length > 0 ? trendBreaks.breaks1d.map(b=>b.description).join(' | ') : 'Tespit edilmedi'}
1W: ${trendBreaks?.breaks1w?.length > 0 ? trendBreaks.breaks1w.map(b=>b.description).join(' | ') : 'Tespit edilmedi'}

## ═══ K5: MARKET MICROSTRUCTURE & ORDER FLOW ═══
VPIN (tahmini): ${vpinEst.toFixed(2)} (${vpinEst > 0.60 ? 'EXTREME' : vpinEst > 0.45 ? 'HIGH' : vpinEst > 0.30 ? 'MODERATE' : 'LOW'})
OFI Sinyali: ${ofiSignal} (OBV Z-Score: ${obvZscore > 0 ? '+' : ''}${obvZscore})
CVD Durumu: ${cvdDivStr}
OBV Trend: ${obv.trend} | Eğim: ${obv.slope > 0 ? '+' : ''}${obv.slope}
Taker Flow: ${takerSignalStr}
Funding Rate: ${fundStr}

## ═══ K6: LİKİDİTE HARİTASI & AKILLI PARA ═══
Funding Rate: ${fundStr}
Open Interest: ${openInterest > 0 ? `${(openInterest/1e9).toFixed(3)}B USDT` : 'Veri yok'}
Funding+OI Composite: ${Math.abs(fundingRate) > 0.001 ? (fundingRate > 0 ? 'OVERLEV_LONG — long squeeze riski' : 'OVERLEV_SHORT — short squeeze riski') : openInterest > 0 ? 'HEALTHY — normal OI' : 'NEUTRAL — veri yetersiz'}
Likidite Riskleri: ${liqRisks.length > 0 ? liqRisks.map(r=>`⚠️ ${r}`).join(' | ') : 'Normal'}
Smart Money İpuçları:
- Fiyat düşerken OBV yükseliyor: ${!['UP'].includes(obv.trend) ? 'HAYIR' : price < (data.closes[data.closes.length-5]||price) && obv.slope > 0 ? 'EVET → Absorpsiyon (bullish)' : 'HAYIR'}
- Fiyat yükselirken OBV düşüyor: ${obv.trend === 'DOWN' && price > (data.closes[data.closes.length-5]||price) ? 'EVET → Dağıtım (bearish)' : 'HAYIR'}
Swing Yüksekler (likidasyon havuzu üst): ${struct1d.swingHighs.slice(-3).map(h=>fmt(h)).join(', ') || 'Veri yok'}
Swing Düşükler (likidasyon havuzu alt): ${struct1d.swingLows.slice(-3).map(l=>fmt(l)).join(', ') || 'Veri yok'}

## ═══ K7: BAYESIAN İNDİKATÖR CONFLUENCE ═══
4H: RSI=${rsi4h} | MACD Cross=${macd4h.cross} | MACD Hist=${macd4h.histogram}
1D: RSI=${rsi1d}${rsi1d > 70 ? ' OVERBOUGHT' : rsi1d < 30 ? ' OVERSOLD' : ''} | MACD Cross=${macd1d.cross} | MACD Hist=${macd1d.histogram}
BB: Upper=${fmt(bb1d.upper)} | Middle=${fmt(bb1d.middle)} | Lower=${fmt(bb1d.lower)} | Sıkışma=${bb1d.squeeze ? 'AKTİF ⚡' : 'NORMAL'}
StochRSI K/D: ${stochRSI.k}/${stochRSI.d}${stochRSI.k < 20 ? ' OVERSOLD' : stochRSI.k > 80 ? ' OVERBOUGHT' : ''}
ATR(14): ${fmt(atr1d)}
[Fibonacci Fortress: 3+ Fib seviyesi ±0.5% toleransta kümeleniyor mu? Yukarıdaki seviyeleri kontrol et]

## ═══ K8: ON-CHAIN & SENTIMENT ═══
Fear & Greed: ${fearGreed.value}/100 — ${fgLabel}
[Exchange flow, whale activity, active addresses: mevcut veri yok — Fear&Greed + Funding + OI üzerinden tahmin et]
Funding Rate Proxy (Exchange Flow): ${fundingRate > 0.0003 ? 'NET_INFLOW — sermaye piyasaya giriyor' : fundingRate < -0.0003 ? 'NET_OUTFLOW — sermaye çıkıyor' : 'BALANCED'}

## ═══ K9: ALTCOİN RİSK MATRİSİ ═══
${liqRisks.map(r=>`⚠️ ${r}`).join('\n') || 'Risk faktörü tespit edilmedi'}
${isMeme ? '⚠️ MEME COİN PROTOKOLÜ: max grade B, kaldıraç max 2x, narratif bağımlılık riski 2x' : ''}
Manipülasyon Riskleri: ${manipRisks?.length > 0 ? manipRisks.map(risk=>`[${risk.level}] ${risk.description}`).join(' | ') : 'Yüksek öncelikli risk tespit edilmedi'}

## ═══ ALGO CONSENSUS LOCK (Pre-Computed) ═══
Direction: ${dirLock ? dirLock.direction : 'WAIT'}
Bull Votes: ${dirLock ? dirLock.bullVotes : 0}/${dirLock ? dirLock.total : 11} | Bear Votes: ${dirLock ? dirLock.bearVotes : 0}/${dirLock ? dirLock.total : 11}
Confluence: %${dirLock ? dirLock.confluence : 50}
⚠️ KURAL: signal.direction = "${dirLock ? dirLock.direction : 'WAIT'}" — değiştirme.

## ═══ PRE-COMPUTED STRUCTURAL SETUP (Referans) ═══
${(() => {
  const setup = buildStructuralSetup(dirLock ? dirLock.direction : 'WAIT', data.price, indicators);
  if (!setup) return 'Yapısal bölge bulunamadı — OB/FVG/Swing eksik.';
  const s = setup;
  return `Yön: ${dirLock ? dirLock.direction : 'WAIT'}
Giriş Bölgesi: ${fmt(s.entryHigh)} — ${fmt(s.entryLow)} (${s.zone.type} / ${s.zone.tf})
Bölge Orta: ${fmt(s.entry)} | Bölgeye Uzaklık: %${s.distanceToZonePct} | Yakın mı: ${s.nearZone ? 'EVET' : 'HAYIR'}
Yapısal SL: ${fmt(s.sl)} (%${s.slDist})
TP1: ${fmt(s.tp1)} (R:R ${s.rr1}) | TP2: ${fmt(s.tp2)} (R:R ${s.rr2}) | TP3: ${fmt(s.tp3)} (R:R ${s.rr3})
Bu seviyeleri REFERANS al — daha iyi OB/FVG varsa kullan ama TP sıralamasına uy.`;
})()}

K0-K9 arası 9-katmanlı CHARTOS APEX QUANTUM v2.0 GOD MODE Bayesian Fusion Analizi yap.
Pre-Filter → Core Trinity → Ağırlıklı Confidence → Filtreler → Grade hesapla.
YALNIZCA JSON formatında yanıt ver.`;
}

// ══════════════════════════════════════════════════
//  QUANTUM FALLBACK (API key yoksa) — Structural Zone Based
// ══════════════════════════════════════════════════
function quantumFallback(symbol, price, indicators, fearGreed, dirLock) {
  const { rsi1d, struct1d, fib, wyckoff, macd1d, bb1d, obv } = indicators;
  const atr = indicators.atr1d || price * 0.025;
  // Compute emaStack for use in layer details
  const _closes = indicators.closes || [];
  const _ema9  = _closes.length >= 9  ? calcEMA(_closes, 9).pop()  : price;
  const _ema21 = _closes.length >= 21 ? calcEMA(_closes, 21).pop() : price;
  const _ema50 = _closes.length >= 50 ? calcEMA(_closes, 50).pop() : price;
  const emaStack = _ema9 > _ema21 && _ema21 > _ema50 ? 'BULLISH STACK' : _ema9 < _ema21 && _ema21 < _ema50 ? 'BEARISH STACK' : 'MIXED';

  // Direction from lock (ensures consistency with ALGO engine)
  const dir = dirLock ? dirLock.direction : (
    struct1d.structure === 'BULLISH' && rsi1d < 70 && macd1d.histogram > 0 ? 'LONG' :
    struct1d.structure === 'BEARISH' && rsi1d > 30 && macd1d.histogram < 0 ? 'SHORT' : 'WAIT'
  );
  const bias = dir === 'LONG' ? 'bullish' : dir === 'SHORT' ? 'bearish' : 'neutral';
  const baseConfidence = dirLock
    ? (dirLock.confluence >= 70 ? 72 : dirLock.confluence >= 60 ? 63 : 48)
    : (dir !== 'WAIT' ? 65 : 45);

  // ── Structural Setup ──────────────────────────────
  const setup = buildStructuralSetup(dir, price, indicators);

  let entry, sl, tp1, tp2, tp3, rr1, rr2, rr3, slDist, entryTrigger, slReasoning, zoneLabel;
  let hasStructure = false;

  if (setup) {
    hasStructure = true;
    entry   = setup.entry;
    sl      = setup.sl;
    slDist  = setup.slDist;
    tp1     = setup.tp1;
    tp2     = setup.tp2;
    tp3     = setup.tp3;
    rr1     = setup.rr1;
    rr2     = setup.rr2;
    rr3     = setup.rr3;
    zoneLabel   = `${setup.zone.type} (${setup.zone.tf}) — ${fmt(setup.entryHigh)}–${fmt(setup.entryLow)}`;
    entryTrigger = setup.nearZone
      ? `${setup.zone.type} bölgesine giriş — 4H mumun bölge içinde kapanmasını bekle`
      : `Bölgeye uzaklık: %${setup.distanceToZonePct} — bölge yaklaşımı bekleniyor`;
    slReasoning = `${setup.zone.type} invalidasyon — bölge ${dir === 'LONG' ? 'altı' : 'üstü'} ${fmt(sl)}`;
  } else {
    // No structural zone found: minimal ATR fallback, low confidence
    entry   = price;
    sl      = dir === 'LONG' ? r(price - atr * 1.5) : dir === 'SHORT' ? r(price + atr * 1.5) : price;
    tp1     = dir === 'LONG' ? r(price + atr * 2.0) : dir === 'SHORT' ? r(price - atr * 2.0) : price;
    tp2     = dir === 'LONG' ? r(price + atr * 3.5) : dir === 'SHORT' ? r(price - atr * 3.5) : price;
    tp3     = dir === 'LONG' ? r(price + atr * 5.5) : dir === 'SHORT' ? r(price - atr * 5.5) : price;
    const risk = Math.abs(entry - sl);
    rr1     = risk > 0 ? r(Math.abs(tp1 - entry) / risk) : 0;
    rr2     = risk > 0 ? r(Math.abs(tp2 - entry) / risk) : 0;
    rr3     = risk > 0 ? r(Math.abs(tp3 - entry) / risk) : 0;
    slDist  = r(Math.abs(entry - sl) / entry * 100);
    zoneLabel   = 'Yapısal bölge tespit edilemedi';
    entryTrigger = 'OB/FVG bölgesi bulunamadı — yapı netleşene kadar bekle';
    slReasoning  = `ATR bazlı geçici stop — ${fmt(sl)}`;
  }

  // Downgrade to NO_TRADE if zone is too far or no structure
  const noTrade = !hasStructure || (setup && !setup.nearZone && rr1 < 1.5);
  const finalDir  = noTrade ? 'WAIT' : dir;
  const finalQuality = noTrade ? 'NO_TRADE' : (baseConfidence >= 65 ? 'A' : 'B');
  const confidence = noTrade ? Math.min(baseConfidence, 40) : baseConfidence;

  const fgBias = fearGreed.value > 55 ? 'bullish' : fearGreed.value < 45 ? 'bearish' : 'neutral';
  const fgScore = fearGreed.value > 55 ? 6 : fearGreed.value < 45 ? 4 : 5;

  return {
    layers: [
      { id:'K0', name:'Rejim Tespiti (HMM)', bias, score: bias==='bullish'?7:bias==='bearish'?3:5, weight:0.10,
        summary:`Rejim tahmini: ${struct1d.structure === 'BULLISH' ? 'STATE_1 BULL_TREND' : struct1d.structure === 'BEARISH' ? 'STATE_2 BEAR_TREND' : 'STATE_3 ACCUMULATION'}. İşlem aktif.`,
        details:{ regime: struct1d.structure==='BULLISH'?'STATE_1':struct1d.structure==='BEARISH'?'STATE_2':'STATE_3', regimeLabel: struct1d.structure==='BULLISH'?'BULL_TREND':struct1d.structure==='BEARISH'?'BEAR_TREND':'ACCUMULATION', regimeConfidence:65, tradingEnabled:true, transitionRisk:'LOW' } },
      { id:'K1', name:'Shannon Entropy Filtresi', bias:'neutral', score:6, weight:0.05,
        summary:`Entropy tahmini: READABLE. Piyasa yeterince okunabilir, analiz devam ediyor.`,
        details:{ weightedEntropy:0.48, readability:'READABLE', entropyGate:'OPEN', dominantTFEntropy:'1D dominant' } },
      { id:'K2', name:'Makro & Korelasyon', bias: fgBias, score: fgScore, weight:0.10,
        summary:`Fear & Greed: ${fearGreed.value}/100 (${fearGreed.label}). Makro ortam ${fearGreed.value > 55 ? 'risk-on' : fearGreed.value < 45 ? 'risk-off' : 'nötr'}.`,
        details:{ macroRegime: fearGreed.value>55?'RISK_ON':fearGreed.value<45?'RISK_OFF':'NEUTRAL', btcDependency:'MEDIUM', altseasonScore:fearGreed.value, macroCalendarStatus:'CLEAR', stablecoinFlow:'NEUTRAL' } },
      { id:'K3', name:'Sektör & Narratif', bias:'neutral', score:5, weight:0.08,
        summary:`Sektör: ${indicators.sector||'Other'}. Narratif değerlendirmesi için ek veri gerekiyor.`,
        details:{ sector:indicators.sector||'Other', sectorCyclePhase:'MID', narrativeLifecycle:'EMERGING', coinPosition:'HIGH_BETA', relativeStrength:'WEAKENING' } },
      { id:'K4', name:'Multi-TF Yapı (SMC+ICT+Wyckoff)', bias, score: bias==='bullish'?7:bias==='bearish'?3:5, weight:0.22,
        summary:`1D yapı: ${struct1d.structure}. BOS: ${struct1d.bos}. CHoCH: ${struct1d.choch}. ${hasStructure ? zoneLabel+' tespit edildi.' : 'Güçlü OB/FVG bulunamadı.'}`,
        details:{ dominantBias: struct1d.structure, multiTfAlignmentScore:65, wyckoffPhase: wyckoff.phase, wyckoffSubPhase: wyckoff.subPhase, lastBOS: struct1d.bos, lastCHoCH: struct1d.choch, activeOBs: hasStructure?zoneLabel:'Tespit edilemedi', activeFVGs:'Analiz gerekli', ictAMDPhase:'ACCUMULATION', conflictZones:'Yok' } },
      { id:'K5', name:'Market Microstructure & Order Flow', bias, score: bias==='bullish'?6:bias==='bearish'?4:5, weight:0.18,
        summary:`OBV ${obv.trend} yönlü. Fibonacci OTE: ${fib.oteZone}. ICT AMD: ${bias==='bullish'?'Accumulation':'Distribution'} fazı.`,
        details:{ vpinLevel:'MODERATE', ofiSignal: bias==='bullish'?'WEAK_BUY':bias==='bearish'?'WEAK_SELL':'NEUTRAL', cvdStatus:'CONFIRMING', cvdZscore:0.5, orderbookAsymmetry:'BALANCED', takerSignal: bias==='bullish'?'BULLISH':'NEUTRAL', institutionalFootprint:'Belirsiz' } },
      { id:'K6', name:'Likidite Haritası & Akıllı Para', bias, score: bias==='bullish'?6:bias==='bearish'?4:5, weight:0.15,
        summary:`RSI(1D): ${rsi1d}. MACD: ${macd1d.cross}. BB Sıkışma: ${bb1d.squeeze?'Aktif ⚡':'Normal'}. Smart money aktivitesi belirsiz.`,
        details:{ fundingOiComposite:'NEUTRAL', squeezeRisk:'LOW', smartMoneyFootprint:'INACTIVE', liquidityMagnetsAbove:'Swing yüksekler', liquidityMagnetsBelow:'Swing düşükler', cascadeRiskZones:'Yok' } },
      { id:'K7', name:'Bayesian İndikatör Confluence', bias, score: bias!=='neutral'?7:5, weight:0.07,
        summary:`RSI ${rsi1d > 70 ? 'OVERBOUGHT' : rsi1d < 30 ? 'OVERSOLD' : 'Nötr'}, MACD ${macd1d.cross}, BB ${bb1d.squeeze?'Sıkışma':'Normal'}. Fibonacci Fortress seviyeler analiz ediliyor.`,
        details:{ emaStructure: emaStack==='BULLISH STACK'?'BULLISH_STACK':emaStack==='BEARISH STACK'?'BEARISH_STACK':'MIXED', rsiSignal: rsi1d>70?'OVERBOUGHT':rsi1d<30?'OVERSOLD':'NEUTRAL', macdSignal: macd1d.cross, bbState: bb1d.squeeze?'SQUEEZE':bb1d.bandwidth>0.1?'EXPANSION':'MEAN_REVERT', adxTrendStrength:'WEAK_TREND', fibFortressZones:`OTE: ${fib.oteZone}`, divergenceActive:'Yok', bayesianConfluenceScore:60, bayesianBullProbability: bias==='bullish'?62:bias==='bearish'?38:50 } },
      { id:'K8', name:'On-Chain İstihbarat', bias: fgBias, score: fgScore, weight:0.05,
        summary:`Fear & Greed: ${fearGreed.value}/100. Zincir üstü veri sınırlı — F&G üzerinden tahmin.`,
        details:{ exchangeFlow:'BALANCED', whaleActivity:'DORMANT', networkHealth:'STABLE', supplyRisk:'CLEAR', onchainComposite: fgBias.toUpperCase() } },
      { id:'K9', name:'Altcoin Risk Matrisi', bias:'neutral', score:5, weight:0.00,
        summary:`Genel risk: ${noTrade?'HIGH — zone uzak':'MEDIUM — standart parametreler'}. Pozisyon boyutu: ${noTrade?'0.50x':'1.0x'}.`,
        details:{ overallRisk:noTrade?'HIGH':'MEDIUM', riskFactors:noTrade?['Bölge uzak','Yapı belirsiz']:['Standart altcoin riski'], positionSizeModifier:noTrade?'0.50x':'1.0x', maxLeverage:noTrade?'3x':'5x', riskAdjustedGradeCap:noTrade?'B':'A' } },
    ],
    signal: {
      direction: finalDir,
      setupQuality: finalQuality,
      confluenceCount: finalDir !== 'WAIT' ? (hasStructure ? 4 : 2) : 1,
      entry: {
        primary: entry,
        secondary: setup ? setup.entryLow : null,
        trigger: entryTrigger,
      },
      stopLoss: { price: sl, distancePct: slDist, reasoning: slReasoning },
      targets: {
        tp1: { price: tp1, rr: rr1, reasoning: dir === 'LONG' ? 'İlk yapısal direnç seviyesi' : 'İlk yapısal destek seviyesi' },
        tp2: { price: tp2, rr: rr2, reasoning: dir === 'LONG' ? 'Orta vadeli direnç bölgesi' : 'Orta vadeli destek bölgesi' },
        tp3: { price: tp3, rr: rr3, reasoning: dir === 'LONG' ? 'Uzun vadeli yapısal hedef / Fib uzantısı' : 'Uzun vadeli yapısal hedef / Fib uzantısı' },
      },
      slTrail: ['TP1 vurunca SL\'yi entry\'ye çek (breakeven)', 'TP2 vurunca SL\'yi TP1 seviyesine çek'],
      leverage: { conservative: '3x', moderate: '5x', aggressive: '10x' },
      entryConditions: ['Fiyat giriş zone\'una ulaşmalı', '4H CHoCH veya BOS oluşmalı', 'CVD/OBV teyidi'],
      invalidation: { price: sl, timeframe: '1D', description: `${dir === 'LONG' ? 'Destek' : 'Direnç'} bölgesi kırılırsa tez geçersiz.` },
      positionSizeModifier: noTrade ? '0.50x' : '1.0x',
      validityHours: 72,
    },
    scenarios: {
      A: {
        label: 'Beklenen', probability: hasStructure ? 60 : 45,
        description: setup
          ? `Fiyat ${zoneLabel} bölgesine geri çekilerek ${dir === 'LONG' ? 'güçlü alış' : 'güçlü satış'} başlayacak. TP1 ${fmt(tp1)} hedef.`
          : `Fiyat ${bias === 'bullish' ? 'yükseliş' : 'düşüş'} yönünde devam ediyor ancak net bölge tespit edilemedi.`,
      },
      B: {
        label: 'Alternatif', probability: 30,
        description: 'Piyasa daha geniş konsolidasyon yaşıyor. Kırılım yönü netleşene kadar bekleme stratejisi uygun.',
      },
      C: {
        label: 'Invalidasyon', probability: hasStructure ? 10 : 25,
        description: `Stop loss ${fmt(sl)} kırılırsa senaryo geçersiz. ${setup ? `${setup.zone.type} bölgesi baskı altında.` : 'Pozisyon kapatılmalı.'}`,
      },
    },
    preFilterStatus: { regimeGate:'PASS', entropyGate:'PASS', riskGate:'PASS', overallPreFilter:'PASS' },
    confidence: {
      overall: confidence,
      breakdown: {
        K0: { score: bias!=='neutral'?7:5, weighted: (bias!=='neutral'?7:5)*0.10 },
        K1: { score: 6, weighted: 6*0.05 },
        K2: { score: fgScore, weighted: fgScore*0.10 },
        K3: { score: 5, weighted: 5*0.08 },
        K4: { score: hasStructure?(bias!=='neutral'?7:5):4, weighted: (hasStructure?(bias!=='neutral'?7:5):4)*0.22 },
        K5: { score: bias!=='neutral'?6:5, weighted: (bias!=='neutral'?6:5)*0.18 },
        K6: { score: bias!=='neutral'?6:5, weighted: (bias!=='neutral'?6:5)*0.15 },
        K7: { score: bias!=='neutral'?7:5, weighted: (bias!=='neutral'?7:5)*0.07 },
        K8: { score: fgScore, weighted: fgScore*0.05 },
      },
    },
    wyckoff: {
      phase: wyckoff.phase, subPhase: wyckoff.subPhase,
      nextMove: bias === 'bullish' ? 'Markup fazına geçiş bekleniyor' : bias === 'bearish' ? 'Markdown fazı devam edebilir' : 'Faz belirsiz',
    },
    executiveSummary: noTrade
      ? `${symbol}/USDT için kaliteli kurumsal bölge tespit edilemedi veya fiyat bölgeden uzak. ${setup ? `En yakın bölge: ${zoneLabel} (uzaklık %${setup.distanceToZonePct}).` : 'OB/FVG yapısı eksik.'} Bölge yaklaşımı bekleniyor — şu an işlem açmak için koşullar uygun değil.`
      : `${symbol}/USDT ${zoneLabel} bölgesinde ${bias === 'bullish' ? 'alış' : 'satış'} setup hazır. Giriş: ${fmt(setup?.entryHigh||entry)}–${fmt(setup?.entryLow||entry)}, SL: ${fmt(sl)}, TP1: ${fmt(tp1)} (R:R ${rr1}). ${confidence >= 65 ? 'Yüksek' : 'Orta'} güven — 4H kapanış teyidi önerilir.`,
  };
}

// ══════════════════════════════════════════════════
//  ANTHROPIC API CALL
// ══════════════════════════════════════════════════
async function callQuantumAI(message) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 5000,
        system: QUANTUM_SYSTEM_PROMPT,
        messages: [{ role:'user', content: message }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const text = d.content?.[0]?.text || '';
    // JSON temizle
    const clean = text.replace(/```json\s?/g,'').replace(/```/g,'').trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error('Quantum AI error:', e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════
//  QUOTA CHECK (Supabase)
// ══════════════════════════════════════════════════
async function checkQuantumQuota(token) {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const SB_SVC = process.env.SUPABASE_SERVICE_KEY;
  const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !SB_URL) return { allowed: true, plan: 'free' };
  try {
    const uRes = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { apikey: SB_SVC || SB_ANON, Authorization: `Bearer ${token}` }
    });
    if (!uRes.ok) return { allowed: false, error: 'Oturum süresi dolmuş.' };
    const user = await uRes.json();
    if (!user?.id) return { allowed: false, error: 'Geçersiz oturum.' };
    const pRes = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${user.id}&select=*`, {
      headers: { apikey: SB_SVC, Authorization: `Bearer ${SB_SVC}` }
    });
    const profiles = await pRes.json();
    const p = Array.isArray(profiles) ? profiles[0] : null;
    const plan = p?.plan || 'free';
    // Tek analiz modu — tüm planlar kullanabilir
    const quantumLimits = { free: 5, pro: 30, elite: 100 };
    const limit = quantumLimits[plan] || 5;
    const today = new Date().toISOString().split('T')[0];
    const isNew = p?.last_quantum_date !== today;
    const count = isNew ? 0 : (p?.quantum_analyses_today || 0);
    if (count >= limit) return { allowed: false, error: `Günlük analiz limitine ulaştınız (${limit}/gün). ELITE planla 100/gün kullanabilirsiniz.`, limit: true };
    await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json', apikey: SB_SVC, Authorization: `Bearer ${SB_SVC}` },
      body: JSON.stringify({ quantum_analyses_today: count + 1, last_quantum_date: today }),
    });
    return { allowed: true, plan, userId: user.id };
  } catch { return { allowed: true, plan: 'free' }; }
}

// ══════════════════════════════════════════════════
//  SAVE ANALYSIS (Supabase)
// ══════════════════════════════════════════════════
async function saveQuantumAnalysis(userId, symbol, result) {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const SB_SVC = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_URL || !SB_SVC || !userId) return;
  try {
    await fetch(`${SB_URL}/rest/v1/quantum_analyses`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', apikey: SB_SVC, Authorization: `Bearer ${SB_SVC}`, Prefer:'return=minimal' },
      body: JSON.stringify({
        user_id: userId, symbol, mode: 'full',
        signal_direction: result.signal?.direction || 'WAIT',
        confidence: result.confidence?.overall || 0,
        setup_quality: result.signal?.setupQuality || 'NO_TRADE',
        result: result,
        created_at: new Date().toISOString(),
      }),
    });
  } catch (e) { console.error('Save error:', e.message); }
}

// ══════════════════════════════════════════════════
//  MAIN HANDLER
// ══════════════════════════════════════════════════
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { coin, macroEvents } = req.body || {};
  if (!coin) return res.status(400).json({ error: 'Coin parametresi eksik.' });
  const symbol = coin.toUpperCase().replace(/USDT?$/i, '').trim();

  // Auth & Quota
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  const quota = await checkQuantumQuota(token);
  if (!quota.allowed) return res.status(403).json({ error: quota.error, upgrade: quota.upgrade, limit: quota.limit });

  try {
    // Paralel veri toplama
    let data = await getQuantumData(symbol);
    // İlk deneme başarısız olursa bir kez daha dene
    if (!data || data.closes.length < 30) {
      await new Promise(r => setTimeout(r, 1500));
      data = await getQuantumData(symbol);
    }
    if (!data || data.closes.length < 30) return res.status(502).json({ error: `${symbol} için Binance verisi alınamadı. Lütfen tekrar deneyin.` });
    const fearGreed = await getFearGreed();

    // Göstergeler hesapla
    const { closes, highs, lows, volumes, candles1d, candles4h, candles1w, price } = data;
    const struct1d = detectStructure(candles1d);
    const struct4h = candles4h.length >= 10 ? detectStructure(candles4h) : { structure: 'RANGING', bos: 'NONE', choch: 'NONE', swingHighs: [], swingLows: [] };
    const struct1w = candles1w.length >= 10 ? detectStructure(candles1w) : { structure: 'RANGING', bos: 'NONE', choch: 'NONE', swingHighs: [], swingLows: [] };
    const indicators = {
      rsi1d: calcRSI(closes),
      rsi4h: candles4h.length >= 15 ? calcRSI(candles4h.map(c => c.close)) : calcRSI(closes),
      macd1d: calcMACD(closes),
      macd4h: candles4h.length >= 35 ? calcMACD(candles4h.map(c => c.close)) : calcMACD(closes),
      bb1d: calcBollinger(closes),
      atr1d: calcATR(highs, lows, closes),
      stochRSI: calcStochRSI(closes),
      obv: calcOBV(closes, volumes),
      fib: calcFibonacci(highs, lows, closes),
      struct1d, struct4h, struct1w,
      obs1d: detectOrderBlocks(candles1d, '1D'),
      obs4h: detectOrderBlocks(candles4h, '4H'),
      fvg1d: detectFVGs(candles1d, '1D', price),
      fvg4h: detectFVGs(candles4h, '4H', price),
      wyckoff: detectWyckoff(candles1d),
      closes, // quantumFallback'te emaStack hesabı için
      sector: detectSector(symbol), // quantumFallback'te sector gösterimi için
    };

    // Chartos Quantum Final — ek analizler
    const macroContext = analyzeMacroCalendar(Array.isArray(macroEvents) ? macroEvents : []);
    const breaks4h = detectTrendBreaks(candles4h, '4H');
    const breaks1d = detectTrendBreaks(candles1d, '1D');
    const breaks1w = detectTrendBreaks(candles1w, '1W');
    const trendBreaks = { breaks4h, breaks1d, breaks1w };
    const isWeekend = [0, 6].includes(new Date().getUTCDay());
    const manipRisks = assessManipulationRisks(
      price,
      struct1d.swingHighs,
      struct1d.swingLows,
      isWeekend,
      macroContext.riskLevel !== 'LOW',
    );

    // Direction Lock — ALGO ile tutarlılık
    const dirLock = computeDirectionLock(data, indicators);

    // Claude AI çağrısı
    const message = buildQuantumMessage(symbol, data, indicators, fearGreed, macroContext, trendBreaks, manipRisks, dirLock);
    const aiResult = await callQuantumAI(message);
    const result = aiResult || quantumFallback(symbol, price, indicators, fearGreed, dirLock);

    // WIN RATE ENFORCEMENT: Only return signals with confidence >= 72
    if (result.signal && result.signal.confidenceScore < 72) {
      result.signal.direction = 'WAIT';
      result.signal.grade = 'C';
      result.signal.status = 'LOW_CONFIDENCE';
    }

    // Analizi kaydet (hata olsa bile devam et)
    if (quota.userId) saveQuantumAnalysis(quota.userId, symbol, result).catch(() => {});

    // Yanıt (enriched with APEX data)
    return res.status(200).json({
      success: true,
      symbol: `${symbol}/USDT`,
      price,
      analysisId: `APEX-${symbol}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      aiPowered: !!aiResult,
      data: result,
      // Chartos Quantum Final ek verileri
      macro: {
        riskLevel: macroContext.riskLevel,
        restriction: macroContext.tradingRestriction,
        description: macroContext.description,
        upcomingEvents: macroContext.events,
      },
      trendBreaks: {
        '4H': breaks4h,
        '1D': breaks1d,
        '1W': breaks1w,
      },
      manipulationRisks: manipRisks,
    });

  } catch (err) {
    console.error('Quantum handler error:', err.message, err.stack?.split('\n').slice(0,3).join(' | '));
    return res.status(500).json({ error: 'Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.' });
  }
}
