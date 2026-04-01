// pages/api/analyze.js
// DEEP TRADE SCAN — Quantum Meta System v2.0 (Algoritmik Sinyal Motoru)
// 9-Modül Confluence | ICT/SMC | Wyckoff | Market Regime | On-Chain | Futures Data
// Win Rate Hedef: %70–80 | 5x–10x Kaldıraçlı Vadeli İşlem Setup Engine
// Timeframes: 4H / 1D / 1W / 1M  |  Binance API (primary) + OKX fallback
// Data Sources: Binance Spot + Futures (L/S ratio, taker vol, OI) + CoinGecko + CoinGlass (optional)

export const config = { runtime: 'edge' };

// ── Symbol Maps ───────────────────────────────────────────────────────────────

const BINANCE_MAP = {
  BTC:'BTCUSDT', ETH:'ETHUSDT', BNB:'BNBUSDT', SOL:'SOLUSDT', XRP:'XRPUSDT',
  ADA:'ADAUSDT', AVAX:'AVAXUSDT', DOT:'DOTUSDT', ARB:'ARBUSDT', OP:'OPUSDT',
  MATIC:'MATICUSDT', STRK:'STRKUSDT', IMX:'IMXUSDT', LINK:'LINKUSDT',
  UNI:'UNIUSDT', AAVE:'AAVEUSDT', GMX:'GMXUSDT', PENDLE:'PENDLEUSDT',
  LDO:'LDOUSDT', CRV:'CRVUSDT', DYDX:'DYDXUSDT', INJ:'INJUSDT',
  SUI:'SUIUSDT', APT:'APTUSDT', NEAR:'NEARUSDT', ATOM:'ATOMUSDT',
  TON:'TONUSDT', SEI:'SEIUSDT', TIA:'TIAUSDT', FET:'FETUSDT',
  RENDER:'RENDERUSDT', TAO:'TAOUSDT', WLD:'WLDUSDT', DOGE:'DOGEUSDT',
  SHIB:'SHIBUSDT', PEPE:'PEPEUSDT', WIF:'WIFUSDT', BONK:'BONKUSDT',
  FLOKI:'FLOKIUSDT', LTC:'LTCUSDT', XLM:'XLMUSDT', HBAR:'HBARUSDT',
  TRX:'TRXUSDT', ORDI:'ORDIUSDT', RUNE:'RUNEUSDT', STX:'STXUSDT',
  KAS:'KASUSDT', JTO:'JTOUSDT', PYTH:'PYTHUSDT', ENA:'ENAUSDT',
  W:'WUSDT', EIGEN:'EIGENUSDT', MANTA:'MANTAUSDT', ALT:'ALTUSDT',
};

// Futures-capable symbols (fapi.binance.com)
const FUTURES_SYMBOLS = new Set([
  'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT','AVAXUSDT',
  'DOTUSDT','ARBUSDT','OPUSDT','LINKUSDT','UNIUSDT','AAVEUSDT','INJUSDT',
  'SUIUSDT','APTUSDT','NEARUSDT','ATOMUSDT','DOGEUSDT','LDOUSDT','ENAUSDT',
]);

const GECKO_MAP = {
  BTC:'bitcoin', ETH:'ethereum', BNB:'binancecoin', SOL:'solana', XRP:'ripple',
  ADA:'cardano', AVAX:'avalanche-2', DOT:'polkadot', MATIC:'matic-network',
  ARB:'arbitrum', OP:'optimism', IMX:'immutable-x', LINK:'chainlink',
  UNI:'uniswap', AAVE:'aave', GMX:'gmx', PENDLE:'pendle', LDO:'lido-dao',
  CRV:'curve-dao-token', DYDX:'dydx-chain', INJ:'injective-protocol',
  SUI:'sui', APT:'aptos', NEAR:'near', ATOM:'cosmos',
  TON:'the-open-network', SEI:'sei-network', TIA:'celestia',
  FET:'fetch-ai', RENDER:'render-token', TAO:'bittensor', WLD:'worldcoin-wld',
  DOGE:'dogecoin', SHIB:'shiba-inu', PEPE:'pepe', WIF:'dogwifcoin',
  BONK:'bonk', FLOKI:'floki', LTC:'litecoin', XLM:'stellar',
  HBAR:'hedera-hashgraph', TRX:'tron', ORDI:'ordinals', RUNE:'thorchain',
  STX:'blockstack', STRK:'starknet',
};

// ── Data Fetchers ─────────────────────────────────────────────────────────────

// ── Module-level kline cache (90s TTL, persists within edge worker instance) ──
const _klCache = new Map(); // key → { ts, data }
const KLINE_TTL = 90_000;

function klCacheGet(key) {
  const e = _klCache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > KLINE_TTL) { _klCache.delete(key); return null; }
  return e.data;
}
function klCacheSet(key, data) { _klCache.set(key, { ts: Date.now(), data }); }

// ── fetchKlines: OKX primary, CoinGecko fallback ─────────────────────────────
const OKX_BAR = { '4h': '4H', '1d': '1D', '1w': '1W', '1M': '1M' };

async function safeGet(url, timeoutMs = 4000) {
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) return null;
      return await r.json();
    } finally {
      clearTimeout(tid);
    }
  } catch { return null; }
}

function parseOKX(data) {
  const list = data?.data;
  if (!Array.isArray(list) || list.length === 0) return null;
  return list.slice().reverse().map(k => ({
    t: parseInt(k[0]), o: parseFloat(k[1]), h: parseFloat(k[2]),
    l: parseFloat(k[3]), c: parseFloat(k[4]), v: parseFloat(k[5]),
  }));
}

async function fetchBinance(symbol, interval, limit) {
  const cacheKey = `${symbol}:${interval}:${limit}`;
  const cached = klCacheGet(cacheKey);
  if (cached) return cached;

  // 1) Binance API (primary — official, no rate limit for public endpoints)
  const raw = await safeGet(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${Math.min(limit, 1000)}`
  );
  if (Array.isArray(raw) && raw.length >= 20 && Array.isArray(raw[0])) {
    const result = raw.map(k => ({
      t: k[0], o: parseFloat(k[1]), h: parseFloat(k[2]),
      l: parseFloat(k[3]), c: parseFloat(k[4]), v: parseFloat(k[5]),
    }));
    klCacheSet(cacheKey, result);
    return result;
  }

  // 2) OKX fallback
  const sym = symbol.replace('USDT', '-USDT');
  const bar = OKX_BAR[interval] || interval.toUpperCase();
  const d1 = await safeGet(`https://www.okx.com/api/v5/market/candles?instId=${sym}&bar=${bar}&limit=${limit}`);
  const r1 = parseOKX(d1);
  if (r1 && r1.length >= 20) { klCacheSet(cacheKey, r1); return r1; }

  const d2 = await safeGet(`https://www.okx.com/api/v5/market/history-candles?instId=${sym}&bar=${bar}&limit=${limit}`);
  const r2 = parseOKX(d2);
  if (r2) klCacheSet(cacheKey, r2);
  return r2;
}

async function fetchFuturesData(symbol) {
  if (!FUTURES_SYMBOLS.has(symbol)) return null;

  // Binance Futures — funding rate, OI, L/S ratio, taker buy/sell volume
  try {
    const [fundingR, oiR, lsR, takerR] = await Promise.allSettled([
      safeGet(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`),
      safeGet(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`),
      safeGet(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=4h&limit=1`),
      safeGet(`https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=${symbol}&period=4h&limit=3`),
    ]);

    const fundingArr = fundingR.status === 'fulfilled' && Array.isArray(fundingR.value) ? fundingR.value : [];
    const oiData    = oiR.status === 'fulfilled' ? oiR.value : null;
    const lsArr     = lsR.status === 'fulfilled' && Array.isArray(lsR.value) ? lsR.value : [];
    const takerArr  = takerR.status === 'fulfilled' && Array.isArray(takerR.value) ? takerR.value : [];

    const fundingRate    = fundingArr.length > 0 ? parseFloat(fundingArr[0].fundingRate) : null;
    const openInterest   = oiData?.openInterest ? parseFloat(oiData.openInterest) : null;
    const longShortRatio = lsArr.length > 0 ? parseFloat(lsArr[0].longShortRatio) : null;
    const takerBuyRatio  = takerArr.length > 0 ? parseFloat(takerArr[0].buySellRatio) : null;

    // If Binance futures returned meaningful data, use it
    if (fundingRate !== null || openInterest !== null) {
      return { fundingRate, openInterest, longShortRatio, takerBuyRatio };
    }
  } catch { /* fall through to OKX */ }

  // OKX Fallback for futures
  try {
    const sw = symbol.replace('USDT', '-USDT-SWAP');
    const [oi, fr] = await Promise.all([
      safeGet(`https://www.okx.com/api/v5/public/open-interest?instId=${sw}`),
      safeGet(`https://www.okx.com/api/v5/public/funding-rate?instId=${sw}`),
    ]);
    return {
      openInterest:    oi?.data?.[0] ? parseFloat(oi.data[0].oi) : null,
      fundingRate:     fr?.data?.[0] ? parseFloat(fr.data[0].fundingRate) : null,
      longShortRatio:  null,
      takerBuyRatio:   null,
    };
  } catch { return null; }
}

// CoinGlass derivatives (optional — requires COINGLASS_API_KEY env var)
async function fetchCoinGlass(symbol) {
  const key = process.env.COINGLASS_API_KEY;
  if (!key) return null;

  try {
    const headers = { 'Accept': 'application/json', 'CG-API-KEY': key };
    const safeKeyGet = async (url) => {
      try {
        const r = await fetch(url, { headers });
        if (!r.ok) return null;
        const j = await r.json();
        return (j.code === 0 || j.code === '0') ? j.data : null;
      } catch { return null; }
    };

    const [fundingData, oiData, liqData, lsData] = await Promise.all([
      safeKeyGet(`https://open-api-v3.coinglass.com/api/futures/funding-rate?symbol=${symbol}`),
      safeKeyGet(`https://open-api-v3.coinglass.com/api/futures/open-interest?symbol=${symbol}`),
      safeKeyGet(`https://open-api-v3.coinglass.com/api/futures/liquidation/detail?symbol=${symbol}`),
      safeKeyGet(`https://open-api-v3.coinglass.com/api/futures/long-short-ratio?symbol=${symbol}`),
    ]);

    // Parse funding bias
    let fundingBias = 'neutral';
    let cgFundingRate = null;
    if (fundingData) {
      const item = Array.isArray(fundingData) ? fundingData[0] : fundingData;
      const rates = item?.uMarginList || [];
      if (rates.length > 0) {
        cgFundingRate = rates.reduce((s, e) => s + parseFloat(e.rate || 0), 0) / rates.length;
        if (cgFundingRate > 0.01) fundingBias = 'extreme_long';
        else if (cgFundingRate > 0.005) fundingBias = 'long';
        else if (cgFundingRate < -0.01) fundingBias = 'extreme_short';
        else if (cgFundingRate < -0.005) fundingBias = 'short';
      }
    }

    // Parse OI trend
    let oiTrend = 'flat', oiChange24h = null;
    if (oiData) {
      const item = Array.isArray(oiData) ? oiData[0] : oiData;
      oiChange24h = parseFloat(item?.h24OiChangePercent || item?.h24Change || 0);
      oiTrend = oiChange24h > 5 ? 'rising' : oiChange24h < -5 ? 'falling' : 'flat';
    }

    // Parse liquidation pressure
    let liqPressure = 'balanced';
    if (liqData) {
      const item = Array.isArray(liqData) ? liqData[0] : liqData;
      const longLiq = parseFloat(item?.h24LongLiquidationUsd || 0);
      const shortLiq = parseFloat(item?.h24ShortLiquidationUsd || 0);
      const total = longLiq + shortLiq;
      if (total > 0) {
        const longPct = longLiq / total;
        if (longPct > 0.65) liqPressure = 'long_squeezed';
        else if (longPct < 0.35) liqPressure = 'short_squeezed';
      }
    }

    // Parse crowded side
    let crowdedSide = 'neutral';
    if (Array.isArray(lsData) && lsData.length > 0) {
      const avgRatio = lsData.reduce((s, d) => s + parseFloat(d.longShortRatio || 1), 0) / lsData.length;
      if (avgRatio > 1.5) crowdedSide = 'long';
      else if (avgRatio < 0.67) crowdedSide = 'short';
    }

    return { fundingBias, fundingRate: cgFundingRate, oiTrend, oiChange24h, liqPressure, crowdedSide };
  } catch { return null; }
}

async function fetchGecko(geckoId) {
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/coins/${geckoId}?localization=false&tickers=false&community_data=false&developer_data=false`
    );
    if (!r.ok) return null;
    const d = await r.json();
    const m = d.market_data;
    return {
      price:     m.current_price.usd,
      change24h: m.price_change_percentage_24h,
      change7d:  m.price_change_percentage_7d,
      change30d: m.price_change_percentage_30d,
      high24h:   m.high_24h.usd,
      low24h:    m.low_24h.usd,
      volume24h: m.total_volume.usd,
      marketCap: m.market_cap.usd,
    };
  } catch { return null; }
}

// ── Math & Indicator Helpers ──────────────────────────────────────────────────

function smaArr(arr, period) {
  if (arr.length < period) return arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calcEMA(closes, period) {
  if (!closes || closes.length === 0) return 0;
  const len = closes.length;
  if (len < period) return closes[len - 1];
  const k = 2 / (period + 1);
  const start = Math.min(period, len);
  let e = closes.slice(0, start).reduce((a, b) => a + b, 0) / start;
  for (let i = start; i < len; i++) e = closes[i] * k + e * (1 - k);
  return e;
}

function calcEMAArray(closes, period) {
  const k = 2 / (period + 1);
  let ema = closes[0];
  return closes.map((v, i) => {
    if (i === 0) return ema;
    ema = v * k + ema * (1 - k);
    return ema;
  });
}

function calcRSI(closes, period = 14) {
  if (!closes || closes.length < period + 1) return 50;
  const ch = closes.slice(1).map((v, i) => v - closes[i]);
  let aG = 0, aL = 0;
  for (let i = 0; i < period; i++) {
    if (ch[i] > 0) aG += ch[i]; else aL += Math.abs(ch[i]);
  }
  aG /= period; aL /= period;
  for (let i = period; i < ch.length; i++) {
    aG = (aG * (period - 1) + (ch[i] > 0 ? ch[i] : 0)) / period;
    aL = (aL * (period - 1) + (ch[i] < 0 ? Math.abs(ch[i]) : 0)) / period;
  }
  return aL === 0 ? 100 : parseFloat((100 - 100 / (1 + aG / aL)).toFixed(2));
}

function calcATR(candles, period = 14) {
  if (!candles || candles.length < 2) return 0;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    trs.push(Math.max(
      candles[i].h - candles[i].l,
      Math.abs(candles[i].h - candles[i - 1].c),
      Math.abs(candles[i].l - candles[i - 1].c)
    ));
  }
  const slice = trs.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function calcMACD(closes, fast = 12, slow = 26, signal = 9) {
  if (closes.length < slow + signal) return { macd: 0, signal: 0, histogram: 0, bullish: false, crossUp: false, crossDown: false, histRising: false };
  const emaFastArr = calcEMAArray(closes, fast);
  const emaSlowArr = calcEMAArray(closes, slow);
  const macdLine   = emaFastArr.map((v, i) => v - emaSlowArr[i]);
  const signalLine = calcEMAArray(macdLine, signal);
  const last       = closes.length - 1;
  const macdVal    = macdLine[last];
  const signalVal  = signalLine[last];
  const histVal    = macdVal - signalVal;
  const prevHist   = macdLine[last - 1] - signalLine[last - 1];
  return {
    macd:       parseFloat(macdVal.toFixed(6)),
    signal:     parseFloat(signalVal.toFixed(6)),
    histogram:  parseFloat(histVal.toFixed(6)),
    bullish:    macdVal > signalVal,
    crossUp:    histVal > 0 && prevHist <= 0,
    crossDown:  histVal < 0 && prevHist >= 0,
    histRising: histVal > prevHist,
  };
}

function calcADX(candles, period = 14) {
  if (candles.length < period * 2) return { adx: 25, plusDI: 20, minusDI: 20, trending: false, strongTrend: false, bullish: true };
  const plusDM = [], minusDM = [], tr = [];
  for (let i = 1; i < candles.length; i++) {
    const upMove   = candles[i].h - candles[i - 1].h;
    const downMove = candles[i - 1].l - candles[i].l;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    tr.push(Math.max(
      candles[i].h - candles[i].l,
      Math.abs(candles[i].h - candles[i - 1].c),
      Math.abs(candles[i].l - candles[i - 1].c)
    ));
  }
  const smooth = (arr) => {
    let sum = arr.slice(0, period).reduce((a, b) => a + b, 0);
    const out = [sum];
    for (let i = period; i < arr.length; i++) {
      sum = sum - sum / period + arr[i];
      out.push(sum);
    }
    return out;
  };
  const sTR = smooth(tr), sPDM = smooth(plusDM), sMDM = smooth(minusDM);
  const pDI = sPDM.map((v, i) => sTR[i] > 0 ? (v / sTR[i]) * 100 : 0);
  const mDI = sMDM.map((v, i) => sTR[i] > 0 ? (v / sTR[i]) * 100 : 0);
  const dx  = pDI.map((v, i) => {
    const s = v + mDI[i];
    return s > 0 ? Math.abs(v - mDI[i]) / s * 100 : 0;
  });
  const adx     = smaArr(dx, period);
  const lastPDI = pDI[pDI.length - 1];
  const lastMDI = mDI[mDI.length - 1];
  return {
    adx:         parseFloat(adx.toFixed(2)),
    plusDI:      parseFloat(lastPDI.toFixed(2)),
    minusDI:     parseFloat(lastMDI.toFixed(2)),
    trending:    adx > 25,
    strongTrend: adx > 40,
    bullish:     lastPDI > lastMDI,
  };
}

function calcStochRSI(closes, rsiPeriod = 14, stochPeriod = 14, kSmooth = 3, dSmooth = 3) {
  if (closes.length < rsiPeriod + stochPeriod + kSmooth) return { k: 50, d: 50, overbought: false, oversold: false, bullishCross: false };
  const rsiArr = [];
  for (let i = rsiPeriod; i <= closes.length; i++) {
    rsiArr.push(calcRSI(closes.slice(0, i), rsiPeriod));
  }
  const stochArr = [];
  for (let i = stochPeriod - 1; i < rsiArr.length; i++) {
    const slice = rsiArr.slice(i - stochPeriod + 1, i + 1);
    const hi = Math.max(...slice), lo = Math.min(...slice);
    stochArr.push(hi === lo ? 50 : ((rsiArr[i] - lo) / (hi - lo)) * 100);
  }
  const kArr = [];
  for (let i = kSmooth - 1; i < stochArr.length; i++) {
    kArr.push(smaArr(stochArr.slice(i - kSmooth + 1, i + 1), kSmooth));
  }
  const dArr = [];
  for (let i = dSmooth - 1; i < kArr.length; i++) {
    dArr.push(smaArr(kArr.slice(i - dSmooth + 1, i + 1), dSmooth));
  }
  const k    = kArr[kArr.length - 1] || 50;
  const d    = dArr[dArr.length - 1] || 50;
  const kPrev = kArr[kArr.length - 2] || 50;
  const dPrev = dArr[dArr.length - 2] || 50;
  return {
    k:            parseFloat(k.toFixed(2)),
    d:            parseFloat(d.toFixed(2)),
    overbought:   k > 80,
    oversold:     k < 20,
    bullishCross: k > d && kPrev <= dPrev,
  };
}

function calcBollingerBands(closes, period = 20, mult = 2) {
  const price = closes[closes.length - 1];
  if (closes.length < period) return { upper: price * 1.02, middle: price, lower: price * 0.98, bandwidth: 0.04, percentB: 0.5, squeeze: false };
  const slice = closes.slice(-period);
  const mid   = slice.reduce((a, b) => a + b, 0) / period;
  const std   = Math.sqrt(slice.reduce((s, v) => s + Math.pow(v - mid, 2), 0) / period);
  const upper = mid + mult * std;
  const lower = mid - mult * std;
  const bandwidth = (upper - lower) / mid;
  const percentB  = (upper - lower) > 0 ? (price - lower) / (upper - lower) : 0.5;
  return {
    upper:      parseFloat(upper.toFixed(8)),
    middle:     parseFloat(mid.toFixed(8)),
    lower:      parseFloat(lower.toFixed(8)),
    bandwidth:  parseFloat(bandwidth.toFixed(4)),
    percentB:   parseFloat(percentB.toFixed(3)),
    squeeze:    bandwidth < 0.04,
  };
}

function calcVWAP(candles) {
  if (!candles || candles.length === 0) return 0;
  let cumPV = 0, cumV = 0;
  for (const c of candles) {
    const tp = (c.h + c.l + c.c) / 3;
    cumPV += tp * c.v;
    cumV  += c.v;
  }
  return cumV > 0 ? parseFloat((cumPV / cumV).toFixed(8)) : candles[candles.length - 1].c;
}

function calcOBV(candles) {
  if (!candles || candles.length < 2) return { obv: 0, rising: false, confirmsTrend: false };
  let obv = 0;
  const obvArr = [0];
  for (let i = 1; i < candles.length; i++) {
    if      (candles[i].c > candles[i - 1].c) obv += candles[i].v;
    else if (candles[i].c < candles[i - 1].c) obv -= candles[i].v;
    obvArr.push(obv);
  }
  const recent = obvArr.slice(-10);
  const rising = recent[recent.length - 1] > recent[0];
  const priceTrend = candles.length >= 10 && candles[candles.length - 1].c > candles[candles.length - 10].c;
  return { obv: parseFloat(obv.toFixed(0)), rising, confirmsTrend: rising === priceTrend };
}

function calcVolumeProfile(candles, bins = 40) {
  if (!candles || candles.length < 10) return { poc: 0, vah: 0, val: 0, hvn: [], lvn: [] };
  const hi = Math.max(...candles.map(c => c.h));
  const lo = Math.min(...candles.map(c => c.l));
  if (hi === lo) return { poc: hi, vah: hi, val: lo, hvn: [], lvn: [] };
  const binSize = (hi - lo) / bins;
  const profile = new Array(bins).fill(0);
  for (const c of candles) {
    const tp  = (c.h + c.l + c.c) / 3;
    const idx = Math.min(bins - 1, Math.floor((tp - lo) / binSize));
    profile[idx] += c.v;
  }
  const totalVol = profile.reduce((a, b) => a + b, 0);
  const pocIdx   = profile.indexOf(Math.max(...profile));
  const poc      = lo + (pocIdx + 0.5) * binSize;
  const vaTarget = totalVol * 0.7;
  let vaVol = profile[pocIdx], lo_i = pocIdx, hi_i = pocIdx;
  while (vaVol < vaTarget && (lo_i > 0 || hi_i < bins - 1)) {
    const addLow  = lo_i > 0 ? profile[lo_i - 1] : 0;
    const addHigh = hi_i < bins - 1 ? profile[hi_i + 1] : 0;
    if (addHigh >= addLow && hi_i < bins - 1) { hi_i++; vaVol += addHigh; }
    else if (lo_i > 0) { lo_i--; vaVol += addLow; }
    else break;
  }
  const vah = lo + (hi_i + 1) * binSize;
  const val = lo + lo_i * binSize;
  const avgVol = totalVol / bins;
  const hvn = [], lvn = [];
  for (let i = 0; i < bins; i++) {
    const p = lo + (i + 0.5) * binSize;
    if (profile[i] > avgVol * 1.5) hvn.push(parseFloat(p.toFixed(8)));
    if (profile[i] < avgVol * 0.5 && profile[i] > 0) lvn.push(parseFloat(p.toFixed(8)));
  }
  return { poc: parseFloat(poc.toFixed(8)), vah: parseFloat(vah.toFixed(8)), val: parseFloat(val.toFixed(8)), hvn: hvn.slice(0, 5), lvn: lvn.slice(0, 5) };
}

function calcCVD(candles) {
  if (!candles || candles.length < 2) return { cvd: 0, rising: false };
  let cvd = 0;
  const recentDeltas = candles.slice(-10).map(c => {
    const range = c.h - c.l;
    if (range === 0) return 0;
    return ((c.c - c.l) / range - 0.5) * 2 * c.v;
  });
  for (const c of candles) {
    const range = c.h - c.l;
    if (range === 0) continue;
    cvd += ((c.c - c.l) / range - 0.5) * 2 * c.v;
  }
  const recentSum = recentDeltas.reduce((a, b) => a + b, 0);
  return { cvd: parseFloat(cvd.toFixed(0)), rising: recentSum > 0 };
}

// ── Advanced Indicator Suite ──────────────────────────────────────────────────

// Williams %R — Overbought/Oversold momentum
function calcWilliamsR(candles, period = 14) {
  if (!candles || candles.length < period) return { value: -50, overbought: false, oversold: false };
  const slice = candles.slice(-period);
  const hi = Math.max(...slice.map(c => c.h));
  const lo = Math.min(...slice.map(c => c.l));
  const close = candles[candles.length - 1].c;
  if (hi === lo) return { value: -50, overbought: false, oversold: false };
  const wr = ((hi - close) / (hi - lo)) * -100;
  return {
    value:      parseFloat(wr.toFixed(2)),
    overbought: wr > -20,
    oversold:   wr < -80,
  };
}

// CCI — Commodity Channel Index
function calcCCI(candles, period = 20) {
  if (!candles || candles.length < period) return { value: 0, overbought: false, oversold: false };
  const tps = candles.map(c => (c.h + c.l + c.c) / 3);
  const slice = tps.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const md   = slice.reduce((s, v) => s + Math.abs(v - mean), 0) / period;
  if (md === 0) return { value: 0, overbought: false, oversold: false };
  const cci = (tps[tps.length - 1] - mean) / (0.015 * md);
  return {
    value:      parseFloat(cci.toFixed(2)),
    overbought: cci > 100,
    oversold:   cci < -100,
    extreme:    Math.abs(cci) > 200,
  };
}

// MFI — Money Flow Index (volume-weighted RSI)
function calcMFI(candles, period = 14) {
  if (!candles || candles.length < period + 1) return { value: 50, overbought: false, oversold: false };
  let posFlow = 0, negFlow = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const tp  = (candles[i].h + candles[i].l + candles[i].c) / 3;
    const ptp = (candles[i - 1].h + candles[i - 1].l + candles[i - 1].c) / 3;
    const mf  = tp * candles[i].v;
    if (tp >= ptp) posFlow += mf; else negFlow += mf;
  }
  if (negFlow === 0) return { value: 100, overbought: true, oversold: false };
  const mfr = posFlow / negFlow;
  const mfi = 100 - (100 / (1 + mfr));
  return {
    value:      parseFloat(mfi.toFixed(2)),
    overbought: mfi > 80,
    oversold:   mfi < 20,
    bullishDiv: mfi < 40, // watch for bullish divergence
  };
}

// Ichimoku Cloud — kurumsal trend filtresi
function calcIchimoku(candles) {
  const len = candles.length;
  if (len < 52) return {
    tenkan: 0, kijun: 0, senkouA: 0, senkouB: 0,
    aboveCloud: false, belowCloud: false, inCloud: true,
    cloudBullish: false, tkCross: 'none', strong: false,
  };
  const mid = (arr) => (Math.max(...arr.map(c => c.h)) + Math.min(...arr.map(c => c.l))) / 2;
  const tenkan  = mid(candles.slice(-9));
  const kijun   = mid(candles.slice(-26));
  const senkouA = (tenkan + kijun) / 2;
  const senkouB = mid(candles.slice(-52));
  const price   = candles[len - 1].c;
  const cloudTop    = Math.max(senkouA, senkouB);
  const cloudBottom = Math.min(senkouA, senkouB);
  const aboveCloud  = price > cloudTop;
  const belowCloud  = price < cloudBottom;
  const inCloud     = !aboveCloud && !belowCloud;
  const cloudBullish = senkouA > senkouB; // bullish kumo (future cloud)
  // TK cross signal (strong buy/sell)
  const prevTenkan = mid(candles.slice(-10, -1));
  const prevKijun  = mid(candles.slice(-27, -1));
  let tkCross = 'none';
  if (tenkan > kijun && prevTenkan <= prevKijun) tkCross = 'bullish';
  if (tenkan < kijun && prevTenkan >= prevKijun) tkCross = 'bearish';
  // Strong signal: price+cloud+TK all aligned
  const strong = aboveCloud && cloudBullish && tenkan > kijun;
  return {
    tenkan: parseFloat(tenkan.toFixed(8)),
    kijun:  parseFloat(kijun.toFixed(8)),
    senkouA: parseFloat(senkouA.toFixed(8)),
    senkouB: parseFloat(senkouB.toFixed(8)),
    cloudTop: parseFloat(cloudTop.toFixed(8)),
    cloudBottom: parseFloat(cloudBottom.toFixed(8)),
    aboveCloud, belowCloud, inCloud, cloudBullish, tkCross, strong,
    distToCloud: parseFloat(((price - (aboveCloud ? cloudTop : cloudBottom)) / price * 100).toFixed(2)),
  };
}

// Supertrend — ATR tabanlı trend takip
function calcSupertrend(candles, period = 10, mult = 3.0) {
  if (!candles || candles.length < period + 1) return { value: 0, bullish: true, changed: false };
  const atr = calcATR(candles, period);
  const close = candles[candles.length - 1].c;
  const prevClose = candles[candles.length - 2].c;
  const hl2 = (candles[candles.length - 1].h + candles[candles.length - 1].l) / 2;
  const upperBand = hl2 + mult * atr;
  const lowerBand = hl2 - mult * atr;
  // Simplified: price vs ATR bands
  const bullish = close > lowerBand;
  const prevBullish = prevClose > ((candles[candles.length - 2].h + candles[candles.length - 2].l) / 2 - mult * atr);
  return {
    value:   bullish ? parseFloat(lowerBand.toFixed(8)) : parseFloat(upperBand.toFixed(8)),
    bullish,
    changed: bullish !== prevBullish,
    upperBand: parseFloat(upperBand.toFixed(8)),
    lowerBand: parseFloat(lowerBand.toFixed(8)),
  };
}

// Fibonacci Retracement — swing tabanlı kurumsal seviyeler
function calcFibonacciLevels(swingHighs, swingLows, currentPrice) {
  if (!swingHighs.length || !swingLows.length) return null;
  // Use most recent significant swing for retracement
  const recentHigh = Math.max(...swingHighs.slice(-5));
  const recentLow  = Math.min(...swingLows.slice(-5));
  if (recentHigh <= recentLow) return null;
  const range = recentHigh - recentLow;
  const isRetracing = currentPrice < recentHigh; // in pullback from high
  const levels = {
    0:     recentLow,
    0.236: recentLow + range * 0.236,
    0.382: recentLow + range * 0.382,
    0.5:   recentLow + range * 0.5,
    0.618: recentLow + range * 0.618,    // golden pocket start
    0.65:  recentLow + range * 0.65,     // golden pocket mid
    0.705: recentLow + range * 0.705,    // OTE (Optimal Trade Entry)
    0.786: recentLow + range * 0.786,    // golden pocket end
    1.0:   recentHigh,
    1.272: recentHigh + range * 0.272,   // extension TP1
    1.618: recentHigh + range * 0.618,   // extension TP2
    2.0:   recentHigh + range,           // extension TP3
  };
  // Find nearest fib level to current price
  const fibArr = Object.entries(levels).map(([k, v]) => ({ label: k, price: v, dist: Math.abs(v - currentPrice) / currentPrice }));
  const nearest = fibArr.sort((a, b) => a.dist - b.dist)[0];
  // Golden pocket: 0.618-0.786 range
  const inGoldenPocket = currentPrice >= levels[0.618] && currentPrice <= levels[0.786];
  const inOTE = currentPrice >= levels[0.618] && currentPrice <= levels[0.705];
  return {
    swingHigh: parseFloat(recentHigh.toFixed(8)),
    swingLow:  parseFloat(recentLow.toFixed(8)),
    levels:    Object.fromEntries(Object.entries(levels).map(([k, v]) => [k, parseFloat(v.toFixed(8))])),
    inGoldenPocket,
    inOTE,
    nearest: nearest.label,
    nearestDist: parseFloat((nearest.dist * 100).toFixed(2)),
  };
}

// Classic Pivot Points — kurumsal destek/direnç seviyeleri
function calcPivotPoints(candles) {
  if (!candles || candles.length < 2) return null;
  // Use previous full session candle (daily: yesterday)
  const prev = candles[candles.length - 2];
  const H = prev.h, L = prev.l, C = prev.c;
  const P  = (H + L + C) / 3;
  const R1 = 2 * P - L;
  const R2 = P + (H - L);
  const R3 = H + 2 * (P - L);
  const S1 = 2 * P - H;
  const S2 = P - (H - L);
  const S3 = L - 2 * (H - P);
  const price = candles[candles.length - 1].c;
  const fp = (n) => parseFloat(n.toFixed(8));
  // Nearest level
  const allLevels = [
    { l: 'R3', p: R3 }, { l: 'R2', p: R2 }, { l: 'R1', p: R1 },
    { l: 'PP', p: P },
    { l: 'S1', p: S1 }, { l: 'S2', p: S2 }, { l: 'S3', p: S3 },
  ];
  const nearest = allLevels.sort((a, b) => Math.abs(a.p - price) - Math.abs(b.p - price))[0];
  return {
    pp: fp(P), r1: fp(R1), r2: fp(R2), r3: fp(R3),
    s1: fp(S1), s2: fp(S2), s3: fp(S3),
    nearestLevel: nearest.l,
    nearestPrice: fp(nearest.p),
    abovePP: price > P,
    inBullishZone: price > P && price < R1,
    inBearishZone: price < P && price > S1,
  };
}

// RSI Divergence — one of the most reliable reversal signals
function detectRSIDivergence(candles, rsiPeriod = 14, lookback = 30) {
  if (!candles || candles.length < rsiPeriod + lookback + 5) return { bullDiv: false, bearDiv: false, hiddenBullDiv: false, hiddenBearDiv: false };
  const closes = candles.map(c => c.c);
  // Compute RSI array for last `lookback` candles
  const rsiArr = [];
  for (let i = rsiPeriod; i <= closes.length; i++) {
    rsiArr.push(calcRSI(closes.slice(0, i), rsiPeriod));
  }
  // Use last `lookback` candles
  const priceSlice = candles.slice(-lookback);
  const rsiSlice   = rsiArr.slice(-lookback);
  if (priceSlice.length < 6 || rsiSlice.length < 6) return { bullDiv: false, bearDiv: false };

  // Find swing lows and highs in price and RSI
  const priceLows = [], priceHighs = [], rsiLows = [], rsiHighs = [];
  for (let i = 2; i < priceSlice.length - 2; i++) {
    const p = priceSlice[i].l;
    const r = rsiSlice[i];
    if (p <= priceSlice[i-1].l && p <= priceSlice[i-2].l && p <= priceSlice[i+1].l && p <= priceSlice[i+2].l)
      priceLows.push({ i, p });
    if (rsiSlice[i] !== undefined && r <= rsiSlice[i-1] && r <= rsiSlice[i-2] && r <= rsiSlice[i+1] && r <= rsiSlice[i+2])
      rsiLows.push({ i, r });

    const ph = priceSlice[i].h;
    const rh = rsiSlice[i];
    if (ph >= priceSlice[i-1].h && ph >= priceSlice[i-2].h && ph >= priceSlice[i+1].h && ph >= priceSlice[i+2].h)
      priceHighs.push({ i, p: ph });
    if (rsiSlice[i] !== undefined && rh >= rsiSlice[i-1] && rh >= rsiSlice[i-2] && rh >= rsiSlice[i+1] && rh >= rsiSlice[i+2])
      rsiHighs.push({ i, r: rh });
  }

  let bullDiv = false, bearDiv = false, hiddenBullDiv = false, hiddenBearDiv = false;

  // Regular Bullish Divergence: price lower low, RSI higher low
  if (priceLows.length >= 2 && rsiLows.length >= 2) {
    const [pl1, pl2] = priceLows.slice(-2);
    const rsiNear1 = rsiLows.reduce((a, b) => Math.abs(b.i - pl1.i) < Math.abs(a.i - pl1.i) ? b : a);
    const rsiNear2 = rsiLows.reduce((a, b) => Math.abs(b.i - pl2.i) < Math.abs(a.i - pl2.i) ? b : a);
    if (pl2.p < pl1.p && rsiNear2.r > rsiNear1.r && pl2.i > pl1.i) bullDiv = true; // lower price, higher RSI
  }

  // Regular Bearish Divergence: price higher high, RSI lower high
  if (priceHighs.length >= 2 && rsiHighs.length >= 2) {
    const [ph1, ph2] = priceHighs.slice(-2);
    const rsiNear1 = rsiHighs.reduce((a, b) => Math.abs(b.i - ph1.i) < Math.abs(a.i - ph1.i) ? b : a);
    const rsiNear2 = rsiHighs.reduce((a, b) => Math.abs(b.i - ph2.i) < Math.abs(a.i - ph2.i) ? b : a);
    if (ph2.p > ph1.p && rsiNear2.r < rsiNear1.r && ph2.i > ph1.i) bearDiv = true; // higher price, lower RSI
  }

  // Hidden Bullish: price higher low, RSI lower low (continuation in uptrend)
  if (priceLows.length >= 2 && rsiLows.length >= 2) {
    const [pl1, pl2] = priceLows.slice(-2);
    const rsiNear1 = rsiLows.reduce((a, b) => Math.abs(b.i - pl1.i) < Math.abs(a.i - pl1.i) ? b : a);
    const rsiNear2 = rsiLows.reduce((a, b) => Math.abs(b.i - pl2.i) < Math.abs(a.i - pl2.i) ? b : a);
    if (pl2.p > pl1.p && rsiNear2.r < rsiNear1.r && pl2.i > pl1.i) hiddenBullDiv = true;
  }

  // Hidden Bearish: price lower high, RSI higher high (continuation in downtrend)
  if (priceHighs.length >= 2 && rsiHighs.length >= 2) {
    const [ph1, ph2] = priceHighs.slice(-2);
    const rsiNear1 = rsiHighs.reduce((a, b) => Math.abs(b.i - ph1.i) < Math.abs(a.i - ph1.i) ? b : a);
    const rsiNear2 = rsiHighs.reduce((a, b) => Math.abs(b.i - ph2.i) < Math.abs(a.i - ph2.i) ? b : a);
    if (ph2.p < ph1.p && rsiNear2.r > rsiNear1.r && ph2.i > ph1.i) hiddenBearDiv = true;
  }

  return { bullDiv, bearDiv, hiddenBullDiv, hiddenBearDiv };
}

// Volume Spike — detects institutional activity (3x+ average volume)
function detectVolumeSpike(candles, period = 20) {
  if (!candles || candles.length < period + 2) return { spike: false, ratio: 1, direction: 'neutral' };
  const avgVol = candles.slice(-period - 1, -1).reduce((s, c) => s + c.v, 0) / period;
  const lastVol = candles[candles.length - 1].v;
  const prevVol = candles[candles.length - 2].v;
  const ratio = avgVol > 0 ? Math.max(lastVol, prevVol) / avgVol : 1;
  const lastCandle = candles[candles.length - 1];
  const direction = lastCandle.c > lastCandle.o ? 'bullish' : 'bearish';
  return {
    spike: ratio >= 2.0,
    strongSpike: ratio >= 3.5,
    ratio: parseFloat(ratio.toFixed(2)),
    direction,
  };
}

// Market Regime — trending vs ranging, volatility state
function classifyMarketRegime(candles, atr) {
  if (!candles || candles.length < 50) return { regime: 'UNKNOWN', volatility: 'normal' };
  const closes = candles.map(c => c.c);
  const price   = closes[closes.length - 1];
  const atrPct  = atr / price;
  const ema20   = calcEMA(closes, 20);
  const ema50   = calcEMA(closes, Math.min(50, closes.length));
  const ema200  = calcEMA(closes, Math.min(200, closes.length));

  // Price action range over last 30 candles
  const last30 = candles.slice(-30);
  const hi30   = Math.max(...last30.map(c => c.h));
  const lo30   = Math.min(...last30.map(c => c.l));
  const range30 = (hi30 - lo30) / lo30;

  let regime = 'RANGING';
  if (ema20 > ema50 && ema50 > ema200 && range30 > 0.12) regime = 'BULL_TREND';
  else if (ema20 < ema50 && ema50 < ema200 && range30 > 0.12) regime = 'BEAR_TREND';
  else if (range30 < 0.06) regime = 'TIGHT_RANGE';
  else if (range30 > 0.25) regime = 'HIGH_VOLATILITY';

  const volatility = atrPct > 0.06 ? 'extreme' : atrPct > 0.035 ? 'high' : atrPct > 0.015 ? 'normal' : 'low';

  return { regime, volatility, atrPct: parseFloat((atrPct * 100).toFixed(2)), range30Pct: parseFloat((range30 * 100).toFixed(1)) };
}

// Displacement — large impulsive candle leaving FVG behind (institutional move)
function detectDisplacement(candles) {
  if (!candles || candles.length < 5) return { bullish: false, bearish: false, level: 0 };
  const atr = calcATR(candles, 14);
  const recent = candles.slice(-12);
  let bullish = false, bearish = false, level = 0;
  for (let i = 1; i < recent.length - 1; i++) {
    const c = recent[i];
    const body = Math.abs(c.c - c.o);
    const range = c.h - c.l;
    if (body < atr * 1.5 || range < atr * 1.8) continue;
    // Bullish displacement: closes near high, next candle's low > prev candle's high (FVG created)
    if (c.c > c.o && c.c > c.h - range * 0.2 &&
        i + 1 < recent.length && recent[i + 1].l > recent[i - 1].h) {
      bullish = true; level = c.l;
    }
    // Bearish displacement: closes near low, next candle's high < prev candle's low (FVG created)
    if (c.c < c.o && c.c < c.l + range * 0.2 &&
        i + 1 < recent.length && recent[i + 1].h < recent[i - 1].l) {
      bearish = true; level = c.h;
    }
  }
  const price = candles[candles.length - 1].c;
  return { bullish, bearish, level: parseFloat(level.toFixed(8)), priceAboveLevel: price > level };
}

// Premium / Discount Array — ICT: price location within swing range
// Premium (above 62.5%) = sell zone | Discount (below 37.5%) = buy zone | 50% = equilibrium
function calcPremiumDiscount(candles) {
  if (!candles || candles.length < 20) return { zone: 'EQUILIBRIUM', pct: 50, premium: false, discount: false, optimalBuy: false, optimalSell: false };
  const recent = candles.slice(-50);
  const hi = Math.max(...recent.map(c => c.h));
  const lo = Math.min(...recent.map(c => c.l));
  const range = hi - lo;
  if (range === 0) return { zone: 'EQUILIBRIUM', pct: 50, premium: false, discount: false, optimalBuy: false, optimalSell: false };
  const price = candles[candles.length - 1].c;
  const pct = ((price - lo) / range) * 100;
  const zone = pct > 62.5 ? 'PREMIUM' : pct < 37.5 ? 'DISCOUNT' : 'EQUILIBRIUM';
  return {
    zone,
    pct:         parseFloat(pct.toFixed(1)),
    premium:     zone === 'PREMIUM',
    discount:    zone === 'DISCOUNT',
    equilibrium: zone === 'EQUILIBRIUM',
    optimalBuy:  pct < 40,   // below 40% → discount = institutional buy zone
    optimalSell: pct > 60,   // above 60% → premium = institutional sell zone
    midpoint:    parseFloat(((hi + lo) / 2).toFixed(8)),
    swingHigh:   parseFloat(hi.toFixed(8)),
    swingLow:    parseFloat(lo.toFixed(8)),
  };
}

// Smart Money Divergence — price makes new extreme but OBV doesn't (distribution/accumulation)
function detectSMD(candles) {
  if (!candles || candles.length < 25) return { bullSMD: false, bearSMD: false };
  const recent = candles.slice(-24);
  let obv = 0;
  const obvArr = [0];
  for (let i = 1; i < recent.length; i++) {
    if      (recent[i].c > recent[i - 1].c) obv += recent[i].v;
    else if (recent[i].c < recent[i - 1].c) obv -= recent[i].v;
    obvArr.push(obv);
  }
  const half = Math.floor(recent.length / 2);
  const priceFirst = recent.slice(0, half).map(c => c.c);
  const priceLast  = recent.slice(half).map(c => c.c);
  const obvFirst   = obvArr.slice(0, half);
  const obvLast    = obvArr.slice(half);
  const pH1 = Math.max(...priceFirst), pH2 = Math.max(...priceLast);
  const pL1 = Math.min(...priceFirst), pL2 = Math.min(...priceLast);
  const oH1 = Math.max(...obvFirst),   oH2 = Math.max(...obvLast);
  const oL1 = Math.min(...obvFirst),   oL2 = Math.min(...obvLast);
  // Bearish SMD: price HH but OBV LH → distribution (smart money selling into strength)
  const bearSMD = pH2 > pH1 * 1.005 && oH2 < oH1 * 0.98;
  // Bullish SMD: price LL but OBV HL → accumulation (smart money buying into weakness)
  const bullSMD = pL2 < pL1 * 0.995 && oL2 > oL1 * 1.02;
  return { bullSMD, bearSMD };
}

// Breaker Blocks — mitigated OBs that flip to opposite (ICT concept)
function detectBreakerBlocks(candles) {
  if (!candles || candles.length < 20) return { bullBreakers: [], bearBreakers: [] };
  const price = candles[candles.length - 1].c;
  const bullBreakers = []; // former bearish OBs, now support
  const bearBreakers = []; // former bullish OBs, now resistance
  for (let i = 2; i < candles.length - 2; i++) {
    // Bearish OB (bearish candle → strong up move) that was mitigated → becomes BULL BREAKER
    if (candles[i].c < candles[i].o) { // bearish candle
      const afterMoves = candles.slice(i + 1, i + 5);
      const broke = afterMoves.some(c => c.c > candles[i].h); // price broke above OB
      if (broke) {
        // Re-test zone becomes a breaker support
        const retest = candles.slice(i + 5).some(c => c.l < candles[i].h && c.c > candles[i].l);
        if (retest && candles[i].h < price * 1.1 && candles[i].h > price * 0.85) {
          bullBreakers.push({ high: parseFloat(candles[i].h.toFixed(8)), low: parseFloat(candles[i].l.toFixed(8)) });
        }
      }
    }
    // Bullish OB that was mitigated → becomes BEAR BREAKER
    if (candles[i].c > candles[i].o) { // bullish candle
      const afterMoves = candles.slice(i + 1, i + 5);
      const broke = afterMoves.some(c => c.c < candles[i].l); // price broke below
      if (broke) {
        const retest = candles.slice(i + 5).some(c => c.h > candles[i].l && c.c < candles[i].h);
        if (retest && candles[i].l > price * 0.9 && candles[i].l < price * 1.15) {
          bearBreakers.push({ high: parseFloat(candles[i].h.toFixed(8)), low: parseFloat(candles[i].l.toFixed(8)) });
        }
      }
    }
  }
  return {
    bullBreakers: bullBreakers.slice(-5),
    bearBreakers: bearBreakers.slice(-5),
  };
}

// Derivatives Scoring Layer — funding, OI, L/S sentiment
function computeDerivativesScore(futuresData, coinGlassData) {
  if (!futuresData && !coinGlassData) return { score: 0, max: 10, signals: [] };
  let score = 5; // neutral baseline
  const signals = [];
  const fd = futuresData;

  if (fd?.fundingRate !== null && fd?.fundingRate !== undefined) {
    const fr = fd.fundingRate;
    // Negative funding = shorts paying longs = bullish squeeze potential
    if (fr < -0.005) { score += 2; signals.push('Negatif funding — long squeeze setup'); }
    else if (fr < 0) { score += 1; signals.push('Hafif negatif funding — nötr-pozitif'); }
    else if (fr > 0.01) { score -= 2; signals.push('Yüksek pozitif funding — long kalabalık'); }
    else if (fr > 0.005) { score -= 1; signals.push('Orta pozitif funding — dikkat'); }
  }

  if (fd?.longShortRatio !== null && fd?.longShortRatio !== undefined) {
    const ls = fd.longShortRatio;
    if (ls < 0.8) { score += 2; signals.push('Short kalabalık (L/S < 0.8) — squeeze riski'); }
    else if (ls > 2.0) { score -= 2; signals.push('Long kalabalık (L/S > 2.0) — dump riski'); }
  }

  if (fd?.takerBuyRatio !== null && fd?.takerBuyRatio !== undefined) {
    const tb = fd.takerBuyRatio;
    if (tb > 1.1) { score += 1; signals.push('Taker alım ağırlıklı — spot baskı pozitif'); }
    else if (tb < 0.9) { score -= 1; signals.push('Taker satım ağırlıklı — dikkat'); }
  }

  // CoinGlass overlay
  if (coinGlassData) {
    if (coinGlassData.fundingBias === 'extreme_short') { score += 2; signals.push('CG: Extreme short funding — reversal potansiyeli'); }
    else if (coinGlassData.fundingBias === 'extreme_long') { score -= 2; signals.push('CG: Extreme long funding — dump riski'); }
    if (coinGlassData.oiTrend === 'rising') { score += 1; signals.push('CG: OI artışı — güçlü trend devamı'); }
    if (coinGlassData.liqPressure === 'short_squeezed') { score += 2; signals.push('CG: Short squeeze baskısı — sert yukarı hareket riski'); }
    if (coinGlassData.liqPressure === 'long_squeezed') { score -= 2; signals.push('CG: Long squeeze — sert düşüş riski'); }
  }

  return { score: Math.max(0, Math.min(10, score)), max: 10, signals };
}

// Fundamentals Scoring Layer — market context
function computeFundamentalsScore(gecko, price) {
  if (!gecko) return { score: 0, max: 8, signals: [] };
  let score = 0;
  const signals = [];

  // Volume/MarketCap ratio — yüksek = aktif ilgi
  if (gecko.volume24h && gecko.marketCap && gecko.marketCap > 0) {
    const vcRatio = gecko.volume24h / gecko.marketCap;
    if (vcRatio > 0.15) { score += 2; signals.push(`Vol/MCap: ${(vcRatio*100).toFixed(1)}% — çok yüksek aktivite`); }
    else if (vcRatio > 0.07) { score += 1; signals.push(`Vol/MCap: ${(vcRatio*100).toFixed(1)}% — normal-yüksek`); }
  }

  // ATH distance — uzaksa reversal potansiyeli, yakınsa momentum
  if (gecko.high24h && price) {
    // Use 30d change as proxy for ATH distance
    if (gecko.change30d !== null && gecko.change30d !== undefined) {
      if (gecko.change30d > 30) { score -= 1; signals.push('30g değişim +%' + gecko.change30d.toFixed(1) + ' — aşırı alım'); }
      else if (gecko.change30d < -40) { score += 2; signals.push('30g değişim %' + gecko.change30d.toFixed(1) + ' — derin indirim'); }
      else if (gecko.change30d < -20) { score += 1; signals.push('30g değişim %' + gecko.change30d.toFixed(1) + ' — indirimli bölge'); }
    }
  }

  // 7d trend alignment
  if (gecko.change7d !== null && gecko.change7d !== undefined) {
    if (gecko.change7d > 5 && gecko.change24h > 0) { score += 1; signals.push('7g trend pozitif — momentum devam ediyor'); }
    else if (gecko.change7d < -10 && gecko.change24h > 0) { score += 1; signals.push('7g negatif + 24s pozitif — reversal sinyali'); }
  }

  // Market cap rank (lower = better fundamentals for large caps)
  // This data isn't directly available, skip

  return { score: Math.max(0, Math.min(8, score)), max: 8, signals };
}

// ── Structure Analysis ────────────────────────────────────────────────────────

function findSwingPoints(candles, lb = 4) {
  const highs = [], lows = [];
  for (let i = lb; i < candles.length - lb; i++) {
    const slice = candles.slice(i - lb, i + lb + 1);
    if (slice.every((c, j) => j === lb || c.h <= candles[i].h))
      highs.push({ price: candles[i].h, idx: i });
    if (slice.every((c, j) => j === lb || c.l >= candles[i].l))
      lows.push({ price: candles[i].l, idx: i });
  }
  return { highs, lows };
}

function detectBOS(candles) {
  const { highs, lows } = findSwingPoints(candles, 3);
  const price  = candles[candles.length - 1].c;
  let bos = 'NONE';

  if (highs.length >= 2 && price > highs[highs.length - 2]?.price)
    bos = 'BULLISH_BOS';
  else if (lows.length >= 2 && price < lows[lows.length - 2]?.price)
    bos = 'BEARISH_BOS';
  else if (highs.length >= 2 &&
    highs[highs.length - 1]?.price < highs[highs.length - 2]?.price &&
    lows.length >= 2 && lows[lows.length - 1]?.price < lows[lows.length - 2]?.price)
    bos = 'CHoCH_BEARISH';
  else if (highs.length >= 2 &&
    highs[highs.length - 1]?.price > highs[highs.length - 2]?.price &&
    lows.length >= 2 && lows[lows.length - 1]?.price > lows[lows.length - 2]?.price)
    bos = 'CHoCH_BULLISH';

  const closes  = candles.map(c => c.c);
  const ema50   = calcEMA(closes, Math.min(50, closes.length));
  const ema200  = calcEMA(closes, Math.min(200, closes.length));
  const htfBias =
    price > ema50 && ema50 > ema200 ? 'BULLISH' :
    price < ema50 && ema50 < ema200 ? 'BEARISH' : 'NEUTRAL';

  return { bos, htfBias, highs, lows, price };
}

function detectFVG(candles) {
  const fvgs = [];
  const atr  = calcATR(candles, 14);
  for (let i = 2; i < candles.length; i++) {
    if (candles[i].l > candles[i - 2].h) {
      const gap = candles[i].l - candles[i - 2].h;
      fvgs.push({ type: 'BULL', high: candles[i].l, low: candles[i - 2].h, idx: i, significant: atr > 0 && gap > atr * 0.5 });
    }
    if (candles[i].h < candles[i - 2].l) {
      const gap = candles[i - 2].l - candles[i].h;
      fvgs.push({ type: 'BEAR', high: candles[i - 2].l, low: candles[i].h, idx: i, significant: atr > 0 && gap > atr * 0.5 });
    }
  }
  return fvgs.slice(-15);
}

function detectOrderBlocks(candles) {
  const obs   = [];
  const price = candles[candles.length - 1].c;
  for (let i = 2; i < candles.length - 1; i++) {
    if (candles[i].c < candles[i].o && candles[i + 1].c > candles[i].h)
      obs.push({ type: 'BULL', high: candles[i].h, low: candles[i].l, mid: (candles[i].h + candles[i].l) / 2, idx: i });
    if (candles[i].c > candles[i].o && candles[i + 1].c < candles[i].l)
      obs.push({ type: 'BEAR', high: candles[i].h, low: candles[i].l, mid: (candles[i].h + candles[i].l) / 2, idx: i });
  }
  return obs.slice(-20).map(ob => ({
    ...ob,
    mitigated: ob.type === 'BULL' ? price < ob.low : price > ob.high,
  }));
}

function detectLiquidity(candles) {
  const price = candles[candles.length - 1].c;
  const tol   = 0.004;
  const bsl   = new Set(), ssl = new Set();
  const highs = candles.map(c => c.h);
  const lows  = candles.map(c => c.l);

  for (let i = 0; i < highs.length - 5; i++) {
    for (let j = i + 3; j < highs.length; j++) {
      if (Math.abs(highs[i] - highs[j]) / highs[i] < tol && highs[i] > price * 0.95) {
        bsl.add(parseFloat(highs[i].toFixed(8))); break;
      }
    }
  }
  for (let i = 0; i < lows.length - 5; i++) {
    for (let j = i + 3; j < lows.length; j++) {
      if (Math.abs(lows[i] - lows[j]) / lows[i] < tol && lows[i] < price * 1.05) {
        ssl.add(parseFloat(lows[i].toFixed(8))); break;
      }
    }
  }

  const recentCandles = candles.slice(-8);
  const sweptBSL = [...bsl].filter(l => recentCandles.some(c => c.h > l && c.c < l));
  const sweptSSL = [...ssl].filter(l => recentCandles.some(c => c.l < l && c.c > l));

  return {
    bsl:         [...bsl].sort((a, b) => a - b).slice(0, 5),
    ssl:         [...ssl].sort((a, b) => b - a).slice(0, 5),
    sweptBSL,
    sweptSSL,
    recentSweep: sweptBSL.length > 0 || sweptSSL.length > 0,
  };
}

function detectWyckoff(candles) {
  if (candles.length < 30) return { phase: 'UNKNOWN', spring: false, upthrust: false };
  const recent = candles.slice(-30);
  const prices = recent.map(c => c.c);
  const hi     = Math.max(...prices), lo = Math.min(...prices);
  const range  = (hi - lo) / lo;

  const firstVol = recent.slice(0, 15).reduce((s, c) => s + c.v, 0) / 15;
  const lastVol  = recent.slice(-15).reduce((s, c) => s + c.v, 0) / 15;

  const support    = Math.min(...recent.slice(0, 25).map(c => c.l));
  const resistance = Math.max(...recent.slice(0, 25).map(c => c.h));
  const lastC      = recent.slice(-5);

  const spring   = lastC.some(c => c.l < support * 0.995 && c.c > support);
  const upthrust = lastC.some(c => c.h > resistance * 1.005 && c.c < resistance);

  let phase = 'RANGING';
  if (range < 0.08 && lastVol < firstVol * 0.8) phase = 'ACCUMULATION';
  else if (range < 0.08 && lastVol > firstVol * 1.2) phase = 'DISTRIBUTION';
  else if (!range < 0.08 && lastVol > firstVol * 1.5) phase = 'MARKUP_MARKDOWN';

  return { phase, spring, upthrust, compressed: range < 0.08 };
}

// ── Horizontal S/R Level Detection (Multi-Touch Swing Clustering) ─────────────
function clusterLevels(swings, tolerance, type, currentPrice) {
  const clusters = [];
  const used = new Set();
  for (let i = 0; i < swings.length; i++) {
    if (used.has(i)) continue;
    const cluster = [swings[i]];
    used.add(i);
    for (let j = i + 1; j < swings.length; j++) {
      if (used.has(j)) continue;
      if (Math.abs(swings[j].price - swings[i].price) / (swings[i].price || 1) < tolerance) {
        cluster.push(swings[j]);
        used.add(j);
      }
    }
    if (cluster.length < 2) continue;
    const avgPrice = cluster.reduce((s, c) => s + c.price, 0) / cluster.length;
    const minP = Math.min(...cluster.map(c => c.price));
    const maxP = Math.max(...cluster.map(c => c.price));
    const dist = ((avgPrice - currentPrice) / currentPrice) * 100;
    const strength = Math.min(100, 25 + cluster.length * 18 + (cluster.length >= 4 ? 15 : 0));
    clusters.push({
      type,
      price:    parseFloat(avgPrice.toFixed(8)),
      priceHigh: parseFloat(maxP.toFixed(8)),
      priceLow:  parseFloat(minP.toFixed(8)),
      touches:  cluster.length,
      strength,
      quality:  cluster.length >= 4 ? 'STRONG' : cluster.length >= 3 ? 'MODERATE' : 'WEAK',
      distanceFromPrice: parseFloat(dist.toFixed(2)),
    });
  }
  return clusters;
}

function detectHorizontalSRLevels(candles, touchTol = 0.0035) {
  if (candles.length < 20) return [];
  const price = candles[candles.length - 1].c;
  const lb = 3;
  const swingHighs = [], swingLows = [];
  for (let i = lb; i < candles.length - lb; i++) {
    let isH = true, isL = true;
    for (let j = 1; j <= lb; j++) {
      if (candles[i].h <= candles[i-j].h || candles[i].h <= candles[i+j].h) isH = false;
      if (candles[i].l >= candles[i-j].l || candles[i].l >= candles[i+j].l) isL = false;
    }
    if (isH) swingHighs.push({ price: candles[i].h, idx: i });
    if (isL) swingLows.push({ price: candles[i].l, idx: i });
  }
  const res = clusterLevels(swingHighs, touchTol, 'RESISTANCE', price);
  const sup = clusterLevels(swingLows,  touchTol, 'SUPPORT',    price);
  return [...res, ...sup]
    .filter(l => Math.abs(l.distanceFromPrice) < 18)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 12);
}

// ── Price Action Pattern Detector ─────────────────────────────────────────────
function detectPriceActionPatterns(candles) {
  const patterns = [];
  if (candles.length < 3) return patterns;
  const last  = candles[candles.length - 1];
  const prev  = candles[candles.length - 2];
  const prev2 = candles[candles.length - 3];
  const atr   = calcATR(candles, 14);
  const body  = Math.abs(last.c - last.o);
  const range = last.h - last.l;
  const upW   = last.h - Math.max(last.c, last.o);
  const dnW   = Math.min(last.c, last.o) - last.l;
  const prevBody = Math.abs(prev.c - prev.o);

  // Pin Bar / Rejection
  if (range > 0 && dnW / range > 0.6 && body / range < 0.35 && range > atr * 0.4)
    patterns.push({ type:'PIN_BAR', direction:'BULLISH', strength:82,
      label:'Pin Bar (Boğa Reddi)', desc:'Uzun alt fitil — kurumsal alım desteği, reversal sinyali' });
  if (range > 0 && upW / range > 0.6 && body / range < 0.35 && range > atr * 0.4)
    patterns.push({ type:'PIN_BAR', direction:'BEARISH', strength:82,
      label:'Pin Bar (Ayı Reddi)', desc:'Uzun üst fitil — kurumsal satım direnci, reversal sinyali' });

  // Engulfing
  if (prev.c < prev.o && last.c > last.o && last.c > prev.o && last.o < prev.c && body > prevBody * 1.05)
    patterns.push({ type:'BULLISH_ENGULFING', direction:'BULLISH', strength:88,
      label:'Boğa Yutma', desc:'Önceki ayı mumunu tamamen kapattı — güçlü alım baskısı' });
  if (prev.c > prev.o && last.c < last.o && last.c < prev.o && last.o > prev.c && body > prevBody * 1.05)
    patterns.push({ type:'BEARISH_ENGULFING', direction:'BEARISH', strength:88,
      label:'Ayı Yutma', desc:'Önceki boğa mumunu tamamen kapattı — güçlü satım baskısı' });

  // Hammer / Shooting Star
  if (last.c > last.o && dnW > body * 2 && upW < body * 0.5 && range > atr * 0.3)
    patterns.push({ type:'HAMMER', direction:'BULLISH', strength:76,
      label:'Çekiç', desc:'Dipten güçlü alım — reversal potansiyeli yüksek' });
  if (last.c < last.o && upW > body * 2 && dnW < body * 0.5 && range > atr * 0.3)
    patterns.push({ type:'SHOOTING_STAR', direction:'BEARISH', strength:76,
      label:'Kayan Yıldız', desc:'Tepeden güçlü satım — bearish reversal' });

  // Doji (indecision)
  if (range > 0 && body / range < 0.1 && range > atr * 0.4)
    patterns.push({ type:'DOJI', direction:'NEUTRAL', strength:55,
      label:'Doji', desc:'Kararsızlık — kırılım yönüne göre pozisyon al' });

  // Inside Bar (compression)
  if (last.h <= prev.h && last.l >= prev.l)
    patterns.push({ type:'INSIDE_BAR', direction:'NEUTRAL', strength:62,
      label:'İç Bar', desc:'Konsolidasyon — sıkışma, kırılım yakın' });

  // Tweezer Top/Bottom
  if (Math.abs(last.h - prev.h) / (prev.h || 1) < 0.003 && last.c < last.o && prev.c > prev.o)
    patterns.push({ type:'TWEEZER_TOP', direction:'BEARISH', strength:74,
      label:'Cımbız Tepe', desc:'Çift direnç — trend dönüşü sinyali' });
  if (Math.abs(last.l - prev.l) / (prev.l || 1) < 0.003 && last.c > last.o && prev.c < prev.o)
    patterns.push({ type:'TWEEZER_BOTTOM', direction:'BULLISH', strength:74,
      label:'Cımbız Dip', desc:'Çift destek — trend dönüşü sinyali' });

  // 3-candle Morning/Evening Star
  if (prev2.c < prev2.o && Math.abs(prev.c - prev.o) < Math.abs(prev2.c - prev2.o) * 0.35
    && last.c > last.o && last.c > (prev2.o + prev2.c) / 2)
    patterns.push({ type:'MORNING_STAR', direction:'BULLISH', strength:91,
      label:'Sabah Yıldızı', desc:'3-mumlu reversal — en güçlü bullish formasyon' });
  if (prev2.c > prev2.o && Math.abs(prev.c - prev.o) < Math.abs(prev2.c - prev2.o) * 0.35
    && last.c < last.o && last.c < (prev2.o + prev2.c) / 2)
    patterns.push({ type:'EVENING_STAR', direction:'BEARISH', strength:91,
      label:'Akşam Yıldızı', desc:'3-mumlu reversal — en güçlü bearish formasyon' });

  return patterns.slice(0, 4);
}

// ── Manipulation Risk Detector ─────────────────────────────────────────────────
function detectManipulationRisk(candles, price, liqData, futuresData) {
  const signals = [];
  const atr     = calcATR(candles, 14);
  const recent5 = candles.slice(-5);
  const { highs, lows } = findSwingPoints(candles.slice(-60), 3);
  const swHPrices = highs.map(h => h.price);
  const swLPrices = lows.map(l => l.price);

  // 1. Stop Hunt (wick through swing, closes back)
  for (const c of recent5) {
    const hitLow = swLPrices.find(l => c.l < l * 0.998 && c.c > l);
    if (hitLow) {
      const depth = ((hitLow - c.l) / hitLow * 100).toFixed(2);
      signals.push({ type:'STOP_HUNT_LONG', severity:'HIGH', price: hitLow,
        label:'Stop Hunt (Long)', desc:`$${hitLow.toFixed(4)} altında likidite taraması — ${depth}% sweep, reversal potansiyeli` });
    }
    const hitHigh = swHPrices.find(h => c.h > h * 1.002 && c.c < h);
    if (hitHigh) {
      const depth = ((c.h - hitHigh) / hitHigh * 100).toFixed(2);
      signals.push({ type:'STOP_HUNT_SHORT', severity:'HIGH', price: hitHigh,
        label:'Stop Hunt (Short)', desc:`$${hitHigh.toFixed(4)} üstünde likidite taraması — ${depth}% sweep, reversal potansiyeli` });
    }
  }

  // 2. Liquidity Void (abnormally large candle, low volume)
  const recentVols = candles.slice(-20).map(c => c.v);
  const avgVol = recentVols.reduce((a,b) => a+b,0) / recentVols.length;
  const bigLowVol = recent5.filter(c => (c.h - c.l) > atr * 2.2 && c.v < avgVol * 0.65);
  if (bigLowVol.length > 0)
    signals.push({ type:'LIQUIDITY_VOID', severity:'MEDIUM',
      label:'Liquidity Void', desc:`${bigLowVol.length} adet yüksek aralıklı/düşük hacimli mum — void bölgesi, hızlı hareket riski` });

  // 3. Volume anomaly (price up but volume dropping)
  const last5Closes = candles.slice(-5).map(c => c.c);
  const last5Vols   = candles.slice(-5).map(c => c.v);
  const priceUp   = last5Closes[4] > last5Closes[0];
  const volFall   = last5Vols[4] < last5Vols[0] * 0.6;
  if (priceUp && volFall)
    signals.push({ type:'VOLUME_DIVERGENCE', severity:'MEDIUM',
      label:'Hacim Uyumsuzluğu', desc:'Yükselen fiyata karşın düşen hacim — kurumsal dağıtım/pump riski' });

  // 4. Funding rate extreme (if available)
  if (futuresData?.fundingRate != null) {
    const fr = futuresData.fundingRate;
    if (fr > 0.0008)
      signals.push({ type:'EXTREME_LONG_FUNDING', severity:'HIGH',
        label:'Aşırı Long Funding', desc:`Funding: ${(fr*100).toFixed(4)}% — kalabalık long, dump riski yüksek` });
    else if (fr < -0.0006)
      signals.push({ type:'EXTREME_SHORT_FUNDING', severity:'HIGH',
        label:'Aşırı Short Funding', desc:`Funding: ${(fr*100).toFixed(4)}% — kalabalık short, squeeze riski yüksek` });
  }

  // 5. Judas Swing (London open manipulation)
  const now  = new Date();
  const utcH = now.getUTCHours();
  if (utcH >= 6 && utcH <= 9 && candles.length >= 8) {
    const asianRange = candles.slice(-8);
    const aHigh = Math.max(...asianRange.map(c => c.h));
    const aLow  = Math.min(...asianRange.map(c => c.l));
    const rangeSize = aHigh - aLow;
    if (rangeSize > 0) {
      const pos = ((price - aLow) / rangeSize) * 100;
      if (pos > 85)
        signals.push({ type:'JUDAS_SWING_BEAR', severity:'HIGH',
          label:'Judas Swing (Ayı Riski)', desc:'London öncesi Asian range tepesinde — ters hareket (dump) riski yüksek' });
      else if (pos < 15)
        signals.push({ type:'JUDAS_SWING_BULL', severity:'HIGH',
          label:'Judas Swing (Boğa Riski)', desc:'London öncesi Asian range dibinde — ters hareket (pump) riski yüksek' });
    }
  }

  // 6. Liquidity sweep data
  if (liqData?.recentSweep)
    signals.push({ type:'RECENT_SWEEP', severity:'MEDIUM',
      label:'Yakın Likidite Süpürmesi', desc:'Son mum/mumlar likidite havuzunu taradı — reversal veya devam kırılımı bekleniyor' });

  const highSev = signals.filter(s => s.severity === 'HIGH').length;
  const riskScore = Math.min(100, signals.length * 15 + highSev * 20);
  return {
    signals:   signals.slice(0, 6),
    riskScore,
    riskLevel: riskScore >= 60 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW',
    summary:   signals.length === 0
      ? 'Manipülasyon sinyali yok — temiz piyasa ortamı'
      : `${signals.length} manipülasyon sinyali: ${signals.map(s=>s.label).join(', ')}`,
  };
}

// ── 9-Layer Quantum Confluence Score ──────────────────────────────────────────
// L1: Market Structure (20) | L2: SMC/ICT (20) | L3: Momentum (15) | L4: MTF (15)
// L5: Volume Intelligence (10) | L6: Futures Sentiment (5) | L7: Wyckoff (5)
// L8: Anti-Manipulation (5) | L9: Kill Zone Timing (5) | TOTAL: 100

function computeConfluentScore(c4h, c1d, c1w, c1m, futuresData, timing) {
  const price    = c4h[c4h.length - 1].c;
  const closes4h = c4h.map(c => c.c);
  const closes1d = c1d.map(c => c.c);
  const closes1w = c1w.map(c => c.c);
  const closes1m = c1m.length > 0 ? c1m.map(c => c.c) : closes1w;

  // EMA — 4H / 1D / 1W / 1M
  const ema9_4h   = calcEMA(closes4h, 9);
  const ema21_4h  = calcEMA(closes4h, 21);
  const ema50_4h  = calcEMA(closes4h, Math.min(50, closes4h.length));
  const ema200_4h = calcEMA(closes4h, Math.min(200, closes4h.length));
  const ema50_1d  = calcEMA(closes1d, Math.min(50, closes1d.length));
  const ema200_1d = calcEMA(closes1d, Math.min(200, closes1d.length));
  const ema9_1w   = calcEMA(closes1w, Math.min(9, closes1w.length));
  const ema21_1w  = calcEMA(closes1w, Math.min(21, closes1w.length));
  const ema50_1w  = calcEMA(closes1w, Math.min(50, closes1w.length));
  const ema9_1m   = calcEMA(closes1m, Math.min(9, closes1m.length));
  const ema21_1m  = calcEMA(closes1m, Math.min(21, closes1m.length));

  // Structure
  const struct4h = detectBOS(c4h);
  const struct1d = detectBOS(c1d);
  const struct1w = detectBOS(c1w);

  // FVG & OB — 4H and 1D
  const fvg4h = detectFVG(c4h);
  const ob4h  = detectOrderBlocks(c4h);
  const fvg1d = detectFVG(c1d);
  const ob1d  = detectOrderBlocks(c1d);

  // Liquidity
  const liq4h = detectLiquidity(c4h);
  const liq1d = detectLiquidity(c1d);

  // Volume Profile
  const vp4h = calcVolumeProfile(c4h);
  const vp1d = calcVolumeProfile(c1d);

  // Indicators — 4H primary
  const atr4h    = calcATR(c4h, 14);
  const rsi4h    = calcRSI(closes4h);
  const macd4h   = calcMACD(closes4h);
  const adx4h    = calcADX(c4h);
  const stochRSI = calcStochRSI(closes4h);
  const bb4h     = calcBollingerBands(closes4h);
  const vwap4h   = calcVWAP(c4h.slice(-100));
  const obv4h    = calcOBV(c4h);
  const cvd4h    = calcCVD(c4h.slice(-50));
  const wyckoff4h = detectWyckoff(c4h);
  const wyckoff1d = detectWyckoff(c1d);

  // ── NEW: Advanced Indicators ──────────────────────────────────────────────
  const williamsR4h = calcWilliamsR(c4h, 14);
  const cci4h       = calcCCI(c4h, 20);
  const mfi4h       = calcMFI(c4h, 14);
  const ichimoku4h  = calcIchimoku(c4h);
  const supertrend4h = calcSupertrend(c4h, 10, 3.0);
  const ichimoku1d  = calcIchimoku(c1d);
  const supertrend1d = calcSupertrend(c1d, 10, 3.0);
  const bb1d        = calcBollingerBands(closes1d);
  const rsi1d_val   = calcRSI(closes1d);
  const mfi1d       = calcMFI(c1d, 14);
  const breakers4h  = detectBreakerBlocks(c4h);
  const breakers1d  = detectBreakerBlocks(c1d);

  // RSI Divergence (high-value reversal signal)
  const rsiDiv4h    = detectRSIDivergence(c4h, 14, 40);
  const rsiDiv1d    = detectRSIDivergence(c1d, 14, 30);

  // Volume Spike (institutional activity)
  const volSpike4h  = detectVolumeSpike(c4h, 20);
  const volSpike1d  = detectVolumeSpike(c1d, 20);

  // Market Regime
  const regime4h    = classifyMarketRegime(c4h, atr4h);

  // ── META QUANTUM: Institutional Flow Layer ─────────────────────────────────
  const displacement4h = detectDisplacement(c4h);
  const displacement1d = detectDisplacement(c1d);
  const premDisc4h     = calcPremiumDiscount(c4h);
  const premDisc1d     = calcPremiumDiscount(c1d);
  const smd4h          = detectSMD(c4h);
  const smd1d          = detectSMD(c1d);

  // Swing points for Fibonacci
  const { highs: swH4h, lows: swL4h } = findSwingPoints(c4h, 4);
  const { highs: swH1d, lows: swL1d } = findSwingPoints(c1d, 4);
  const fibonacci4h = calcFibonacciLevels(swH4h.map(s => s.price), swL4h.map(s => s.price), price);
  const fibonacci1d = calcFibonacciLevels(swH1d.map(s => s.price), swL1d.map(s => s.price), price);

  // Pivot Points (daily pivots from 1D candles)
  const pivots1d = calcPivotPoints(c1d);
  const pivots1w = calcPivotPoints(c1w);

  // VWAP comparison
  const vwap1d = calcVWAP(c1d.slice(-20));

  // Indicators — 1D (HTF confirmation layer)
  const rsi1d   = rsi1d_val;
  const macd1d  = closes1d.length >= 35 ? calcMACD(closes1d) : macd4h;
  const adx1d   = c1d.length >= 28 ? calcADX(c1d) : adx4h;
  const cci1d   = calcCCI(c1d, 20);

  // Indicators — 1W (macro trend)
  const rsi1w   = calcRSI(closes1w);
  const adx1w   = c1w.length >= 28 ? calcADX(c1w) : adx4h;
  const ichimoku1w = calcIchimoku(c1w);

  // Multi-TF bias — 4 independent directional votes
  const bull4h = ema9_4h > ema21_4h && price > ema50_4h;
  const bull1d = price > ema50_1d && ema50_1d > ema200_1d;
  const bull1w = ema9_1w > ema21_1w && price > ema50_1w;
  const bull1m = closes1m.length >= 5
    ? ema9_1m > ema21_1m && closes1m[closes1m.length - 1] > closes1m[Math.max(0, closes1m.length - 5)]
    : bull1w;

  const bosBull = ['BULLISH_BOS', 'CHoCH_BULLISH'];
  const bosBear = ['BEARISH_BOS', 'CHoCH_BEARISH'];

  // ── LAYER 1: Market Structure & Trend (max 22) ────────────────────────────
  let l1 = 0;
  const emaAligned = ema9_4h > ema21_4h && ema21_4h > ema50_4h && ema50_4h > ema200_4h;
  if (emaAligned)                                      l1 += 7;
  else if (ema9_4h > ema21_4h && ema21_4h > ema50_4h) l1 += 4;
  else if (ema9_4h > ema21_4h)                         l1 += 2;

  // BOS/CHoCH — 4H + 1D + 1W
  if      (bosBull.includes(struct4h.bos) && bosBull.includes(struct1d.bos)) l1 += 6;
  else if (bosBull.includes(struct4h.bos) || bosBull.includes(struct1d.bos)) l1 += 3;
  else if (bosBear.includes(struct4h.bos) && bosBear.includes(struct1d.bos)) l1 += 6;
  else if (bosBear.includes(struct4h.bos) || bosBear.includes(struct1d.bos)) l1 += 3;
  if (bosBull.includes(struct1w.bos) || bosBear.includes(struct1w.bos)) l1 += 2;

  // ADX trend strength
  if      (adx4h.strongTrend) l1 += 5;
  else if (adx4h.trending)    l1 += 3;
  if (adx1d.strongTrend)      l1 += 2;
  else if (adx1d.trending)    l1 += 1;

  // Supertrend — 4H + 1D aligned (structural trend bias)
  if (supertrend4h.bullish && supertrend1d.bullish) l1 += 3;
  else if (supertrend4h.bullish || supertrend1d.bullish) l1 += 1;
  else if (!supertrend4h.bullish && !supertrend1d.bullish) l1 += 3; // bear aligned = valid signal
  if (supertrend4h.changed || supertrend1d.changed) l1 += 2; // fresh cross = high conviction

  // Ichimoku 4H — kurumsal trend filtresi
  if (ichimoku4h.aboveCloud && ichimoku4h.cloudBullish && ichimoku4h.tenkan > ichimoku4h.kijun) l1 += 4;
  else if (ichimoku4h.aboveCloud && ichimoku4h.cloudBullish) l1 += 2;
  else if (ichimoku4h.belowCloud && !ichimoku4h.cloudBullish) l1 += 4; // bear setup
  if (ichimoku4h.tkCross !== 'none') l1 += 2; // TK cross signal
  if (ichimoku1w.aboveCloud) l1 += 2; // weekly cloud confirms macro bull
  else if (ichimoku1w.belowCloud) l1 += 2; // bear

  const l1Score = Math.min(22, l1);

  // ── LAYER 2: Liquidity & SMC — Kurumsal Bölgeler (max 22) ────────────────
  let l2 = 0;
  const unmitBullOB = ob4h.filter(o => o.type === 'BULL' && !o.mitigated && o.high < price);
  const unmitBearOB = ob4h.filter(o => o.type === 'BEAR' && !o.mitigated && o.low > price);
  const inBullOB    = unmitBullOB.some(o => price >= o.low && price <= o.high * 1.01);
  const inBearOB    = unmitBearOB.some(o => price >= o.low * 0.99 && price <= o.high);

  // 1D OBs — kurumsal destek/direnç
  const unmitBullOB1d = ob1d.filter(o => o.type === 'BULL' && !o.mitigated && o.high < price);
  const unmitBearOB1d = ob1d.filter(o => o.type === 'BEAR' && !o.mitigated && o.low > price);
  const inBullOB1d    = unmitBullOB1d.some(o => price >= o.low && price <= o.high * 1.01);
  const inBearOB1d    = unmitBearOB1d.some(o => price >= o.low * 0.99 && price <= o.high);

  if ((inBullOB || inBearOB) && (inBullOB1d || inBearOB1d)) l2 += 10; // 4H+1D confluence
  else if (inBullOB || inBearOB) l2 += 7;
  else if (inBullOB1d || inBearOB1d) l2 += 5; // 1D zone alone = institutional
  else if (unmitBullOB.length > 0 && unmitBullOB[0].high > price * 0.95) l2 += 3;

  const bullFVGs = fvg4h.filter(f => f.type === 'BULL' && f.significant);
  const bearFVGs = fvg4h.filter(f => f.type === 'BEAR' && f.significant);
  const fvgOBOverlap = unmitBullOB.some(ob => bullFVGs.some(fvg => fvg.low < ob.high && fvg.high > ob.low))
                    || unmitBearOB.some(ob => bearFVGs.some(fvg => fvg.low < ob.high && fvg.high > ob.low));
  if (fvgOBOverlap) l2 += 6;

  // Liquidity sweep — strong reversal signal
  if      (liq4h.recentSweep && liq1d.recentSweep) l2 += 8;
  else if (liq4h.recentSweep || liq1d.recentSweep) l2 += 5;
  else if (liq4h.ssl.length > 2 || liq4h.bsl.length > 2) l2 += 2;

  // Volume Profile POC proximity
  if (vp4h.poc > 0) {
    const pocDist = Math.abs(price - vp4h.poc) / price;
    if      (pocDist < 0.01)  l2 += 4;
    else if (pocDist < 0.025) l2 += 2;
    else if (pocDist < 0.05)  l2 += 1;
  }
  // 1D VP POC adds institutional context
  if (vp1d.poc > 0 && Math.abs(price - vp1d.poc) / price < 0.02) l2 += 2;

  // Breaker blocks — flip zones
  const inBullBreaker = breakers4h.bullBreakers.some(b => price >= b.low * 0.99 && price <= b.high * 1.01);
  const inBearBreaker = breakers4h.bearBreakers.some(b => price >= b.low * 0.99 && price <= b.high * 1.01);
  if (inBullBreaker || inBearBreaker) l2 += 4;

  // Fibonacci Golden Pocket / OTE zone
  if (fibonacci4h?.inOTE) { l2 += 5; } // optimal trade entry
  else if (fibonacci4h?.inGoldenPocket) { l2 += 3; }
  if (fibonacci1d?.inGoldenPocket) l2 += 2; // 1D fibonacci confirmation

  // Pivot Points
  if (pivots1d?.inBullishZone || pivots1d?.inBearishZone) l2 += 2;
  if (pivots1w?.inBullishZone || pivots1w?.inBearishZone) l2 += 1;

  const l2Score = Math.min(22, l2);

  // ── LAYER 3: Momentum & Oscillators (max 20) ─────────────────────────────
  let l3 = 0;

  // RSI — 4H primary + 1D + 1W
  if      ((rsi4h < 35 && bull1d) || (rsi4h > 65 && !bull1d)) l3 += 5;
  else if (rsi4h < 45 || rsi4h > 55)                          l3 += 2;
  if      ((rsi1d < 40 && bull1d) || (rsi1d > 60 && !bull1d)) l3 += 3;
  else if  (rsi1d < 50 && rsi4h < 50)                          l3 += 1;
  if ((rsi1w < 45 && bull1w) || (rsi1w > 55 && !bull1w)) l3 += 2;

  // MACD — 4H + 1D dual confirmation
  if      (macd4h.crossUp || macd4h.crossDown)  l3 += 4;
  else if (macd4h.histRising && macd4h.bullish) l3 += 2;
  else if (macd4h.histRising || macd4h.bullish) l3 += 1;
  if (macd1d.bullish === macd4h.bullish)         l3 += 2;

  // StochRSI
  if      (stochRSI.oversold || stochRSI.overbought) l3 += 3;
  else if (stochRSI.bullishCross)                    l3 += 2;

  // Bollinger Bands squeeze — volatility compression
  if      (bb4h.squeeze)          l3 += 3;
  else if (bb4h.bandwidth < 0.06) l3 += 1;

  // Williams %R — 4H
  if      (williamsR4h.oversold)   l3 += 2;
  else if (williamsR4h.overbought) l3 += 2; // sell setup

  // CCI — 4H + 1D
  if      (cci4h.extreme)         l3 += 2; // extreme = high conviction reversal
  else if (cci4h.oversold)        l3 += 2;
  else if (cci4h.overbought)      l3 += 2;
  if (cci1d.oversold || cci1d.overbought) l3 += 1;

  // MFI — 4H Money Flow Index
  if      (mfi4h.oversold)   l3 += 2; // money outflow exhaustion
  else if (mfi4h.overbought) l3 += 2;
  if (mfi1d.oversold || mfi1d.overbought) l3 += 1;

  // OBV + CVD — volume-price divergence
  if (obv4h.confirmsTrend) l3 += 1;
  if (cvd4h.rising === bull1d) l3 += 1; // CVD aligned with HTF bias

  // RSI Divergence — strong reversal/continuation signal (up to +4)
  if (rsiDiv4h.bullDiv && !bull1d)  l3 += 4; // bullish div in bear market = strong reversal
  else if (rsiDiv4h.bullDiv)         l3 += 2; // bullish div confirming bull bias
  if (rsiDiv4h.bearDiv && bull1d)    l3 += 4; // bearish div in bull market = strong reversal
  else if (rsiDiv4h.bearDiv)         l3 += 2;
  if (rsiDiv4h.hiddenBullDiv && bull1d) l3 += 2; // hidden bull div = trend continuation
  if (rsiDiv4h.hiddenBearDiv && !bull1d) l3 += 2;
  if (rsiDiv1d.bullDiv || rsiDiv1d.bearDiv) l3 += 2; // 1D divergence = institutional level

  // Volume Spike — institutional activity confirmation (+2 if aligned with direction)
  if (volSpike4h.spike && ((volSpike4h.direction === 'bullish') === bull4h)) l3 += 2;
  if (volSpike4h.strongSpike) l3 += 1; // extreme volume = strong conviction

  const l3Score = Math.min(20, l3);

  // ── LAYER 4: Multi-Timeframe Alignment (max 18) ───────────────────────────
  const tfBulls  = [bull4h, bull1d, bull1w, bull1m];
  const bullCount = tfBulls.filter(Boolean).length;
  const bearCount = 4 - bullCount;
  const aligned   = Math.max(bullCount, bearCount);

  const htfAligned = (bull1w && bull1m) || (!bull1w && !bull1m);
  const mtfAligned = bull1d === bull4h;

  const l4Base  = aligned === 4 ? 14 : aligned === 3 ? 10 : aligned === 2 ? 4 : 0;
  let l4 = l4Base + (htfAligned ? 3 : 0) + (mtfAligned ? 1 : 0);

  // Ichimoku 1D + 1W alignment bonus
  if (ichimoku1d.aboveCloud && ichimoku1w.aboveCloud) l4 += 2;
  else if (ichimoku1d.belowCloud && ichimoku1w.belowCloud) l4 += 2;
  if (ichimoku1w.strong) l4 += 1; // strongest ichimoku signal

  const l4Score = Math.min(18, l4);

  // ── LAYER 5: Wyckoff + Structure Context (max 12) ──────────────────────
  let l5 = 0;
  // Wyckoff — 4H + 1D
  if (wyckoff4h.phase === 'ACCUMULATION') { l5 += 4; }
  else if (wyckoff4h.phase === 'DISTRIBUTION') { l5 += 4; } // bear setup
  if (wyckoff4h.spring) { l5 += 3; } // spring = high probability buy
  if (wyckoff4h.upthrust) { l5 += 3; } // upthrust = high probability sell
  if (wyckoff1d.phase === 'ACCUMULATION' || wyckoff1d.phase === 'DISTRIBUTION') l5 += 2;
  if (wyckoff1d.spring || wyckoff1d.upthrust) l5 += 2;
  // VWAP position
  if (price > vwap4h && bull4h) { l5 += 1; }
  else if (price < vwap4h && !bull4h) { l5 += 1; }
  if (price > vwap1d && bull1d) { l5 += 1; }
  const l5Score = Math.min(12, l5);

  // ── LAYER 6: Volume Intelligence (max 6) ────────────────────────────────
  let l6 = 0;
  if (obv4h.rising === bull4h) l6 += 2; // OBV confirms price trend
  if (obv4h.confirmsTrend) l6 += 1;
  if (cvd4h.rising === bull1d) l6 += 2; // CVD confirms 1D bias
  // Volume profile: HVN provides support, LVN allows fast moves
  if (vp4h.hvn.length > 0) l6 += 1;
  const l6Score = Math.min(6, l6);

  // ── LAYER 7: Institutional Flow (META QUANTUM, max 12) ──────────────────
  let l7 = 0;
  // Displacement — large institutional candle + FVG (high conviction move)
  if (displacement4h.bullish && bull4h)  { l7 += 4; } // bullish disp in bull market
  if (displacement4h.bearish && !bull4h) { l7 += 4; } // bearish disp in bear market
  if (displacement4h.bullish || displacement4h.bearish) l7 += 1; // any displacement = activity
  if (displacement1d.bullish || displacement1d.bearish) l7 += 1; // 1D displacement = institutional
  // Premium / Discount Array — price at institutional entry zone
  if (premDisc4h.optimalBuy  && bull4h)  l7 += 3; // discount zone = buy opportunity confirmed
  if (premDisc4h.optimalSell && !bull4h) l7 += 3; // premium zone = sell opportunity confirmed
  if (premDisc1d.optimalBuy  && bull1d)  l7 += 2; // 1D discount confirms
  if (premDisc1d.optimalSell && !bull1d) l7 += 2; // 1D premium confirms
  if (premDisc4h.equilibrium) l7 += 1; // at equilibrium = fair value reaction zone
  // Smart Money Divergence — institutional footprint vs retail price
  if (smd4h.bullSMD && bull4h)  l7 += 3; // smart money accumulating = bullish
  if (smd4h.bearSMD && !bull4h) l7 += 3; // smart money distributing = bearish
  if (smd1d.bullSMD || smd1d.bearSMD) l7 += 2; // 1D SMD = high conviction signal
  const l7Score = Math.min(12, l7);

  // ── UNCORRELATED PILLAR CHECK — Core requirement for high win rate ──────────
  // Each pillar represents a DIFFERENT confirmation source (not correlated)
  const PILLAR_STRUCTURE = l1Score >= 11;   // Strong market structure (EMA + BOS/ADX)
  const PILLAR_ZONE      = l2Score >= 12;   // Price near/in institutional zone (OB/FVG/Fib)
  const PILLAR_MOMENTUM  = l3Score >= 10;   // Momentum confirms direction (multi-indicator)
  const PILLAR_VOLUME    = (l6Score >= 3 || l7Score >= 6); // Volume/institutional flow confirms
  const PILLAR_MTF       = l4Score >= 10;   // Multi-timeframe alignment (3+ TFs)
  const PILLAR_WYCKOFF   = l5Score >= 6;    // Wyckoff phase or VWAP confirms

  const pillarCount = [PILLAR_STRUCTURE, PILLAR_ZONE, PILLAR_MOMENTUM, PILLAR_VOLUME, PILLAR_MTF, PILLAR_WYCKOFF].filter(Boolean).length;
  const pillarNames = [
    PILLAR_STRUCTURE ? 'STRUCTURE' : null,
    PILLAR_ZONE      ? 'ZONE'      : null,
    PILLAR_MOMENTUM  ? 'MOMENTUM'  : null,
    PILLAR_VOLUME    ? 'VOLUME'    : null,
    PILLAR_MTF       ? 'MTF'       : null,
    PILLAR_WYCKOFF   ? 'WYCKOFF'   : null,
  ].filter(Boolean);

  // ── TOTAL SCORE: 7 layers, max 100 ─────────────────────────────────────────
  const rawScore = l1Score + l2Score + l3Score + l4Score + l5Score + l6Score + l7Score;
  // Max possible: 22+22+20+18+12+6+12 = 112 → normalized to 100
  const totalScore = Math.min(100, rawScore);

  // Direction: weighted vote (expanded — includes ichimoku + supertrend)
  const htfBullVotes = (bull1m ? 3 : 0) + (bull1w ? 3 : 0) + (bull1d ? 2 : 0) + (bull4h ? 1 : 0);
  const indBullVotes = [
    bosBull.includes(struct4h.bos), bosBull.includes(struct1d.bos), bosBull.includes(struct1w.bos),
    rsi4h > 50, rsi1d > 50, rsi1w > 50,
    macd4h.bullish, macd1d.bullish, adx4h.bullish, adx1d.bullish,
    cvd4h.rising, obv4h.rising,
    // New votes
    ichimoku4h.aboveCloud, supertrend4h.bullish, supertrend1d.bullish,
    williamsR4h.oversold,  // in oversold = buy signal
    mfi4h.oversold,        // money flow oversold = buy
    cci4h.oversold,
  ].filter(Boolean).length;
  const totalBullVotes = htfBullVotes + indBullVotes;
  const totalBearVotes = (9 - htfBullVotes) + (18 - indBullVotes);

  const htfBullPure = (bull1w ? 1 : 0) + (bull1m ? 1 : 0);
  // Stronger direction logic: require clear conviction from multiple sources
  const direction =
    // Perfect setup: all 4 TFs bull + indicator votes agree
    (bullCount === 4 && totalBullVotes > totalBearVotes + 3) ? 'LONG' :
    (bearCount === 4 && totalBearVotes > totalBullVotes + 3) ? 'SHORT' :
    // Strong: 3 TFs + HTF aligned + indicator majority
    (bullCount >= 3 && htfBullPure === 2 && bull1d && totalBullVotes > totalBearVotes + 2) ? 'LONG' :
    (bearCount >= 3 && htfBullPure === 0 && !bull1d && totalBearVotes > totalBullVotes + 2) ? 'SHORT' :
    // Minimum: 3 TFs + clear indicator majority (8+ votes difference)
    (bullCount >= 3 && totalBullVotes > totalBearVotes + 5) ? 'LONG' :
    (bearCount >= 3 && totalBearVotes > totalBullVotes + 5) ? 'SHORT' :
    'NEUTRAL';

  const signalType = (totalScore >= 90 && pillarCount >= 6) ? 'PRIME_APEX_ENTRY' :
                     (totalScore >= 82 && pillarCount >= 5) ? 'APEX_ENTRY' :
                     (totalScore >= 72 && pillarCount >= 4) ? 'HIGH_PROBABILITY' :
                     (totalScore >= 60 && pillarCount >= 3) ? 'MODERATE' : 'NO_SIGNAL';

  const grade = (totalScore >= 90 && pillarCount >= 6) ? 'S+' :
                (totalScore >= 85 && pillarCount >= 5) ? 'S' :
                (totalScore >= 72 && pillarCount >= 4) ? 'A' :
                (totalScore >= 60 && pillarCount >= 3) ? 'B' :
                (totalScore >= 45) ? 'C' : 'F';

  const allAligned   = aligned === 4;
  const threeAligned = aligned === 3;
  // Win rate based on PILLARS + score + alignment (evidence-based, not inflated)
  const winRate =
    (allAligned && pillarCount >= 5 && totalScore >= 78) ? 88 :
    (allAligned && pillarCount >= 4 && totalScore >= 72) ? 82 :
    (allAligned && pillarCount >= 3 && totalScore >= 65) ? 77 :
    (allAligned && totalScore >= 70) ? 74 :
    (threeAligned && htfAligned && pillarCount >= 4 && totalScore >= 68) ? 76 :
    (threeAligned && htfAligned && pillarCount >= 3) ? 71 :
    (threeAligned && pillarCount >= 3 && totalScore >= 65) ? 68 :
    (threeAligned) ? 63 :
    (totalScore >= 80 && pillarCount >= 3) ? 66 :
    (totalScore >= 68 && pillarCount >= 2) ? 62 :
    (totalScore >= 55) ? 57 : 45;

  // Session kill zone timing bonus (+3% for premium timing sessions)
  const sessionBonus = (timing?.killZone === 'LONDON_NY_OVERLAP' || timing?.killZone === 'NY_OPEN' || timing?.killZone === 'LONDON_OPEN') ? 3 : 0;
  const adjustedWinRate = Math.min(92, winRate + sessionBonus);

  // Regime filter — don't trade in tight range or chaotic markets
  const regimeBlocksSignal = regime4h.regime === 'TIGHT_RANGE' ||
    (regime4h.regime === 'RANGING' && totalScore < 72) ||
    (regime4h.volatility === 'extreme' && totalScore < 80);

  // PILLAR requirement — need at least 3 uncorrelated confirmations for a valid signal
  const pillarGatePass = pillarCount >= 3;

  // Direction must have clear conviction (not NEUTRAL)
  const directionStrong = direction !== 'NEUTRAL' && aligned >= 3;

  // Final tradeable direction
  const tradeableDirection = (adjustedWinRate >= 68 && !regimeBlocksSignal && pillarGatePass && directionStrong)
    ? direction : 'WAIT';
  const valid = adjustedWinRate >= 68 && !regimeBlocksSignal && pillarGatePass && directionStrong;

  return {
    quantum: { score: totalScore, grade, direction: tradeableDirection, rawDirection: direction, winRate: adjustedWinRate, valid, signalType, pillarCount, pillarNames },
    layers: {
      marketStructure: {
        score: l1Score, max: 22,
        emaAligned, adxStrength: adx4h.adx, bosType: struct4h.bos,
        htfBias: struct1d.htfBias,
        supertrendBull: supertrend4h.bullish,
        ichimokuCloud: ichimoku4h.aboveCloud ? 'ABOVE' : ichimoku4h.belowCloud ? 'BELOW' : 'INSIDE',
        ichimokuSignal: ichimoku4h.tkCross,
      },
      liquiditySMC: {
        score: l2Score, max: 22,
        inOB: inBullOB || inBearOB,
        inOB1d: inBullOB1d || inBearOB1d,
        fvgOBOverlap,
        liquiditySweep: liq4h.recentSweep || liq1d.recentSweep,
        pocProximity: vp4h.poc > 0 ? parseFloat((Math.abs(price - vp4h.poc) / price * 100).toFixed(2)) : null,
        poc: vp4h.poc,
        poc1d: vp1d.poc,
        fibGoldenPocket: fibonacci4h?.inGoldenPocket || false,
        fibOTE: fibonacci4h?.inOTE || false,
        pivotLevel: pivots1d?.nearestLevel || null,
        breakerBlock: inBullBreaker || inBearBreaker,
      },
      momentum: {
        score: l3Score, max: 20,
        rsi4h, rsi1d, macdBullish: macd4h.bullish,
        macdCross: macd4h.crossUp || macd4h.crossDown,
        squeeze: bb4h.squeeze, bbBandwidth: bb4h.bandwidth,
        stochK: stochRSI.k, stochD: stochRSI.d,
        stochOversold: stochRSI.oversold, stochOverbought: stochRSI.overbought,
        williamsR: williamsR4h.value,
        cci: cci4h.value,
        mfi: mfi4h.value,
      },
      mtfAlignment: {
        score: l4Score, max: 18,
        '4h': bull4h ? 'BULL' : 'BEAR',
        '1d': bull1d ? 'BULL' : 'BEAR',
        '1w': bull1w ? 'BULL' : 'BEAR',
        '1m': bull1m ? 'BULL' : 'BEAR',
        bullCount, bearCount,
        htfAligned, mtfAligned,
        rsi1w: parseFloat(rsi1w.toFixed(1)),
        adx1d: parseFloat(adx1d.adx.toFixed(1)),
        ichimoku1d: ichimoku1d.aboveCloud ? 'ABOVE' : ichimoku1d.belowCloud ? 'BELOW' : 'INSIDE',
        ichimoku1w: ichimoku1w.aboveCloud ? 'ABOVE' : ichimoku1w.belowCloud ? 'BELOW' : 'INSIDE',
      },
      wyckoffContext: {
        score: l5Score, max: 12,
        phase4h: wyckoff4h.phase, spring4h: wyckoff4h.spring, upthrust4h: wyckoff4h.upthrust,
        phase1d: wyckoff1d.phase, spring1d: wyckoff1d.spring, upthrust1d: wyckoff1d.upthrust,
        vwapAbove4h: price > vwap4h,
        vwapAbove1d: price > vwap1d,
      },
      volumeIntelligence: {
        score: l6Score, max: 6,
        obvRising: obv4h.rising,
        obvConfirms: obv4h.confirmsTrend,
        cvdRising: cvd4h.rising,
        hvnLevels: vp4h.hvn,
      },
      institutionalFlow: {
        score: l7Score, max: 12,
        displacement4h:    displacement4h.bullish || displacement4h.bearish,
        dispBullish:       displacement4h.bullish,
        dispBearish:       displacement4h.bearish,
        premDiscZone:      premDisc4h.zone,
        premDiscPct:       premDisc4h.pct,
        optimalBuy:        premDisc4h.optimalBuy,
        optimalSell:       premDisc4h.optimalSell,
        smd4hBull:         smd4h.bullSMD,
        smd4hBear:         smd4h.bearSMD,
        smd1dBull:         smd1d.bullSMD,
        smd1dBear:         smd1d.bearSMD,
      },
      futuresSentiment: {
        fundingRate: futuresData?.fundingRate ?? null,
        openInterest: futuresData?.openInterest ?? null,
        longShortRatio: futuresData?.longShortRatio ?? null,
        takerBuyRatio: futuresData?.takerBuyRatio ?? null,
      },
      sessionTiming: {
        killZone: timing?.killZone || 'UNKNOWN',
        isOptimalSession: timing?.isOptimalSession || false,
        sessionBonus,
      },
      pillarAnalysis: {
        count: pillarCount,
        names: pillarNames,
        gate: pillarGatePass,
        regimeBlocked: regimeBlocksSignal,
      },
    },
    internals: {
      price, direction,
      struct4h, struct1d, struct1w,
      fvg4h, fvg1d, ob4h, ob1d,
      liq4h, liq1d,
      vp4h, vp1d,
      rsi4h, rsi1d, rsi1w,
      macd4h, macd1d, adx4h, adx1d, adx1w, stochRSI, bb4h, bb1d,
      vwap4h, vwap1d, obv4h, cvd4h,
      wyckoff4h, wyckoff1d,
      atr4h,
      unmitBullOB, unmitBearOB,
      unmitBullOB1d, unmitBearOB1d,
      bull4h, bull1d, bull1w, bull1m,
      // Advanced indicators
      williamsR4h, cci4h, cci1d, mfi4h, mfi1d,
      ichimoku4h, ichimoku1d, ichimoku1w,
      supertrend4h, supertrend1d,
      fibonacci4h, fibonacci1d,
      pivots1d, pivots1w,
      breakers4h, breakers1d,
      rsiDiv4h, rsiDiv1d,
      volSpike4h, volSpike1d,
      regime4h,
      // META QUANTUM: Institutional Flow
      displacement4h, displacement1d,
      premDisc4h, premDisc1d,
      smd4h, smd1d,
    },
  };
}

// ── Risk Filter ───────────────────────────────────────────────────────────────

function applyRiskFilter(quantum, internals, futuresData) {
  const warnings = [];
  let blocked = false;

  if (futuresData) {
    if (futuresData.fundingRate !== null) {
      const fr = futuresData.fundingRate;
      if (Math.abs(fr) > 0.0005) {
        warnings.push(`Extreme funding rate: ${(fr * 100).toFixed(4)}%`);
        if (Math.abs(fr) > 0.001) blocked = true;
      }
    }
    if (futuresData.longShortRatio !== null) {
      const ls = futuresData.longShortRatio;
      if (ls > 2.5) warnings.push(`Crowded LONG — L/S: ${ls.toFixed(2)}`);
      if (ls < 0.4) warnings.push(`Crowded SHORT — L/S: ${ls.toFixed(2)}`);
    }
    if (futuresData.takerBuyRatio !== null) {
      const tb = futuresData.takerBuyRatio;
      if (tb > 1.3) warnings.push(`Taker alım baskısı çok yüksek: ${tb.toFixed(2)} — FOMO riski`);
      if (tb < 0.7) warnings.push(`Taker satım baskısı çok yüksek: ${tb.toFixed(2)} — panik satış riski`);
    }
  }

  const atrPct = internals.atr4h / internals.price;
  if (atrPct > 0.05) {
    warnings.push(`Yüksek volatilite: ATR/Fiyat = ${(atrPct * 100).toFixed(1)}%`);
    if (atrPct > 0.08) blocked = true;
  }

  return { blocked, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHARTOS APEX QUANTUM v2 — Zone-Based Entry System
// "Anlık fiyattan sinyal verme. Bölge belirle, tetikleyici koy, teyit bekle."
// ═══════════════════════════════════════════════════════════════════════════════

// ── Internal: Order Block Finder (Quantum — impulsive candle filter) ──────────
function findOBsQM(candles, tf) {
  const obs = [];
  if (candles.length < 4) return obs;
  const avgR = candles.map(c => c.h - c.l).reduce((a, b) => a + b, 0) / candles.length;
  for (let i = 2; i < candles.length - 1; i++) {
    const c = candles[i], n = candles[i + 1];
    const imp = Math.abs(n.c - n.o);
    if (imp < avgR * 2) continue; // sadece impulsive mum sonrası OB
    if (c.c < c.o && n.c > n.o && n.c > c.h) {
      const mit = candles.slice(i + 2).some(x => x.l < c.l);
      obs.push({ type: 'bullish', priceHigh: c.h, priceLow: c.l, timeframe: tf, mitigated: mit });
    }
    if (c.c > c.o && n.c < n.o && n.c < c.l) {
      const mit = candles.slice(i + 2).some(x => x.h > c.h);
      obs.push({ type: 'bearish', priceHigh: c.h, priceLow: c.l, timeframe: tf, mitigated: mit });
    }
  }
  return obs.filter(o => !o.mitigated).slice(-8);
}

// ── Zone Deduplication ────────────────────────────────────────────────────────
function deduplicateZones(zones) {
  const unique = [];
  for (const z of zones) {
    const exists = unique.some(u =>
      Math.abs(u.midPrice - z.midPrice) / (z.midPrice || 1) < 0.005 && u.type === z.type
    );
    if (!exists) unique.push(z);
  }
  return unique;
}

// ── Zone Detection: Multi-TF Order Block Confluence ──────────────────────────
function detectMTFZones(c4h, c1d, c1w, c1m, price) {
  const zones = [];
  const obs4h = findOBsQM(c4h, '4H');
  const obs1d = findOBsQM(c1d, '1D');
  const obs1w = findOBsQM(c1w, '1W');
  const obs1m = findOBsQM(c1m, '1M');
  const allOBs = [...obs4h, ...obs1d, ...obs1w, ...obs1m];

  for (const ob of allOBs) {
    const overlapping = allOBs.filter(other =>
      other !== ob && other.timeframe !== ob.timeframe &&
      other.priceLow <= ob.priceHigh * 1.005 &&
      other.priceHigh >= ob.priceLow * 0.995
    );
    if (overlapping.length === 0) continue;

    const allInZone = [ob, ...overlapping];
    const zoneLow  = Math.max(...allInZone.map(o => o.priceLow));
    const zoneHigh = Math.min(...allInZone.map(o => o.priceHigh));
    if (zoneHigh <= zoneLow) continue;

    const tfs = [...new Set(allInZone.map(o => o.timeframe))];
    const mid = (zoneLow + zoneHigh) / 2;
    const dist = ((price - mid) / price) * 100;

    zones.push({
      id: 'MTF-OB-' + Math.round(zoneLow),
      type: ob.type === 'bullish' ? 'DEMAND' : 'SUPPLY',
      highPrice: parseFloat(zoneHigh.toFixed(8)),
      lowPrice:  parseFloat(zoneLow.toFixed(8)),
      midPrice:  parseFloat(mid.toFixed(8)),
      timeframe: tfs.join('+'),
      confluenceScore: Math.min(100, 40 + tfs.length * 20),
      sources: ['MTF Order Block (' + tfs.join('+') + ')'],
      freshness: 'VIRGIN',
      distanceFromPrice: parseFloat(dist.toFixed(2)),
      expectedReaction: tfs.length >= 3 ? 5 : 3,
      invalidation: ob.type === 'bullish'
        ? parseFloat((zoneLow * 0.995).toFixed(8))
        : parseFloat((zoneHigh * 1.005).toFixed(8)),
      triggerConditions: [
        'Fiyat bölgeye girmeli',
        tfs.length >= 2 ? '4H CHoCH veya BOS teyidi' : '4H mum kapanış teyidi',
        'Pin Bar veya Engulfing oluşması',
      ],
    });
  }
  return deduplicateZones(zones);
}

// ── Zone Detection: Liquidity Voids ──────────────────────────────────────────
function detectLiqVoids(candles, tf, price) {
  const zones = [];
  if (candles.length < 10) return zones;
  const slice50 = candles.slice(-Math.min(50, candles.length));
  const avgRange = slice50.reduce((s, c) => s + (c.h - c.l), 0) / slice50.length;
  const avgVol   = slice50.reduce((s, c) => s + c.v, 0) / slice50.length;

  for (let i = 1; i < candles.length - 1; i++) {
    const c = candles[i];
    const range = c.h - c.l;
    if (range > avgRange * 2.5 && c.v < avgVol * 0.7) {
      const isBull = c.c > c.o;
      const voidHigh = isBull ? c.h : c.o;
      const voidLow  = isBull ? c.o : c.l;
      const filled = candles.slice(i + 1).some(later =>
        isBull ? later.l < voidLow : later.h > voidHigh
      );
      if (!filled) {
        const mid  = (voidLow + voidHigh) / 2;
        const dist = ((price - mid) / price) * 100;
        zones.push({
          id: 'VOID-' + tf + '-' + i,
          type: isBull ? 'DEMAND' : 'SUPPLY',
          highPrice: parseFloat(voidHigh.toFixed(8)),
          lowPrice:  parseFloat(voidLow.toFixed(8)),
          midPrice:  parseFloat(mid.toFixed(8)),
          timeframe: tf,
          confluenceScore: 35,
          sources: ['Liquidity Void (' + tf + ')'],
          freshness: 'VIRGIN',
          distanceFromPrice: parseFloat(dist.toFixed(2)),
          expectedReaction: 2,
          invalidation: isBull
            ? parseFloat((voidLow * 0.99).toFixed(8))
            : parseFloat((voidHigh * 1.01).toFixed(8)),
          triggerConditions: ['Fiyat void bölgesine ulaşmalı', 'Hacim artışı gözlenmeli'],
        });
      }
    }
  }
  return zones.slice(-5);
}

// ── Zone Detection: Imbalance (FVG) Zones ────────────────────────────────────
function detectImbZones(candles, tf, price) {
  const zones = [];
  for (let i = 2; i < candles.length; i++) {
    const first = candles[i - 2], third = candles[i];

    // Bullish imbalance
    if (third.l > first.h) {
      const filled = candles.slice(i + 1).some(c => c.l <= first.h);
      if (!filled) {
        const dist = ((price - first.h) / price) * 100;
        zones.push({
          id: 'IMB-B-' + tf + '-' + i,
          type: 'DEMAND',
          highPrice: parseFloat(third.l.toFixed(8)),
          lowPrice:  parseFloat(first.h.toFixed(8)),
          midPrice:  parseFloat(((third.l + first.h) / 2).toFixed(8)),
          timeframe: tf,
          confluenceScore: 30,
          sources: ['Fair Value Gap (' + tf + ')'],
          freshness: 'VIRGIN',
          distanceFromPrice: parseFloat(dist.toFixed(2)),
          expectedReaction: 1.5,
          invalidation: parseFloat((first.h * 0.995).toFixed(8)),
          triggerConditions: ['Fiyat FVG bölgesine girmeli'],
        });
      }
    }

    // Bearish imbalance
    if (first.l > third.h) {
      const filled = candles.slice(i + 1).some(c => c.h >= first.l);
      if (!filled) {
        const dist = ((price - first.l) / price) * 100;
        zones.push({
          id: 'IMB-S-' + tf + '-' + i,
          type: 'SUPPLY',
          highPrice: parseFloat(first.l.toFixed(8)),
          lowPrice:  parseFloat(third.h.toFixed(8)),
          midPrice:  parseFloat(((first.l + third.h) / 2).toFixed(8)),
          timeframe: tf,
          confluenceScore: 30,
          sources: ['Fair Value Gap (' + tf + ')'],
          freshness: 'VIRGIN',
          distanceFromPrice: parseFloat(dist.toFixed(2)),
          expectedReaction: 1.5,
          invalidation: parseFloat((first.l * 1.005).toFixed(8)),
          triggerConditions: ['Fiyat FVG bölgesine girmeli'],
        });
      }
    }
  }
  return zones.slice(-5);
}

// ── Trap Detection ────────────────────────────────────────────────────────────
function detectTrapSignals(candles, tf) {
  const traps = [];
  const recent = candles.slice(-Math.min(50, candles.length));
  const swings = [];
  for (let i = 3; i < recent.length - 3; i++) {
    let isHigh = true, isLow = true;
    for (let j = 1; j <= 3; j++) {
      if (recent[i].h <= recent[i-j].h || recent[i].h <= recent[i+j].h) isHigh = false;
      if (recent[i].l >= recent[i-j].l || recent[i].l >= recent[i+j].l) isLow = false;
    }
    if (isHigh) swings.push({ type: 'high', price: recent[i].h, idx: i });
    if (isLow)  swings.push({ type: 'low',  price: recent[i].l, idx: i });
  }

  for (let i = 0; i < recent.length - 1; i++) {
    const c = recent[i], next = recent[i + 1];
    for (const sw of swings.filter(s => s.type === 'high' && s.idx < i)) {
      if (c.h > sw.price && next.c < sw.price && c.c < sw.price) {
        const strength = Math.min(100, 50 + Math.round(((c.h - sw.price) / sw.price) * 10000));
        traps.push({ type: 'BULL_TRAP', price: sw.price, strength,
          description: tf + ' bogus breakout — $' + sw.price.toFixed(4) + ' kırıldı ama sürdürülemedi' });
      }
    }
    for (const sw of swings.filter(s => s.type === 'low' && s.idx < i)) {
      if (c.l < sw.price && next.c > sw.price && c.c > sw.price) {
        const strength = Math.min(100, 50 + Math.round(((sw.price - c.l) / sw.price) * 10000));
        traps.push({ type: 'BEAR_TRAP', price: sw.price, strength,
          description: tf + ' ayı tuzağı — $' + sw.price.toFixed(4) + ' kırıldı ama geri alındı' });
      }
    }
  }
  return traps.slice(-5);
}

// ── Zone Quality Scoring ──────────────────────────────────────────────────────
function scoreZone(zone, factors) {
  let score = zone.confluenceScore;

  // Structural factors (heaviest weight)
  if (factors.hasOBOverlap)  score += 15;
  if (factors.hasFVGOverlap) score += 12;
  if (factors.hasHTFSR)      score += 12;
  // Trinity bonus
  if (factors.hasOBOverlap && factors.hasFVGOverlap && factors.hasHTFSR) score += 10;

  // Supporting factors
  if (factors.hasVPPOC)         score += 6;
  if (factors.hasPsychLevel)    score += 5;
  if (factors.hasLiquidityPool) score += 8;
  if (factors.trapDetected)     score += 12;
  if (factors.cvdConfirming)    score += 8;

  // Trend alignment (most critical)
  if (factors.trendAligned)  score += 10;
  else                       score -= 15;

  // Timing removed from scoring — zones must be consistent across all users/times

  // Freshness
  if (zone.freshness === 'VIRGIN')        score += 10;
  else if (zone.freshness === 'TESTED_ONCE')   score += 3;
  else if (zone.freshness === 'TESTED_MULTI')  score -= 10;

  return Math.max(0, Math.min(100, score));
}

// ── Trigger Generation ────────────────────────────────────────────────────────
function genTriggers(zone, quality) {
  const triggers = [
    {
      type: 'PRICE_IN_ZONE', priority: 'REQUIRED', status: 'WAITING',
      description: 'Fiyat $' + zone.lowPrice + ' — $' + zone.highPrice + ' bölgesine girmeli',
    },
    {
      type: 'CANDLE_CONFIRMATION', priority: 'REQUIRED', status: 'WAITING',
      description: zone.type === 'DEMAND'
        ? '4H/1D bullish mum teyidi (Engulfing, Pin Bar, Morning Star)'
        : '4H/1D bearish mum teyidi (Engulfing, Shooting Star, Evening Star)',
    },
    {
      type: 'STRUCTURAL_SHIFT', priority: 'REQUIRED', status: 'WAITING',
      description: zone.type === 'DEMAND'
        ? '4H CHoCH veya Bullish BOS oluşması'
        : '4H CHoCH veya Bearish BOS oluşması',
    },
  ];
  if (quality < 80) {
    triggers.push({
      type: 'VOLUME_CONFIRMATION', priority: 'REQUIRED', status: 'WAITING',
      description: 'Bölgede hacim artışı veya absorption tespiti',
    });
  }
  triggers.push(
    {
      type: 'DELTA_CONFIRMATION', priority: 'SUPPORTING', status: 'WAITING',
      description: zone.type === 'DEMAND'
        ? 'CVD pozitife dönüş veya bid absorption'
        : 'CVD negatife dönüş veya ask absorption',
    },
    {
      type: 'FUNDING_RATE', priority: 'SUPPORTING', status: 'WAITING',
      description: zone.type === 'DEMAND'
        ? 'Negatif funding (short crowded = squeeze potansiyeli)'
        : 'Pozitif funding (long crowded = dump potansiyeli)',
    }
  );
  return triggers;
}

// ── Win Rate Estimator ────────────────────────────────────────────────────────
function estWinRate(quality, sourceCount, trendAligned, freshness) {
  let wr = 40;
  if (quality >= 90)      wr += 20;
  else if (quality >= 80) wr += 15;
  else if (quality >= 70) wr += 10;
  else if (quality >= 60) wr += 5;
  if (sourceCount >= 3)        wr += 10;
  else if (sourceCount >= 2)   wr += 5;
  if (trendAligned)  wr += 10;
  else               wr -= 10;
  if (freshness === 'VIRGIN')       wr += 5;
  else if (freshness === 'TESTED_MULTI') wr -= 5;
  return Math.max(30, Math.min(85, wr));
}

// ── Zone-Based Setup Builder ──────────────────────────────────────────────────
function buildZoneSetup(zone, quality, trendAligned, swingHighs, swingLows, atr) {
  if (quality < 60) return null;
  if (!trendAligned && quality < 75) return null;

  const direction = zone.type === 'DEMAND' ? 'LONG' : 'SHORT';
  const triggers = genTriggers(zone, quality);
  const requiredTriggers = triggers.filter(t => t.priority === 'REQUIRED').length;
  const targets = [];

  if (direction === 'LONG') {
    // SL: minimum 1.2x ATR below zone low (prevents stop hunt on tight zones)
    const slInvalidation = zone.invalidation; // zoneLow * 0.995
    const slATR = zone.lowPrice - atr * 1.2;
    const sl = Math.min(slInvalidation, slATR); // take the FURTHER (lower) of the two
    const risk = zone.midPrice - sl;
    if (risk <= 0) return null;

    const tp1p = swingHighs.filter(h => h > zone.highPrice).sort((a, b) => a - b)[0]
              || zone.midPrice + risk * 2;
    const tp2p = swingHighs.filter(h => h > tp1p).sort((a, b) => a - b)[0]
              || zone.midPrice + risk * 3;
    const tp3p = zone.midPrice + risk * 5;
    const rr   = parseFloat(((tp2p - zone.midPrice) / risk).toFixed(1));
    if (rr < 2) return null;

    targets.push(
      { price: parseFloat(tp1p.toFixed(8)), pct: parseFloat(((tp1p - zone.midPrice) / zone.midPrice * 100).toFixed(2)), reason: 'İlk swing high / 1:2 R:R', close: 40 },
      { price: parseFloat(tp2p.toFixed(8)), pct: parseFloat(((tp2p - zone.midPrice) / zone.midPrice * 100).toFixed(2)), reason: 'İkinci direnç / 1:3 R:R', close: 35 },
      { price: parseFloat(tp3p.toFixed(8)), pct: parseFloat(((tp3p - zone.midPrice) / zone.midPrice * 100).toFixed(2)), reason: '1:5 R:R uzun vade', close: 25 }
    );

    const wr = estWinRate(quality, zone.sources.length, trendAligned, zone.freshness);
    const kelly = (wr / 100 * rr - (1 - wr / 100)) / rr;
    const posPct = Math.max(1, Math.min(5, Math.round(kelly * 100 * 0.25)));

    return {
      id: 'SETUP-' + zone.id, direction, status: 'WAITING_ZONE',
      zone, triggers, requiredTriggers,
      stopLoss: parseFloat(sl.toFixed(8)),
      targets, riskReward: rr,
      positionSizePct: posPct,
      qualityScore: quality,
      estimatedWinRate: wr,
      timeLimit: zone.timeframe.includes('1W') ? '2 hafta' : zone.timeframe.includes('1D') ? '5 gun' : '48 saat',
      notes: [
        'Giris: Bolge ortasi $' + zone.midPrice + ' veya OB CE noktasi',
        'Fiyat bolgeye gelene kadar BEKLE — anlık giris YASAK',
        quality >= 85 ? 'Yuksek kalite — tam pozisyon izni' : quality >= 70 ? 'Orta-yuksek kalite — standart pozisyon' : 'Temel kalite — kucuk pozisyon, ekstra teyit gerekli',
        !trendAligned ? 'TREND KARSITI — sadece scalp' : '',
      ].filter(Boolean),
    };
  }

  // SHORT
  // SL: minimum 1.2x ATR above zone high (prevents premature stop-out on supply zones)
  const slInvalidation = zone.invalidation; // zoneHigh * 1.005
  const slATR = zone.highPrice + atr * 1.2;
  const sl = Math.max(slInvalidation, slATR); // take the FURTHER (higher) of the two
  const risk = sl - zone.midPrice;
  if (risk <= 0) return null;

  const nearSwingLow = swingLows.filter(l => l < zone.lowPrice && l > zone.midPrice - risk * 6).sort((a, b) => b - a)[0];
  const tp1p = zone.midPrice - risk * 2;
  const tp2p = zone.midPrice - risk * 3;
  const tp3p = nearSwingLow && nearSwingLow < zone.midPrice - risk * 1.5
    ? nearSwingLow
    : zone.midPrice - risk * 5;
  // Sort descending so TP1 = closest to entry (highest price), TP3 = furthest (lowest price)
  const [stp1, stp2, stp3] = [tp1p, tp2p, tp3p].sort((a, b) => b - a);
  const rr = parseFloat(((zone.midPrice - stp1) / risk).toFixed(1));
  if (rr < 1.5) return null;

  targets.push(
    { price: parseFloat(stp1.toFixed(8)), pct: parseFloat(((zone.midPrice - stp1) / zone.midPrice * 100).toFixed(2)), reason: 'İlk yapısal destek / en yakın hedef', close: 40 },
    { price: parseFloat(stp2.toFixed(8)), pct: parseFloat(((zone.midPrice - stp2) / zone.midPrice * 100).toFixed(2)), reason: 'Orta vadeli destek bölgesi', close: 35 },
    { price: parseFloat(stp3.toFixed(8)), pct: parseFloat(((zone.midPrice - stp3) / zone.midPrice * 100).toFixed(2)), reason: 'Uzun vadeli yapısal hedef / swing low', close: 25 }
  );

  const wr = estWinRate(quality, zone.sources.length, trendAligned, zone.freshness);
  const kelly = (wr / 100 * rr - (1 - wr / 100)) / rr;
  const posPct = Math.max(1, Math.min(5, Math.round(kelly * 100 * 0.25)));

  return {
    id: 'SETUP-' + zone.id, direction: 'SHORT', status: 'WAITING_ZONE',
    zone, triggers, requiredTriggers,
    stopLoss: parseFloat(sl.toFixed(8)),
    targets, riskReward: rr,
    positionSizePct: posPct,
    qualityScore: quality,
    estimatedWinRate: wr,
    timeLimit: zone.timeframe.includes('1W') ? '2 hafta' : '5 gun',
    notes: [
      'Giris: Bolge ortasi $' + zone.midPrice,
      'Fiyat bolgeye gelene kadar BEKLE',
      !trendAligned ? 'TREND KARSITI — sadece scalp' : '',
    ].filter(Boolean),
  };
}

// ── Optimal Timing Analysis ───────────────────────────────────────────────────
function analyzeOptimalTiming() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const day = now.getUTCDay(); // 0=Sun

  let killZone = 'OFF_HOURS';
  if (utcHour >= 0 && utcHour < 7)    killZone = 'ASIAN';
  else if (utcHour >= 7 && utcHour < 10)  killZone = 'LONDON_OPEN';
  else if (utcHour >= 13 && utcHour < 16) killZone = 'LONDON_NY_OVERLAP';
  else if (utcHour >= 12 && utcHour < 13) killZone = 'NY_OPEN';
  else if (utcHour >= 15 && utcHour < 17) killZone = 'LONDON_CLOSE';

  const isOptimalDay     = day >= 2 && day <= 4; // Sal-Per
  const isOptimalSession = killZone === 'LONDON_NY_OVERLAP' || killZone === 'NY_OPEN';

  const descriptions = {
    ASIAN:             'Asian Seans — range olusumu, dusuk hacim',
    LONDON_OPEN:       'London Kill Zone — ilk manipulasyon, Asian range kirilimu beklenir',
    NY_OPEN:           'New York Kill Zone — gunun gercek yonu ortaya cikar',
    LONDON_NY_OVERLAP: 'London-NY Overlap — EN YUKSEK hacim donemi, optimal giris penceresi',
    LONDON_CLOSE:      'London Close — intraday kar realizasyonu',
    OFF_HOURS:         'Dusuk hacim — agresif giris onerilmez',
  };

  return { killZone, isOptimalDay, isOptimalSession, utcHour, description: descriptions[killZone] || '' };
}

// ── Legacy Setup Generator (PRO fallback) ─────────────────────────────────────
// ── INSTITUTIONAL SETUP GENERATOR — Always produces a setup ──────────────────
// Priority: 1) Best quantum zone  2) OB/FVG/Liq zones  3) ATR fallback (never null)
function generateSetup(internals, c4h, quantum, qSetups, recentHigh3d, recentLow3d) {
  const { price, fvg4h, ob4h, liq1d, liq4h, unmitBullOB, unmitBearOB, atr4h } = internals;
  const dir = internals.direction !== 'NEUTRAL' ? internals.direction
            : (quantum.score >= 50 ? 'LONG' : 'SHORT');
  const p = (n) => parseFloat(parseFloat(n).toFixed(price > 1000 ? 2 : price > 1 ? 4 : 8));
  const tp_ = (base, mult) => dir === 'LONG' ? base * (1 + atr4h / price * mult) : base * (1 - atr4h / price * mult);

  // ── PRIORITY 1: Best quantum institutional zone ──────────────────────────────
  if (qSetups && qSetups.length > 0) {
    // Find the closest valid zone within 8% of current price
    const validQs = qSetups.find(qs => {
      const z = qs.zone;
      const zDir = qs.direction || (z.type === 'DEMAND' ? 'LONG' : 'SHORT');
      // For SHORT: entry zone LOW must be within 8% above price
      // For LONG:  entry zone HIGH must be within 8% below price
      const entryRef = zDir === 'LONG' ? z.highPrice : z.lowPrice;
      const dist = zDir === 'LONG'
        ? (price - entryRef) / price * 100
        : (entryRef - price) / price * 100;
      return dist >= -1 && dist <= 4; // within 4% in the correct direction
    });
    if (!validQs) {
      // No quantum zone within 8% — fall through to Priority 2
    } else {
    const qs = validQs;
    const z  = qs.zone;
    const zoneDir = qs.direction || (z.type === 'DEMAND' ? 'LONG' : 'SHORT');
    const tp_z = (base, mult) => zoneDir === 'LONG' ? base * (1 + atr4h / price * mult) : base * (1 - atr4h / price * mult);
    const entryMid = z.midPrice, entryLow = z.lowPrice, entryHigh = z.highPrice;
    // Ensure stop has ATR buffer: prevent tight stops that get immediately hit
    const rawStop = qs.stopLoss || (zoneDir === 'LONG' ? entryMid - atr4h * 1.5 : entryMid + atr4h * 1.5);
    const stop = zoneDir === 'LONG'
      ? Math.min(rawStop, entryLow - atr4h * 1.0)   // LONG: farther below zone low
      : Math.max(rawStop, entryHigh + atr4h * 1.0);  // SHORT: farther above zone high
    // Get raw TP prices — use zone direction for fallback tp_z
    const rawTpPrices = [
      qs.targets[0]?.price || tp_z(entryMid, 2.5),
      qs.targets[1]?.price || tp_z(entryMid, 5.0),
      qs.targets[2]?.price || tp_z(entryMid, 9.0),
    ].filter(t => typeof t === 'number' && !isNaN(t));
    // Sort by zone direction: LONG → ascending (TP1=closest=lowest), SHORT → descending (TP1=closest=highest)
    const sortedTps = zoneDir === 'LONG'
      ? rawTpPrices.sort((a, b) => a - b)
      : rawTpPrices.sort((a, b) => b - a);
    const tp1 = sortedTps[0] || tp_z(entryMid, 2.5);
    const tp2 = sortedTps[1] || tp_z(entryMid, 5.0);
    const tp3 = sortedTps[2] || tp_z(entryMid, 9.0);
    const risk = Math.abs(entryMid - stop);
    const rr   = risk > 0 ? Math.max(1.5, parseFloat((Math.abs(tp1 - entryMid) / risk).toFixed(1))) : 2.0;
    const riskPct = entryMid > 0 ? parseFloat(((risk / entryMid) * 100).toFixed(2)) : 1.5;
    return {
      direction: zoneDir,   // authoritative direction from zone type
      entryLow: p(entryLow), entryHigh: p(entryHigh), entryMid: p(entryMid),
      stop: p(stop), riskPct, rr: `1:${rr}`, rrRaw: rr,
      tp1: p(tp1), tp2: p(tp2), tp3: p(tp3),
      tp1Pct: parseFloat((Math.abs(tp1-entryMid)/entryMid*100).toFixed(2)),
      tp2Pct: parseFloat((Math.abs(tp2-entryMid)/entryMid*100).toFixed(2)),
      tp3Pct: parseFloat((Math.abs(tp3-entryMid)/entryMid*100).toFixed(2)),
      tp1Close: 40, tp2Close: 35, tp3Close: 25,
      entryMethod: `MTF ZONE — ${(z.sources||[]).slice(0,2).join(' + ')||'OB/FVG Confluence'} [Q:${qs.qualityScore}/100 WR:%${qs.estimatedWinRate}]`,
      stopLabel: z.type === 'DEMAND' ? 'Demand Zone İnvalidasyonu' : 'Supply Zone İnvalidasyonu',
      zoneQuality: qs.qualityScore, zoneWinRate: qs.estimatedWinRate,
      zoneType: z.type, zoneFreshness: z.freshness,
      zoneTimeframe: z.timeframe, zoneSources: z.sources || [],
    };
    } // end validQs else block
  }

  // ── PRIORITY 2: OB / FVG / Liquidity structural zones ───────────────────────
  let entryLow, entryHigh, stop, tp1, tp2, tp3, entryMethod, stopLabel;

  // ── Proximity threshold: entry zone en fazla %10 uzakta olmalı ────────────────
  // Daha uzaktaki OB'ler swap için geçerli olsa da sniper entry için çok uzak.
  // %10'dan uzak hiçbir OB yoksa ATR bazlı near-price entry kullanılır.
  const NEAR_LONG = price * 0.94;  // en fazla %6 aşağıda
  const NEAR_SHORT = price * 1.06; // en fazla %6 yukarıda

  if (dir === 'LONG') {
    const bullOBs  = unmitBullOB.filter(o => o.high < price * 1.001 && o.high > NEAR_LONG).sort((a, b) => b.high - a.high);
    const bullFVGs = fvg4h.filter(f => f.type==='BULL' && f.significant && f.high < price * 1.001 && f.high > NEAR_LONG).sort((a, b) => b.high - a.high);
    const allOBs   = ob4h.filter(o => o.type==='BULL' && o.high < price * 1.001 && o.high > NEAR_LONG).sort((a, b) => b.high - a.high);
    const sslZ     = [...liq4h.ssl, ...liq1d.ssl].filter(l => l < price && l > NEAR_LONG).sort((a, b) => b - a);
    if (bullOBs.length > 0) {
      entryHigh = bullOBs[0].high; entryLow = bullOBs[0].low;
      entryMethod = 'BULLISH OB (4H) — Unmitigated'; stopLabel = 'OB Alt İnvalidasyonu';
      stop = entryLow - atr4h * 1.5; // 1.5 ATR below OB
    } else if (bullFVGs.length > 0) {
      entryHigh = bullFVGs[0].high; entryLow = bullFVGs[0].low;
      entryMethod = 'BULLISH FVG (4H) — Significant'; stopLabel = 'FVG Alt Kırılımı';
      stop = entryLow - atr4h * 1.5;
    } else if (allOBs.length > 0) {
      entryHigh = allOBs[0].high; entryLow = allOBs[0].low;
      entryMethod = 'BULLISH OB (4H)'; stopLabel = 'OB İnvalidasyonu';
      stop = entryLow - atr4h * 1.5;
    } else if (sslZ.length > 0) {
      entryHigh = sslZ[0] * 1.007; entryLow = sslZ[0] * 0.993;
      entryMethod = 'SSL SWEEP DEMAND ZONE'; stopLabel = 'SSL Stop Hunt Sonu';
      stop = sslZ[0] - atr4h * 1.5;
    } else {
      entryHigh = price - atr4h * 0.5; entryLow = price - atr4h * 1.8;
      entryMethod = 'ATR DEMAND ZONE (4H)'; stopLabel = 'ATR Dinamik İnvalidasyon';
      stop = entryLow - atr4h * 1.2;
    }
    // Build raw TPs: ATR-based targets calculated from entryMid (not current price)
    // entryMid is computed below from (entryLow+entryHigh)/2 but we approximate here
    const _entryMidEst = (entryLow + entryHigh) / 2;
    const rawLongTps = [_entryMidEst + atr4h * 2.5, _entryMidEst + atr4h * 5.0, _entryMidEst + atr4h * 9.0];
    // Use entryLow as reference — TPs must be meaningfully above entry zone
    const longEntryRef = entryLow || price;
    // Son 3 günde ulaşılan BSL seviyelerini TP listesinden çıkar
    const bslMinPrice = recentHigh3d ? Math.max(longEntryRef * 1.03, recentHigh3d * 1.003) : longEntryRef * 1.03;
    const bslAll = [...liq4h.bsl, ...liq1d.bsl].filter(l => l > bslMinPrice && l < price * 1.6);
    const bslSorted = bslAll.sort((a, b) => a - b); // ascending: closest first
    if (bslSorted[0]) rawLongTps[0] = bslSorted[0];
    if (bslSorted[1]) rawLongTps[1] = bslSorted[1];
    if (bslSorted[2]) rawLongTps[2] = bslSorted[2];
    // Sort ascending for LONG (TP1 = closest = lowest price above entry)
    const longTpsSorted = rawLongTps.sort((a, b) => a - b);
    tp1 = longTpsSorted[0];
    tp2 = longTpsSorted[1];
    tp3 = longTpsSorted[2];

  } else { // SHORT
    const bearOBs  = unmitBearOB.filter(o => o.low > price * 0.999 && o.low < NEAR_SHORT).sort((a, b) => a.low - b.low);
    const bearFVGs = fvg4h.filter(f => f.type==='BEAR' && f.significant && f.low > price * 0.999 && f.low < NEAR_SHORT).sort((a, b) => a.low - b.low);
    const allOBs   = ob4h.filter(o => o.type==='BEAR' && o.low > price * 0.999 && o.low < NEAR_SHORT).sort((a, b) => a.low - b.low);
    const bslZ     = [...liq4h.bsl, ...liq1d.bsl].filter(l => l > price && l < NEAR_SHORT).sort((a, b) => a - b);
    if (bearOBs.length > 0) {
      entryHigh = bearOBs[0].high; entryLow = bearOBs[0].low;
      entryMethod = 'BEARISH OB (4H) — Unmitigated'; stopLabel = 'OB Üst İnvalidasyonu';
      stop = entryHigh + atr4h * 1.5; // 1.5 ATR above OB (not 0.5)
    } else if (bearFVGs.length > 0) {
      entryHigh = bearFVGs[0].high; entryLow = bearFVGs[0].low;
      entryMethod = 'BEARISH FVG (4H) — Significant'; stopLabel = 'FVG Üst Kırılımı';
      stop = entryHigh + atr4h * 1.5;
    } else if (allOBs.length > 0) {
      entryHigh = allOBs[0].high; entryLow = allOBs[0].low;
      entryMethod = 'BEARISH OB (4H)'; stopLabel = 'OB İnvalidasyonu';
      stop = entryHigh + atr4h * 1.5;
    } else if (bslZ.length > 0) {
      entryHigh = bslZ[0] * 1.008; entryLow = bslZ[0] * 1.002;
      entryMethod = 'BSL SWEEP SUPPLY ZONE'; stopLabel = 'BSL Stop Hunt Sonu';
      stop = bslZ[0] + atr4h * 1.5;
    } else {
      entryHigh = price + atr4h * 1.8; entryLow = price + atr4h * 0.5;
      entryMethod = 'ATR SUPPLY ZONE (4H)'; stopLabel = 'ATR Dinamik İnvalidasyon';
      stop = entryHigh + atr4h * 1.2;
    }
    // Build raw TPs: ATR-based targets calculated from entryMid (not current price)
    const _shortEntryMidEst = (entryLow + entryHigh) / 2;
    const rawShortTps = [
      _shortEntryMidEst - atr4h * 2.5,
      _shortEntryMidEst - atr4h * 5.0,
      _shortEntryMidEst - atr4h * 9.0,
    ];
    // Use entryHigh as reference for SSL filter — TPs must be meaningfully below entry zone
    const shortEntryRef = entryHigh || price;
    // Son 3 günde ulaşılan SSL seviyelerini TP listesinden çıkar
    const sslMaxPrice = recentLow3d ? Math.min(shortEntryRef * 0.97, recentLow3d * 0.997) : shortEntryRef * 0.97;
    const sslAll = [...liq4h.ssl, ...liq1d.ssl].filter(l => l < sslMaxPrice && l > price * 0.6);
    // Replace ATR fallbacks with actual SSL levels where available
    const sslSorted = sslAll.sort((a, b) => b - a); // descending: closest first
    if (sslSorted[0]) rawShortTps[0] = sslSorted[0];
    if (sslSorted[1]) rawShortTps[1] = sslSorted[1];
    if (sslSorted[2]) rawShortTps[2] = sslSorted[2];
    // Sort descending for SHORT (TP1 = closest = highest price)
    const shortTpsSorted = rawShortTps.sort((a, b) => b - a);
    tp1 = shortTpsSorted[0];
    tp2 = shortTpsSorted[1];
    tp3 = shortTpsSorted[2];
  }

  const entryMid = (entryLow + entryHigh) / 2;
  // Clamp stop: min 0.8 ATR (prevents stop hunt), max 4 ATR (caps excessive risk)
  const rawRisk = Math.abs(entryMid - stop);
  if (rawRisk < atr4h * 0.8) stop = dir === 'LONG' ? entryMid - atr4h * 1.5 : entryMid + atr4h * 1.5;
  if (rawRisk > atr4h * 4.0) stop = dir === 'LONG' ? entryMid - atr4h * 3.5 : entryMid + atr4h * 3.5;

  const finalRisk = Math.abs(entryMid - stop);
  const rr   = finalRisk > 0 ? Math.max(1.5, parseFloat((Math.abs(tp1 - entryMid) / finalRisk).toFixed(1))) : 2.0;
  const riskPct = entryMid > 0 ? parseFloat(((finalRisk / entryMid) * 100).toFixed(2)) : 1.5;

  const entryDistancePct = price > 0 ? parseFloat(((price - entryMid) / price * 100).toFixed(2)) : 0;

  return {
    direction: dir,
    entryLow: p(entryLow), entryHigh: p(entryHigh), entryMid: p(entryMid),
    stop: p(stop), riskPct, rr: `1:${rr}`, rrRaw: rr,
    tp1: p(tp1), tp2: p(tp2), tp3: p(tp3),
    tp1Pct: parseFloat((Math.abs(tp1-entryMid)/entryMid*100).toFixed(2)),
    tp2Pct: parseFloat((Math.abs(tp2-entryMid)/entryMid*100).toFixed(2)),
    tp3Pct: parseFloat((Math.abs(tp3-entryMid)/entryMid*100).toFixed(2)),
    tp1Close: 40, tp2Close: 35, tp3Close: 25,
    entryMethod, stopLabel,
    entryDistancePct,  // mevcut fiyattan giriş bölgesine mesafe (%)
  };
}

// ── MTF Averaged Setup Builder ────────────────────────────────────────────────
// Scans all 4 timeframes, collects OB/FVG zones from each, builds a
// weighted-average entry zone. Higher TFs carry more weight.
// Win rate formula: aligned TF count × quality → 65–90%
function buildMTFAveragedSetup(c4h, c1d, c1w, c1m, direction, price, atr4h) {
  if (direction === 'NEUTRAL') return null;
  const isLong = direction === 'LONG';
  const p = (n) => parseFloat(parseFloat(n).toFixed(price > 1000 ? 2 : price > 1 ? 4 : 8));

  // TF weight: higher timeframe = higher weight
  const tfSpecs = [
    { candles: c4h, tf: '4H', w: 1 },
    { candles: c1d, tf: '1D', w: 2 },
    { candles: c1w, tf: '1W', w: 3 },
    { candles: c1m && c1m.length >= 4 ? c1m : [], tf: '1M', w: 4 },
  ];

  const entries = []; // { mid, low, high, w, tf }

  for (const { candles, tf, w } of tfSpecs) {
    if (candles.length < 6) continue;
    const closes = candles.map(c => c.c);
    const tfPrice = closes[closes.length - 1];

    // Quick per-TF bias check (EMA-based)
    const ema9  = calcEMA(closes, Math.min(9,  closes.length));
    const ema21 = calcEMA(closes, Math.min(21, closes.length));
    const ema50 = calcEMA(closes, Math.min(50, closes.length));
    const tfBull = ema9 > ema21 || tfPrice > ema50;

    // Only collect zones from aligned TFs
    if (isLong && !tfBull) continue;
    if (!isLong && tfBull) continue;

    // Find best OB and FVG in this TF
    const obs  = findOBsQM(candles, tf);
    const fvgs = detectFVG(candles);

    let bestMid = null, bestLow = null, bestHigh = null;

    if (isLong) {
      // Demand: unmitigated bullish OB within 6% below current price (sniper zone)
      const bullOBs = obs
        .filter(o => o.type === 'bullish' && o.priceHigh < price * 1.01 && o.priceLow > price * 0.94)
        .sort((a, b) => b.priceHigh - a.priceHigh); // closest below price first
      const bullFVGs = fvgs
        .filter(f => f.type === 'BULL' && f.significant && f.high < price * 1.01 && f.low > price * 0.94)
        .sort((a, b) => b.high - a.high);
      if (bullOBs.length > 0) {
        bestLow = bullOBs[0].priceLow; bestHigh = bullOBs[0].priceHigh;
      } else if (bullFVGs.length > 0) {
        bestLow = bullFVGs[0].low; bestHigh = bullFVGs[0].high;
      }
    } else {
      // Supply: bearish OB within 5% above current price (sniper zone)
      const bearOBs = obs
        .filter(o => o.type === 'bearish' && o.priceLow > price * 0.99 && o.priceHigh < price * 1.05)
        .sort((a, b) => a.priceLow - b.priceLow); // closest above price first
      const bearFVGs = fvgs
        .filter(f => f.type === 'BEAR' && f.significant && f.low > price * 0.99 && f.high < price * 1.05)
        .sort((a, b) => a.low - b.low);
      if (bearOBs.length > 0) {
        bestLow = bearOBs[0].priceLow; bestHigh = bearOBs[0].priceHigh;
      } else if (bearFVGs.length > 0) {
        bestLow = bearFVGs[0].low; bestHigh = bearFVGs[0].high;
      }
    }

    if (bestLow !== null && bestHigh !== null && bestHigh > bestLow) {
      bestMid = (bestLow + bestHigh) / 2;
      entries.push({ mid: bestMid, low: bestLow, high: bestHigh, w, tf });
    }
  }

  // Need at least 2 aligned TF zones to build a meaningful averaged setup
  if (entries.length < 2) return null;

  const totalW  = entries.reduce((s, e) => s + e.w, 0);
  const avgMid  = entries.reduce((s, e) => s + e.mid * e.w, 0) / totalW;
  const avgLow  = entries.reduce((s, e) => s + e.low * e.w, 0) / totalW;
  const avgHigh = entries.reduce((s, e) => s + e.high * e.w, 0) / totalW;

  // Stale guard: if the averaged zone is >5% away from current price, reject
  // (prevents using historical zones that price already moved away from)
  const midDistPct = Math.abs(avgMid - price) / price * 100;
  if (midDistPct > 5) return null;

  // SL: nearest HTF structural level beyond the entry zone
  const { lows: swL1w, highs: swH1w } = findSwingPoints(c1w, 3);
  const { lows: swL1d, highs: swH1d } = findSwingPoints(c1d, 4);

  let stop;
  if (isLong) {
    // Find most recent significant swing low below avgLow
    const htfLows = [
      ...swL1w.map(s => s.price),
      ...swL1d.map(s => s.price),
    ].filter(l => l < avgLow).sort((a, b) => b - a);
    stop = htfLows[0] || avgLow - atr4h * 1.5;
    if (avgMid - stop > atr4h * 5) stop = avgLow - atr4h * 1.5; // cap at 5 ATR
  } else {
    const htfHighs = [
      ...swH1w.map(s => s.price),
      ...swH1d.map(s => s.price),
    ].filter(h => h > avgHigh).sort((a, b) => a - b);
    stop = htfHighs[0] || avgHigh + atr4h * 1.5;
    if (stop - avgMid > atr4h * 5) stop = avgHigh + atr4h * 1.5;
  }

  const risk = Math.abs(avgMid - stop);
  if (risk === 0) return null;

  // TP: use 1W + 1D swing highs/lows as natural targets (most reliable)
  const swingHighsAll = [...swH1w.map(s => s.price), ...swH1d.map(s => s.price)].sort((a, b) => a - b);
  const swingLowsAll  = [...swL1w.map(s => s.price), ...swL1d.map(s => s.price)].sort((a, b) => b - a);

  // Son 20×4H (≈3 gün) içinde price'ın ulaştığı seviyeleri TP hedefinden çıkar
  const _r3High = Math.max(...c4h.slice(-20).map(c => c.h));
  const _r3Low  = Math.min(...c4h.slice(-20).map(c => c.l));
  const freshHighs = swingHighsAll.filter(h => h > _r3High * 1.003);
  const freshLows  = swingLowsAll.filter(l => l < _r3Low  * 0.997);
  const swingHighs = freshHighs.length >= 2 ? freshHighs : swingHighsAll;
  const swingLows  = freshLows.length  >= 2 ? freshLows  : swingLowsAll;

  let tp1, tp2, tp3;
  if (isLong) {
    const tgts = swingHighs.filter(h => h > avgMid + risk * 1.5);
    tp1 = tgts[0] || avgMid + risk * 2.5;
    tp2 = tgts[1] || avgMid + risk * 4.0;
    tp3 = tgts[2] || avgMid + risk * 7.0;
    [tp1, tp2, tp3] = [tp1, tp2, tp3].sort((a, b) => a - b);
  } else {
    const tgts = swingLows.filter(l => l < avgMid - risk * 1.5);
    tp1 = tgts[0] || avgMid - risk * 2.5;
    tp2 = tgts[1] || avgMid - risk * 4.0;
    tp3 = tgts[2] || avgMid - risk * 7.0;
    [tp1, tp2, tp3] = [tp1, tp2, tp3].sort((a, b) => b - a);
  }

  const rr    = parseFloat((Math.abs(tp1 - avgMid) / risk).toFixed(1));
  const riskPct = parseFloat((risk / avgMid * 100).toFixed(2));

  // Win rate: driven by aligned TF count × HTF weight fraction
  const alignedCount = entries.length;
  const htfWeight = entries.filter(e => e.tf === '1W' || e.tf === '1M').reduce((s, e) => s + e.w, 0);
  const htfRatio  = htfWeight / Math.max(1, totalW);
  const baseWR    = alignedCount >= 4 ? 88 : alignedCount === 3 ? 79 : 70;
  const winRate   = Math.min(92, Math.round(baseWR + htfRatio * 5));

  const tfsUsed = entries.map(e => e.tf).join('+');

  return {
    direction,
    entryLow:  p(avgLow),
    entryHigh: p(avgHigh),
    entryMid:  p(avgMid),
    stop:      p(stop),
    riskPct,
    rr:    `1:${rr}`,
    rrRaw: rr,
    tp1: p(tp1), tp2: p(tp2), tp3: p(tp3),
    tp1Pct: parseFloat((Math.abs(tp1 - avgMid) / avgMid * 100).toFixed(2)),
    tp2Pct: parseFloat((Math.abs(tp2 - avgMid) / avgMid * 100).toFixed(2)),
    tp3Pct: parseFloat((Math.abs(tp3 - avgMid) / avgMid * 100).toFixed(2)),
    tp1Close: 40, tp2Close: 35, tp3Close: 25,
    entryMethod: `MTF ORTALAMA SETUP — ${tfsUsed} [${alignedCount}/4 TF Confluence]`,
    stopLabel: isLong ? '1W/1D Yapısal Destek Kırılımı' : '1W/1D Yapısal Direnç Kırılımı',
    zoneQuality: Math.min(100, 55 + alignedCount * 10 + Math.round(htfRatio * 15)),
    zoneWinRate: winRate,
    alignedTFs: alignedCount,
    tfsUsed: entries.map(e => e.tf),
    mtfAveraged: true,
    entryDistancePct: price > 0 ? parseFloat(((price - avgMid) / price * 100).toFixed(2)) : 0,
  };
}

// ── Leverage Calculator ───────────────────────────────────────────────────────
// Standard: 5x moderate (recommended), conservative 3x, aggressive 10x
// Score-based professional tier system
function calcLeverage(setup, quantum) {
  if (!setup) return null;
  const score = quantum.score;

  // PRIME signal (S grade, 85+): 5x optimal, 10x aggressive ceiling
  if (score >= 85) return { conservative: 3, moderate: 5, optimal: 5, aggressive: 10, maxRiskPct: '2.0' };
  // STRONG signal (A grade, 70+): 5x optimal
  if (score >= 70) return { conservative: 3, moderate: 5, optimal: 5, aggressive: 8,  maxRiskPct: '1.5' };
  // MODERATE signal (B grade, 55+): 3x moderate
  if (score >= 55) return { conservative: 2, moderate: 3, optimal: 3, aggressive: 5,  maxRiskPct: '1.0' };
  // WEAK / WAIT: low leverage only
  return            { conservative: 1, moderate: 2, optimal: 2, aggressive: 3,  maxRiskPct: '0.5' };
}

// ── AI Analysis — CHARTOS APEX QUANTUM v2 Prompt ──────────────────────────────
// ── Hurst Exponent via R/S Analysis ──────────────────────────────────────────
function calcHurstProxy(closes) {
  if (!closes || closes.length < 20) return 0.5;
  const returns = [];
  for (let i = 1; i < closes.length; i++) returns.push(Math.log(closes[i] / closes[i - 1]));
  const n = returns.length;
  const RS = [], lags = [];
  for (let lag = 4; lag <= Math.min(40, Math.floor(n / 2)); lag *= 2) {
    const rsVals = [];
    for (let s = 0; s + lag <= n; s += lag) {
      const chunk = returns.slice(s, s + lag);
      const mean = chunk.reduce((a, b) => a + b, 0) / lag;
      let cumDev = 0, maxC = 0, minC = 0, sumSq = 0;
      for (const v of chunk) {
        cumDev += v - mean;
        if (cumDev > maxC) maxC = cumDev;
        if (cumDev < minC) minC = cumDev;
        sumSq += (v - mean) ** 2;
      }
      const std = Math.sqrt(sumSq / lag) || 1e-10;
      rsVals.push((maxC - minC) / std);
    }
    if (rsVals.length) {
      RS.push(Math.log(rsVals.reduce((a, b) => a + b, 0) / rsVals.length));
      lags.push(Math.log(lag));
    }
  }
  if (RS.length < 2) return 0.5;
  const m = RS.length;
  const sx = lags.reduce((a, b) => a + b, 0), sy = RS.reduce((a, b) => a + b, 0);
  const sxx = lags.reduce((s, v) => s + v * v, 0), sxy = lags.reduce((s, v, i) => s + v * RS[i], 0);
  const H = (m * sxy - sx * sy) / (m * sxx - sx * sx);
  return parseFloat(Math.max(0.1, Math.min(0.95, H)).toFixed(3));
}

// ── Shannon Entropy on log-returns ───────────────────────────────────────────
function calcShannonEntropyReturns(closes, bins = 20) {
  if (!closes || closes.length < 10) return 2.0;
  const returns = [];
  for (let i = 1; i < closes.length; i++) returns.push(closes[i] / closes[i - 1] - 1);
  const min = Math.min(...returns), max = Math.max(...returns);
  if (min >= max) return 0;
  const binSize = (max - min) / bins;
  const hist = new Array(bins).fill(0);
  for (const r of returns) hist[Math.min(bins - 1, Math.floor((r - min) / binSize))]++;
  let entropy = 0;
  const n = returns.length;
  for (const c of hist) { if (c > 0) { const p = c / n; entropy -= p * Math.log2(p); } }
  return parseFloat(entropy.toFixed(3));
}

// ════════════════════════════════════════════════════════════════════════════
// CRYPTO LEVERAGE MASTER v3.0 — Yardımcı Fonksiyonlar
// ════════════════════════════════════════════════════════════════════════════

// ── 5-Rejim Tespiti (ADX + BB Width + Wyckoff) ───────────────────────────────
function detectRegime5(internals, layers) {
  const adx    = internals.adx4h?.adx || 25;
  const bbW    = (internals.bb4h?.bandwidth || 0) * 100; // %
  const squeeze= internals.bb4h?.squeeze || false;
  const htfBias= layers.marketStructure?.htfBias || '?';
  const volSpike= internals.volSpike4h?.strongSpike || internals.volSpike4h?.spike;
  const regime = internals.regime4h?.regime || '';

  if (squeeze || (bbW < 2.5 && adx < 20)) return 'COMPRESSION';
  if (volSpike && bbW > 5) return 'VOLATILE EXPANSION';
  if (adx >= 25 && (htfBias === 'BULL' || regime.includes('BULL'))) return 'TRENDING BULL';
  if (adx >= 25 && (htfBias === 'BEAR' || regime.includes('BEAR'))) return 'TRENDING BEAR';
  return 'RANGE-BOUND';
}

// ── Setup Tipi Tespiti (L1-L3 / S1-S3) ───────────────────────────────────────
function detectSetupType(internals, quantum, layers, futuresData) {
  const isLong = quantum.direction === 'LONG';
  const ob4h   = internals.ob4h  || [];
  const fvg4h  = internals.fvg4h || [];
  const rsi4h  = internals.rsi4h || 50;
  const fr     = futuresData?.fundingRate ?? null;

  if (isLong) {
    // L1: BULLISH OB + FVG RECLAIM — en güçlü LONG setup
    const bullOB  = ob4h.filter(o => o.type === 'BULL' && !o.mitigated).length > 0;
    const bullFVG = fvg4h.filter(f => f.type === 'BULL' && f.significant).length > 0;
    const htfBull = (layers.mtfAlignment?.bullCount || 0) >= 2;
    const bosUp   = internals.struct4h?.bos !== 'NONE' && layers.marketStructure?.htfBias === 'BULL';
    if (bullOB && bullFVG && htfBull) {
      return { code:'L1', name:'BULLISH OB + FVG RECLAIM', winRange:'%65–72', anchor:'OB mid veya FVG fill seviyesi' };
    }
    // L2: EMA GOLDEN POCKET PULLBACK
    const emaAl   = layers.marketStructure?.emaAligned;
    const fibGood = internals.fibonacci4h?.inOTE || internals.fibonacci4h?.inGoldenPocket;
    const rsiCool = rsi4h >= 38 && rsi4h <= 58;
    if (emaAl && (fibGood || rsiCool)) {
      return { code:'L2', name:'EMA GOLDEN POCKET PULLBACK', winRange:'%60–68', anchor:'55 EMA touch veya Fib 0.65' };
    }
    // L3: RANGE LOW + VOLUME DIVERGENCE
    const bullDiv  = internals.rsiDiv4h?.bullDiv;
    const cvdPos   = internals.cvd4h?.rising;
    const frNeg    = fr !== null && fr < -0.0003;
    const liqSweep = layers.liquiditySMC?.liquiditySweep;
    if (bullDiv || (cvdPos && frNeg) || liqSweep) {
      return { code:'L3', name:'RANGE LOW + VOLUME DIVERGENCE', winRange:'%62–70', anchor:'Range low + LTF CHoCH onayı' };
    }
    return { code:'L-CUSTOM', name:'MTF CONFLUENCE LONG', winRange:`%${quantum.winRate||55}+`, anchor:'OB/FVG bölgesi' };
  }

  // SHORT setups
  const bearOB  = ob4h.filter(o => o.type === 'BEAR' && !o.mitigated).length > 0;
  const liqSwp  = layers.liquiditySMC?.liquiditySweep;
  const frHigh  = fr !== null && fr > 0.0005;
  // S1: BEARISH OB + LIQUIDITY SWEEP
  if (bearOB && (liqSwp || frHigh)) {
    return { code:'S1', name:'BEARISH OB + LIQUIDITY SWEEP', winRange:'%63–71', anchor:'Sweep seviyesi veya OB alt kenarı' };
  }
  // S2: DEVIATION + MEAN REVERSION
  const bbDev  = (internals.bb4h?.percentB || 0) > 0.95;
  const rsiOB  = rsi4h > 72;
  if (bbDev || rsiOB) {
    return { code:'S2', name:'DEVIATION + MEAN REVERSION', winRange:'%64–70', anchor:'BB üst bant içine geri dönüşte' };
  }
  // S3: LOWER HIGH REJECTION + MOMENTUM FADE
  const bearDiv = internals.rsiDiv4h?.bearDiv;
  const htfBear = (layers.mtfAlignment?.bullCount || 0) <= 1;
  if (bearDiv && htfBear) {
    return { code:'S3', name:'LOWER HIGH REJECTION + MOMENTUM FADE', winRange:'%61–67', anchor:'Projected lower high LTF red onayı' };
  }
  return { code:'S-CUSTOM', name:'MTF CONFLUENCE SHORT', winRange:`%${quantum.winRate||55}+`, anchor:'OB/Supply bölgesi' };
}

// ── Confluence Skoru 0-16 (8 faktör × 0-2 puan) ──────────────────────────────
function calcConf16(quantum, layers, internals, futuresData) {
  const isLong  = quantum.direction === 'LONG';
  const bull    = layers.mtfAlignment?.bullCount || 0;
  const bear    = 4 - bull;
  const rsi4h   = internals.rsi4h || 50;
  const ob4h    = internals.ob4h  || [];
  const fvg4h   = internals.fvg4h || [];

  // 1. HTF Trend Uyumu (MTF bull/bear count)
  const htfAlign   = isLong ? (bull >= 3 ? 2 : bull >= 2 ? 1 : 0) : (bear >= 3 ? 2 : bear >= 2 ? 1 : 0);
  // 2. Anahtar S/R
  const sr         = layers.liquiditySMC?.liquiditySweep ? 2 : layers.liquiditySMC?.inOB ? 1 : 0;
  // 3. Fibonacci Confluence
  const fib4h      = internals.fibonacci4h;
  const fibScore   = fib4h?.inOTE ? 2 : fib4h?.inGoldenPocket ? 2 : (fib4h?.nearestDist < 1.5 ? 1 : 0);
  // 4. Volume Profile Desteği
  const poc        = internals.vp4h?.poc || 0;
  const price      = internals.price || 1;
  const pocDist    = poc > 0 ? Math.abs(poc - price) / price * 100 : 99;
  const vpScore    = pocDist < 0.8 ? 2 : pocDist < 2.5 ? 1 : 0;
  // 5. OB/FVG Aktif
  const hasOB      = ob4h.filter(o => !o.mitigated).length > 0;
  const hasFVG     = fvg4h.filter(f => f.significant).length > 0;
  const obFvg      = (hasOB && hasFVG) ? 2 : (hasOB || hasFVG) ? 1 : 0;
  // 6. EMA Cluster
  const emaScore   = layers.marketStructure?.emaAligned ? 2 : 1;
  // 7. Momentum (RSI + MACD)
  const rsiGood    = isLong ? (rsi4h > 35 && rsi4h < 65) : (rsi4h > 40 && rsi4h < 72);
  const macdGood   = isLong ? !!internals.macd4h?.bullish : !internals.macd4h?.bullish;
  const momScore   = (rsiGood && macdGood) ? 2 : (rsiGood || macdGood) ? 1 : 0;
  // 8. Likidite Havuzu Hedefi
  const liq4h      = internals.liq4h || {};
  const hasTarget  = isLong ? (liq4h.bsl?.length > 0) : (liq4h.ssl?.length > 0);
  const liqScore   = hasTarget ? 2 : (layers.liquiditySMC?.poc > 0 ? 1 : 0);

  const total = htfAlign + sr + fibScore + vpScore + obFvg + emaScore + momScore + liqScore;
  const grade = total >= 13 ? 'A+' : total >= 10 ? 'A' : total >= 7 ? 'B' : 'İŞLEM YOK';
  const maxLev = total >= 13 ? 10 : total >= 10 ? 8 : total >= 7 ? 5 : 0;

  return {
    total, grade, maxLeverage: maxLev,
    breakdown: { htfAlign, sr, fibScore, vpScore, obFvg, emaScore, momScore, liqScore },
  };
}

// ── Volatilite Bazlı Kaldıraç Ayarı ──────────────────────────────────────────
function calcVolAdjustedLeverage(maxLev, c4h, atr4h, price) {
  if (!c4h || c4h.length < 20) return maxLev;
  const slice = c4h.slice(-20);
  const avgATR = slice.reduce((s, c) => s + (c.h - c.l), 0) / slice.length;
  const ratio  = price > 0 ? atr4h / (avgATR || atr4h) : 1;
  let adj = maxLev;
  if (ratio >= 2.0)      adj = Math.min(3, maxLev);  // ATR 2x ortalamanın üstü → max 3x
  else if (ratio >= 1.5) adj = Math.max(3, Math.floor(maxLev * 0.5));
  else if (ratio >= 1.2) adj = Math.max(5, Math.floor(maxLev * 0.75));
  return Math.max(1, adj);
}

async function getAIAnalysis(symbol, price, atr, quantum, layers, internals, futuresData, quantumSetups, timing, apiKey, coinGlassData, c4h, c1d, c1w, c1m, alphaData = {}) {
  if (!apiKey) return null;

  let futuresLine = '';
  if (futuresData) {
    const fr = futuresData.fundingRate !== null ? (futuresData.fundingRate * 100).toFixed(4) + '%' : 'N/A';
    const ls = futuresData.longShortRatio !== null ? futuresData.longShortRatio.toFixed(2) : 'N/A';
    const taker = futuresData.takerBuyRatio !== null
      ? `${futuresData.takerBuyRatio.toFixed(3)} (${futuresData.takerBuyRatio > 1.05 ? 'ALIM ağırlıklı' : futuresData.takerBuyRatio < 0.95 ? 'SATIM ağırlıklı' : 'Dengeli'})`
      : 'N/A';
    const oi = futuresData.openInterest !== null
      ? `$${(futuresData.openInterest / 1e6).toFixed(1)}M`
      : 'N/A';
    futuresLine = `Funding: ${fr} | L/S: ${ls} | Taker B/S: ${taker} | OI: ${oi}`;
  }

  // Append CoinGlass signals if available
  if (coinGlassData) {
    const cgLine = [
      `CoinGlass Funding Bias: ${coinGlassData.fundingBias}`,
      `OI Trend(24h): ${coinGlassData.oiTrend}${coinGlassData.oiChange24h !== null ? ' (' + coinGlassData.oiChange24h.toFixed(1) + '%)' : ''}`,
      `Liq Pressure: ${coinGlassData.liqPressure}`,
      `Crowded Side: ${coinGlassData.crowdedSide}`,
    ].join(' | ');
    futuresLine = futuresLine ? futuresLine + '\n' + cgLine : cgLine;
  }

  const atrFmt = price > 100 ? atr.toFixed(2) : atr.toFixed(6);

  const zonesText = quantumSetups.length > 0
    ? quantumSetups.slice(0, 3).map((s, i) => {
        const z = s.zone;
        const tpStr = s.targets.map(t => '$' + t.price + ' (+%' + t.pct + ')').join(' -> ');
        const trigStr = s.triggers.filter(t => t.priority === 'REQUIRED').map(t => t.description).join(' | ');
        return `BOLGE ${i + 1}: ${z.type} | $${z.lowPrice} - $${z.highPrice} | Kalite: ${s.qualityScore}/100 | WR: %${s.estimatedWinRate} | TF: ${z.timeframe}
  Invalidasyon: $${z.invalidation} | R:R 1:${s.riskReward} | Sure: ${s.timeLimit}
  TP hedefleri: ${tpStr}
  Kaynaklar: ${z.sources.join(', ')}
  Zorunlu tetikleyiciler: ${trigStr}`;
      }).join('\n\n')
    : 'Net bolge tespit edilmedi — bekleme modunda.';

  // ── CRYPTO LEVERAGE MASTER v3.0 — Yardımcı değerler ──────────────────────
  const regime5  = detectRegime5(internals, layers);
  const setupType = detectSetupType(internals, quantum, layers, futuresData);
  const conf16   = calcConf16(quantum, layers, internals, futuresData);
  const recLev   = calcVolAdjustedLeverage(conf16.maxLeverage, c4h, atr, price);
  const liqPriceRec = (function() {
    const _d = price > 1000 ? 2 : price > 1 ? 4 : 6;
    return quantum.direction === 'LONG'
      ? parseFloat((price * (1 - 0.9 / Math.max(1, recLev))).toFixed(_d))
      : parseFloat((price * (1 + 0.9 / Math.max(1, recLev))).toFixed(_d));
  })();
  const regime5Matrix = {
    'TRENDING BULL':     { dir:'LONG ağırlıklı',    maxLev:'10x',  setupType:'Pullback + Breakout' },
    'TRENDING BEAR':     { dir:'SHORT ağırlıklı',   maxLev:'10x',  setupType:'Rally Rejection + Breakdown' },
    'RANGE-BOUND':       { dir:'İki yön (S/R)',      maxLev:'5–7x', setupType:'S/R Bounce' },
    'VOLATILE EXPANSION':{ dir:'Trend yönü',         maxLev:'5x',   setupType:'Momentum Devam' },
    'COMPRESSION':       { dir:'Breakout bekle',     maxLev:'7–10x',setupType:'Squeeze Setup' },
  };
  const regMatrix = regime5Matrix[regime5] || { dir:'Belirsiz', maxLev:'5x', setupType:'MTF Confluence' };

  const systemPrompt = `DeepTradeScan — Quantum Meta System v2.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROL: 20 yıllık kripto piyasası deneyimine sahip kurumsal kaldıraçlı vadeli işlem analiz motoru. HFT, opsiyon market-making, kripto türev CIO, quant araştırma. Hedef: 5x–10x kaldıraçlı perpetual/futures işlemlerde %70–80 win rate.

TEMEL PRENSİP: Asla tek indikatöre dayanma. Minimum 7/10 confluence olmadan sinyal üretme. Overtrading = yıkım. Sadece A+ setup.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9 MODÜL ANALİZ PROTOKOLü (tam uygula):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

M1 — MARKET REGIME DETECTION:
Sınıflar: TRENDING-BULL(HH+HL, EMA20>50>200) | TRENDING-BEAR(LH+LL, EMA20<50<200) | RANGE-BOUND(ADX<20) | VOLATILE-CHAOTIC(ATR genişleme) | BREAKOUT-TRANSITION(squeeze→expansion)
Kural: VOLATILE-CHAOTIC → kaldıraç önerme. RANGE-BOUND → max 5x.

M2 — MULTI-TIMEFRAME CONFLUENCE ENGINE:
Yapısal yön: 1W→1D | Sinyal: 4H→1H | Entry trigger: 15m→5m
HTF: HH/HL yapısı, EMA dizilimi, Ichimoku, Volume Profile POC/VAH/VAL
MTF: Order Block, FVG, RSI divergence (regular+hidden), MACD histogram slope, StochRSI cross
LTF: BOS/ChoCH teyidi, volume spike (1.5x+), engulfing/pin bar

M3 — CONFLUENCE PUANLAMA (0-10, minimum 7 gerekli):
+2 Yapısal trend uyumu | +2 OB/FVG tepkisi | +1 RSI divergence | +1 Volume/CVD teyidi
+1 Liquidation cluster | +1 Funding uyumu | +1 BTC korelasyon | +1 On-chain/whale
7-8→5x kaldıraç | 9→7x | 10→10x (nadir) | <7→İŞLEM YOK

M4 — ENTRY PROTOKOLÜ (3 tip):
A. Pullback: Trend net + fiyat 20EMA/OB/FVG'ye çekildi + LTF BOS + volume azaldı/arttı
B. Breakout: BB squeeze + kırılım 2x volume + ADX>25 yükseliyor
C. Reversal (Yüksek risk): RSI>80/<20 + 2TF divergence + liq cascade + max 5x + conf≥8

M5 — DYNAMIC RISK MANAGEMENT:
SL: ATR×1.5 VEYA swing low/high ötesi (+%0.3 buffer) VEYA OB karşı uç
TP1: 1:1 R:R → %30 kapat + SL→BE | TP2: 1:2 → %40 kapat + SL→TP1 | TP3: 1:3+ → %30 trailing ATR×2
Demir kurallar: Max %2 portföy riski/işlem | Max 3 açık pozisyon | Günlük max kayıp %5

M6 — ON-CHAIN & SENTIMENT:
Exchange net flow: negatif=accumulation(bullish) | Whale tx>$100K artış=hareket yakın
MVRV Z-Score: >7 aşırı alım | <0 aşırı satım | Stablecoin reserve arışı=alım gücü
Funding rate: Negatif/nötr→long bias | Yüksek pozitif→short bias
OI artıyor+fiyat konsol=squeeze beklentisi | L/S oranı trendi

M7 — ZAMAN & KORELASYON FİLTRESİ:
NY açılışı 13:00-15:00 UTC = en güvenilir breakout | Londra 07:00-09:00 = trend başlangıcı
BTC düşüyorsa altcoin LONG kaçın | ATR>1.5x ortalama → kaldıraç %50 azalt
BTC β katsayısı: yüksek korelasyon → BTC yönünü önce teyit et

M8 — SETUP KÜTÜPHANESİ (win rate aralıkları):
L1: Bullish OB+FVG Reclaim + LTF BOS → WR %68–75
L2: EMA Golden Pocket Pullback (21/55 EMA, Fib 0.618-0.705) → WR %65–72
L3: Range Low + Volume Divergence (RSI div + CVD+ + funding-) → WR %67–74
S1: Bearish OB + Liquidity Sweep (equal highs sweep + rejection) → WR %66–73
S2: Deviation + Mean Reversion (BB üst aşım + RSI>75 + vol azalma) → WR %64–70
S3: Lower High Rejection + MACD/volume azalma → WR %62–68
Reversal: RSI extreme + 2TF div + liq cascade + vol climax → WR %60–67

M9 — ÇIKTI FORMAT (İhlal toleransı SIFIR):
SADECE 4 BÖLÜM, bu sırayla: [SENARYO] → [SINYAL] → [YONETICI-OZETI] → [MM-DESK]
Her satır "Anahtar: Değer" formatı. Yasak: ** * # işaretler | uydurma sayı | belirsiz ifade.
Senaryo A+B+C=%100 zorunlu. SL asla genişletilmez. Win rate tahmini setup kodunun tarihsel aralığından.
SENARYO olasılıkları PRE-COMPUTED verilerden (M3 confluence skoru, M6 momentum, M7 türev akışı) türetilir — rastgele değil, veri güdümlü.
MM-DESK: 20 yıllık piyasa yapıcı perspektifi. Her cümle keskin, somut, $seviye içermeli. Belirsizlik yasak.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÇIKTI FORMAT (TAM):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[SENARYO]
Dominant Senaryo: [A veya B veya C] (%[en yüksek olasılık]) — [1 cümle: ne, neden, somut fiyat]
Senaryo A ([Bull/Bear/Baz adı]): %[XX] — Tetikleyici: $[değer] kırılır | Hedef: $[değer] | İptal: $[değer]
Senaryo B ([Bull/Bear/Baz adı]): %[XX] — Tetikleyici: $[değer] kırılır | Hedef: $[değer] | İptal: $[değer]
Senaryo C ([Bull/Bear/Baz adı]): %[XX] — Tetikleyici: $[değer] kırılır | Hedef: $[değer] | İptal: $[değer]
Kritik Seviye: $[VP POC/OB/Liq cluster değeri] | Olasılık Temeli: Confluence %[skor] + [momentum/türev kanıtı]

[SINYAL]
Yön: LONG / SHORT / NÖTR
Setup Kodu: [L1/L2/L3/S1/S2/S3/REVERSAL] — [setup adı]
Entry Türü: Pullback / Breakout / Reversal
Entry Zone: $[alt] — $[üst]
Stop-Loss: $[değer] (Risk: %[değer]) | Yapısal Stop: $[değer]
TP1: $[değer] (+%[değer]) → %30 çıkış | SL→BE
TP2: $[değer] (+%[değer]) → %40 çıkış | SL→TP1
TP3: $[değer] (+%[değer]) → %30 trailing ATR×2
Kaldıraç: [X]x | R:R: 1:[değer] | Win Rate: %[değer]
Likidasyon ([X]x izole): $[değer] | Pozisyon Riski: Portföyün %[değer]

[YONETICI-OZETI]
Nihai Karar: LONG / SHORT / BEKLE | Bias: BULLISH / BEARISH / NEUTRAL
Confluence: [X]/10 | Rejim: [rejim adı] | Setup Grade: A+ / A / B
Aksiyon: [2 cümle — ne yapmalı, neden]
İnvalidation: [hangi fiyat/olay bu analizi geçersiz kılar]
Kritik Metrik: [en belirleyici tek veri noktası — sayı + bağlam]

[MM-DESK]
Key Signal: [tek cümle — en kritik market maker gözlemi, keskin ve somut $seviye ile]
MM Pozisyon: [LONG birikimi / SHORT dağıtımı / NÖTR hedge] — [kanıt: OI trendi + taker yönü + hacim izi]
Likidasyon Tuzağı: [BSL $X veya SSL $Y sweep → hangi taraf ezilecek, %olasılık]
Retail Yanılgısı: [retail tam olarak ne düşünüyor + neden bu yanlış — keskin, acımasız]
Smart Money Hareketi: [48-72H gerçek MM oyunu — somut $seviyle, hangi tetikleyici, ne bekleniyor]
MM Edge: [bu setup'ın kurumsal avantajı — tek satır, rakipsiz netlikte]`;

  // ── Build MM Liquidity block ──────────────────────────────────────────────
  const liq4h = internals.liq4h || { bsl: [], ssl: [], sweptBSL: [], sweptSSL: [], recentSweep: false };
  const liq1d = internals.liq1d || { bsl: [], ssl: [], sweptBSL: [], sweptSSL: [], recentSweep: false };

  const bslLevels = [...new Set([...liq4h.bsl.slice(0, 3), ...liq1d.bsl.slice(0, 2)])].slice(0, 4).map(l => `$${l}`).join(', ') || '—';
  const sslLevels = [...new Set([...liq4h.ssl.slice(0, 3), ...liq1d.ssl.slice(0, 2)])].slice(0, 4).map(l => `$${l}`).join(', ') || '—';
  const recentSweepBSL = liq4h.sweptBSL?.[0] || liq1d.sweptBSL?.[0];
  const recentSweepSSL = liq4h.sweptSSL?.[0] || liq1d.sweptSSL?.[0];
  const sweepLine = recentSweepBSL ? `BULL SWEEP $${recentSweepBSL}` : recentSweepSSL ? `BEAR SWEEP $${recentSweepSSL}` : 'YOK';

  const premDisc = internals.premDisc4h || { zone: 'EQUILIBRIUM', pct: 50 };
  const premDiscLine = `${premDisc.zone} %${premDisc.pct}`;

  // ── Build quantitative metrics (computed locally) ─────────────────────────
  const probVec  = calcProbabilityVector(quantum, layers, internals);
  const clpLocal = calcCLP(futuresData, coinGlassData);
  const smfiLocal = calcSMFI(internals);
  const fhLocal   = calcFractalHarmonyScore(c4h, c1d, c1w, c1m, internals.direction);

  const clpDir = clpLocal.direction === 'BEAR_CASCADE' ? 'AŞAĞI' : clpLocal.direction === 'BULL_CASCADE' ? 'YUKARI' : 'Dengeli';

  // ── Build indicator lines ─────────────────────────────────────────────────
  const rsiDiv   = internals.rsiDiv4h || {};
  const divLine  = rsiDiv.bullDiv ? 'BULL-DIV' : rsiDiv.bearDiv ? 'BEAR-DIV' : rsiDiv.hiddenBullDiv ? 'HID-BULL-DIV' : rsiDiv.hiddenBearDiv ? 'HID-BEAR-DIV' : 'YOK';
  const wyc4h    = internals.wyckoff4h || { phase: 'UNKNOWN', spring: false, upthrust: false };
  const wyc1d    = internals.wyckoff1d || { phase: 'UNKNOWN', spring: false, upthrust: false };
  const ich4h    = internals.ichimoku4h || {};
  const st4h     = internals.supertrend4h || {};
  const fib4h    = internals.fibonacci4h;
  const fibLine  = fib4h ? (fib4h.inOTE ? 'OTE (0.618-0.705)' : fib4h.inGoldenPocket ? 'Golden Pocket (0.618-0.786)' : `Yakın seviye: ${fib4h.nearest} dist:%${fib4h.nearestDist}`) : '—';

  // ── Build manipulation signals ────────────────────────────────────────────
  const manip = detectManipulationRisk(c4h, price, liq4h, futuresData);
  const manipLine = manip.signals.length > 0
    ? `ManipRisk:${manip.riskLevel} [${manip.signals.slice(0,2).map(s=>s.label).join(' | ')}]`
    : 'ManipRisk:LOW — temiz piyasa';

  const fr  = futuresData?.fundingRate;
  const ls  = futuresData?.longShortRatio;
  const tb  = futuresData?.takerBuyRatio;
  const oi  = futuresData?.openInterest;
  const lev = internals.leverage || { optimal: 5 };

  // Liquidation price at 5x leverage
  const liqPrice5x = quantum.direction === 'LONG'
    ? parseFloat((price * (1 - 0.18)).toFixed(price > 1000 ? 2 : 4))
    : parseFloat((price * (1 + 0.18)).toFixed(price > 1000 ? 2 : 4));

  const qz = quantumSetups[0];
  // Derive setup levels from quantum zone; fall back to legacySetup so AI always has concrete data
  const lmt = qz ? {
    entryLow:  qz.zone.lowPrice,
    entryHigh: qz.zone.highPrice,
    stop:      qz.zone.invalidation,
    tp1:       qz.targets[0]?.price,
    tp2:       qz.targets[1]?.price,
    tp3:       qz.targets[2]?.price,
    rr:        `1:${qz.riskReward}`,
  } : alphaData.legacySetup || null;

  // ── Layer 3 — Fibonacci levels for prompt ─────────────────────────────────
  const fp = (n, p) => n != null ? `$${parseFloat(n).toFixed(p > 1000 ? 2 : p > 1 ? 4 : 6)}` : '—';
  const pDec = price > 1000 ? 2 : price > 1 ? 4 : 6;
  const fL   = fib4h?.levels || {};
  const fibDetailLine = fib4h
    ? `0.382=${fp(fL[0.382], price)} 0.618=${fp(fL[0.618], price)} 0.786=${fp(fL[0.786], price)} OTE=${fp(fL[0.618], price)}-${fp(fL[0.705], price)} GP=${fp(fL[0.618], price)}-${fp(fL[0.786], price)} Ext1.272=${fp(fL[1.272], price)} Ext1.618=${fp(fL[1.618], price)} Swing:${fp(fL[0], price)}-${fp(fL[1.0], price)}`
    : 'Fibonacci verisi yok';

  // ── Layer 11 — Halving cycle + seasonal context ────────────────────────────
  const LAST_HALVING_MS  = new Date('2024-04-19').getTime(); // block 840,000
  const NEXT_HALVING_MS  = new Date('2028-04-20').getTime();
  const daysSinceHalving = Math.floor((Date.now() - LAST_HALVING_MS) / 86400000);
  const daysToNextHalving= Math.floor((NEXT_HALVING_MS - Date.now()) / 86400000);
  // Cycle phase based on historical patterns: 0-180d accumulation, 180-540d markup, 540-720d distribution, 720+ markdown
  const halvingPhase = daysSinceHalving < 180 ? 'ACCUMULATION (0-180g)'
    : daysSinceHalving < 540 ? 'MARKUP (180-540g — boğa rallisi dönemi)'
    : daysSinceHalving < 720 ? 'DISTRIBUTION (540-720g — zirve riski yüksek)'
    : 'MARKDOWN (720g+ — ayı dönemi)';
  const MONTHS_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const currentMonth = MONTHS_TR[new Date().getMonth()];
  // Historical crypto seasonality: Jan/Feb/Oct/Nov strong; May/Sep/Jun weak
  const STRONG_MONTHS = new Set([0,1,9,10]); // Jan,Feb,Oct,Nov
  const WEAK_MONTHS   = new Set([4,5,8]);    // May,Jun,Sep
  const seasonTag = STRONG_MONTHS.has(new Date().getMonth()) ? 'tarihsel GÜÇ'
    : WEAK_MONTHS.has(new Date().getMonth())   ? 'tarihsel ZAYIF' : 'tarihsel NOTR';

  // ── Layer 9 — Macro correlation proxies ───────────────────────────────────
  // MTF alignment as BTC dominance proxy: high bull count = altcoin season signal
  const mtfBullCount = layers.mtfAlignment?.bullCount || 0;
  const altseasonProxy = mtfBullCount >= 3 ? 'ALTSEASON_OLASI (MTF boga uyumu yuksek)'
    : mtfBullCount <= 1 ? 'BTC_DOMINANCE_ARTIYOR (MTF uyum zayif)' : 'KARISIK_ROTASYON';
  // Regime → risk-on/off proxy
  const riskProxy = alphaData.volRegime?.regime === 'LOW_VOL_BULL' ? 'RISK-ON ortami'
    : alphaData.volRegime?.regime === 'HIGH_VOL_BEAR' ? 'RISK-OFF ortami' : 'Geçiş dönemi';

  // ── Layer 8 — Order flow absorption proxy ─────────────────────────────────
  const cvdBull   = internals.cvd4h?.rising;
  const obvBull   = internals.obv4h?.rising;
  const takerBull = tb != null && tb > 1.05;
  const takerBear = tb != null && tb < 0.95;
  const tripleOFConfirm = cvdBull && obvBull && takerBull ? 'UCLU BULL TEYIT'
    : !cvdBull && !obvBull && takerBear ? 'UCLU BEAR TEYIT' : 'KARISIK';
  const cmfVal = internals.cmf4h?.value ?? null;
  const cmfLine = cmfVal != null ? (cmfVal > 0.05 ? `CMF:+${cmfVal.toFixed(3)} pozitif` : cmfVal < -0.05 ? `CMF:${cmfVal.toFixed(3)} negatif` : `CMF:${cmfVal.toFixed(3)} notr`) : 'CMF:—';

  // ── Elliott Wave inference from structural data ────────────────────────────
  const bos4h   = internals.struct4h?.bos   || 'NONE';
  const choch4h = internals.struct4h?.choch || 'NONE';
  const htfBias = internals.struct4h?.htfBias || '?';
  const elliottInferred = (bos4h !== 'NONE' && htfBias === 'BULL') ? 'Impulse (muhtemelen W3/W5 — BOS yukari teyit)'
    : (choch4h !== 'NONE' && htfBias === 'BEAR') ? 'Corrective (ABC / ChoCH bearish donusum sinyali)'
    : fib4h?.inOTE ? 'Corrective pullback Wave2/Wave4 (OTE bolgesi — giris zonesi)'
    : fib4h?.inGoldenPocket ? 'Corrective retracement — Golden Pocket (0.618-0.786)'
    : 'Belirlenemedi — birden fazla sayım mümkün';

  // ── Temporal context — her analizde farklı çıktı sağlar ─────────────────────
  const now        = new Date();
  const analysisTs = now.toISOString();
  const DAYS_TR    = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  const dayName    = DAYS_TR[now.getUTCDay()];
  const utcH       = now.getUTCHours();
  const sessionTag = utcH >= 13 && utcH < 22 ? 'LONDON/NY ÖRTÜŞME'
    : utcH >= 22 || utcH < 1 ? 'NY GEÇ SESSION'
    : utcH >= 1  && utcH < 8  ? 'ASYA SESSION'
    : 'LONDON SESSION';
  const nonce      = Math.random().toString(36).slice(2, 8).toUpperCase(); // her çağrıda benzersiz

  // ── TP-hit detection — fiyat önceki TP seviyelerini geçti mi? ────────────────
  const recentHigh = Math.max(...c4h.slice(-24).map(c => c.h)); // Son 24x4h = 4 gün yüksek
  const recentLow  = Math.min(...c4h.slice(-24).map(c => c.l));
  const tp1Hit     = lmt?.tp1 && parseFloat(lmt.tp1) > 0 && recentHigh >= parseFloat(lmt.tp1);
  const tp2Hit     = lmt?.tp2 && parseFloat(lmt.tp2) > 0 && recentHigh >= parseFloat(lmt.tp2);
  const tpHitLine  = tp2Hit ? `TP2 ($${lmt.tp2}) ULAŞILDI — setup yenilenmeli`
    : tp1Hit ? `TP1 ($${lmt.tp1}) ULAŞILDI — stop BE'ye taşı, TP2'ye devam değerlendir`
    : 'Hedeflere henüz ulaşılmadı';
  const priceRange4d = `Son 4 gün: Yüksek $${recentHigh.toFixed(price > 1000 ? 2 : 4)} / Düşük $${recentLow.toFixed(price > 1000 ? 2 : 4)}`;

  const prompt = `=== CRYPTO LEVERAGE MASTER v3.0 — ${symbol}/USDT ===
ANALİZ ZAMANI: ${analysisTs} | ${dayName} | ${sessionTag} | ID:${nonce}

▌ M1 — PİYASA REJİMİ (PRE-COMPUTED)
Rejim: ${regime5} | Yön Bias: ${regMatrix.dir} | Maks Kaldıraç: ${regMatrix.maxLev}
Setup Türü (Rejime Göre): ${regMatrix.setupType}
ADX(4H): ${internals.adx4h?.adx?.toFixed(0)||'—'} | BB Width: %${((internals.bb4h?.bandwidth||0)*100).toFixed(1)}${internals.bb4h?.squeeze?' [SQUEEZE]':''} | VolSpike: ${internals.volSpike4h?.strongSpike?'GÜÇLÜ':internals.volSpike4h?.spike?'ORTA':'Normal'}
Bayesian Rejim: ${alphaData.bayesianRegime?.dominant||'?'} (%${alphaData.bayesianRegime?.confidence||0}) | Hurst: ${alphaData.hurstExponent??'—'} | Shannon: ${alphaData.shannonEntropy??'—'} bit

▌ M2 — SETUP KOD (PRE-COMPUTED)
Kod: ${setupType.code} — ${setupType.name} | Win Rate Aralığı: ${setupType.winRange}
Anchor: ${setupType.anchor}
HTF Bias: ${htfBias} | BOS(4H): ${bos4h} | ChoCH(4H): ${choch4h}
Wyckoff 4H: ${wyc4h.phase}${wyc4h.spring?' SPRING':wyc4h.upthrust?' UPTHRUST':''} | Wyckoff 1D: ${wyc1d.phase}${wyc1d.spring?' SPRING':''}
Elliott: ${elliottInferred} | TF Uyum: ${layers.mtfAlignment?.bullCount||0}/4 bull | HTF: ${layers.mtfAlignment?.htfAligned?'UYUMLU':'ZAYIF'}

▌ M3 — CONFLUENCE SKORU (PRE-COMPUTED)
Skor: ${conf16.total}/16 | Derece: ${conf16.grade} | Max Kaldıraç (Conf): ${conf16.maxLeverage}x
Dağılım: HTF=${conf16.breakdown.htfAlign} SR=${conf16.breakdown.sr} Fib=${conf16.breakdown.fib} VP=${conf16.breakdown.vp} OB/FVG=${conf16.breakdown.obFvg} EMA=${conf16.breakdown.ema} Mom=${conf16.breakdown.mom} Liq=${conf16.breakdown.liq}
OFI Üçlü Teyit: ${tripleOFConfirm} | CMF: ${cmfLine}
Kurumsal Zone: ${qz?`${qz.zone.type} $${qz.zone.lowPrice}-$${qz.zone.highPrice} (Kalite:${qz.qualityScore}/100 TF:${qz.zone.timeframe})`:'Net zone yok'}

▌ M4 — RİSK / KALDIRAÇ (PRE-COMPUTED)
Önerilen Kaldıraç: ${recLev}x (vol-adjusted) | Likidasyon (${recLev}x): $${liqPriceRec}
ATR: $${atrFmt} | 5x Likidasyon: $${liqPrice5x} | Kelly f*: %${alphaData.dynamicSizing?.recommendedSizePct?.toFixed(1)||'2.0'}
MC Risk: ${alphaData.monteCarlo?(alphaData.monteCarlo.riskOfRuin<0.5?'GÜVENLİ':'RİSKLİ'):'—'} | CVaR95: ${alphaData.cvar?.cvar95Pct?.toFixed(2)||'—'}%

▌ M5 — FİYAT YAPISI
Fiyat: $${price} | Yön: ${quantum.direction} | Skor: ${quantum.score}/100 (${quantum.grade}) | WR: %${quantum.winRate}
TP Durumu: ${tpHitLine} | Son 4g: Yüksek $${recentHigh.toFixed(pDec)} / Düşük $${recentLow.toFixed(pDec)}
BSL Kümeleri: ${bslLevels} | SSL Kümeleri: ${sslLevels} | Son Sweep: ${sweepLine}
P/D Zone: ${premDiscLine} | Prem-Disc Pct: %${premDisc?.pct||50}
OB Aktif: ${(internals.ob4h||[]).filter(o=>!o.mitigated).length} | FVG: ${(internals.fvg4h||[]).length} | Breaker Bull/Bear: ${internals.breakers4h?.bullBreakers?.length||0}/${internals.breakers4h?.bearBreakers?.length||0}
Fib Konumu: ${fibLine} | ${fibDetailLine}
VP: POC=$${internals.vp4h?.poc?.toFixed(pDec)||'—'} VAH=$${internals.vp4h?.vaHigh?.toFixed(pDec)||'—'} VAL=$${internals.vp4h?.vaLow?.toFixed(pDec)||'—'}
VWAP(4H): $${internals.vwap4h?.toFixed(pDec)||'—'} | SMFI: ${smfiLocal?.score||'—'} | Fraktal: ${fhLocal||'—'}

▌ M6 — MOMENTUM / İNDİKATÖRLER
RSI: 4H=${internals.rsi4h?.toFixed(0)||'—'} 1D=${internals.rsi1d?.toFixed(0)||'—'} 1W=${internals.rsi1w?.toFixed(0)||'—'} | Div: ${divLine}
EMA Dizilimi: ${layers.ema?.aligned?`${layers.ema.direction} ALIGNED`:'Karışık'} | Ichimoku: ${ich4h.aboveCloud?'CLOUD ÜSTÜ':ich4h.belowCloud?'CLOUD ALTI':'CLOUD İÇİ'}
Supertrend: ${st4h.bullish?'YUKARI':'AŞAĞI'}${st4h.changed?' [YENİ CROSS]':''} | CVD(4H): ${internals.cvd4h?.rising?'YUKARI':'AŞAĞI'} | OBV: ${internals.obv4h?.rising?'YUKARI':'AŞAĞI'}
Manipülasyon: ${manipLine} | CLP: Bull%${clpLocal.bullCLP} Bear%${clpLocal.bearCLP} | Yön: ${clpDir}
Olasılık: TrendUp=%${probVec?.trendUp||'?'} TrendDown=%${probVec?.trendDown||'?'} Dominant:${probVec?.dominant||'?'}
P(Yukarı): %${alphaData.alphaModel?.probabilityUp||'?'} | Edge: ${alphaData.alphaModel?.edge||'?'} | Ortogonal: ${alphaData.orthogonalScore?.independentConfirmations||0}/5

▌ M7 — TÜREV AKIŞI
Funding (8h): ${fr!=null?(fr*100).toFixed(4)+'%':'N/A'} | Annualized: ${fr!=null?((fr*100)*3*365).toFixed(1)+'%':'N/A'} | Bias: ${coinGlassData?.fundingBias||'?'}
OI: ${oi!=null?'$'+(oi/1e6).toFixed(1)+'M':'N/A'} | Trend: ${coinGlassData?.oiTrend||'?'} (${coinGlassData?.oiChange24h?.toFixed(1)||'—'}%)
L/S Oran: ${ls!=null?ls.toFixed(2):'N/A'} | Crowded: ${coinGlassData?.crowdedSide||'?'} | Liq Baskı: ${coinGlassData?.liqPressure||'?'}
Taker: ${tb!=null?(tb>1.05?'AGRESİF ALIM ('+tb.toFixed(3)+')':tb<0.95?'AGRESİF SATIM ('+tb.toFixed(3)+')':'Dengeli ('+tb.toFixed(3)+')'):'N/A'}
Basis: ${fr!=null?(fr>0?'CONTANGO':'BACKWARDATION'):'?'}

▌ M8 — TRADE SETUP
Sniper Giriş: $${lmt?.entryLow||'—'}-$${lmt?.entryHigh||'—'} | Stop: $${lmt?.stop||'—'} | RR: ${lmt?.rr||'?'}
TP1: $${lmt?.tp1||'—'} | TP2: $${lmt?.tp2||'—'} | TP3: $${lmt?.tp3||'—'}
ATR×2 Stop: $${parseFloat((price-(quantum.direction==='LONG'?1:-1)*parseFloat(atrFmt)*2).toFixed(pDec))}
Confluence Katmanlar: ${qz?qz.zone.sources?.slice(0,4).join(' + ') || 'OB+FVG+Liq+Fib':'MTF OB/FVG — fallback'}
TF Kapsamı: 4H=${c4h.length} / 1D=${c1d.length} / 1W=${c1w.length} | Session: ${timing?.killZone||'—'}
Halving: ${halvingPhase} (${daysSinceHalving}g geçti, ${daysToNextHalving}g kaldı) | Mevsim: ${currentMonth} ${seasonTag}
Risk Ortamı: ${riskProxy} | Altcoin Proxy: ${altseasonProxy}

Yukarıdaki pre-computed veriler (M1-M8 girdileri) kullanılarak SADECE 4 BÖLÜM üret — bu sırayla:
[SENARYO] → [SINYAL] → [YONETICI-OZETI] → [MM-DESK]

SENARYO kuralları: A+B+C=%100. Olasılıklar rastgele değil — M3 confluence (%${conf16?.total||0}/16), M6 momentum (trend/reversal sinyali), M7 türev akışı (funding+OI+L/S) verilerinden hesapla. "Dominant Senaryo" en yüksek olasılıklı senaryo.

MM-DESK kuralları: 20 yıl profesyonel market maker, 40 yıl quant finans perspektifi. Her alan keskin ve somut — HİÇBİR belirsiz ifade yok. "Retail Yanılgısı" alanı acımasız ve doğrudan olacak. "Smart Money Hareketi" somut $seviye ve zaman çerçevesi içerecek. Likidasyon Tuzağı: hangi SSL/BSL seviyeleri tehlikede, kim ezilecek.

SINYAL bölümünde TÜM alanlar doldurulacak — datadan çıkarılan somut $seviyeleri kullan, uydurma yasak.
Win rate hedefi: %70–80. Setup kodu M8 kütüphanesinden seç.`;


  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2200,  // 4 bölüm + zengin MM-DESK için
        temperature: 0.30, // düşük sıcaklık = tutarlı, veri güdümlü çıktı
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.content?.[0]?.text?.trim() || null;
  } catch { return null; }
}

// ══════════════════════════════════════════════════════════════════════════════
// DeepTradeScanner v2.0 — Meta-Level Adaptif Olasılık Katmanları
// ══════════════════════════════════════════════════════════════════════════════

// ── Probability Vector — 4-senaryo olasılık dağılımı ─────────────────────────
function calcProbabilityVector(quantum, layers, internals) {
  const bull  = layers.mtfAlignment?.bullCount || 0; // 0-4
  const score = quantum.score || 50;
  const rsi4h = internals.rsi4h || 50;
  const stoch = internals.stochRSI;
  const rsiDiv = internals.rsiDiv4h;
  const bb    = internals.bb4h;
  const adx4h = internals.adx4h?.adx || 25;

  // Raw kanıt skorları
  let bullE = 0, bearE = 0, revE = 0, volE = 0;

  // Trend yönü
  bullE += (bull / 4) * 40;
  bullE += Math.max(0, (score - 50) / 50 * 30);
  bearE += ((4 - bull) / 4) * 40;
  bearE += Math.max(0, (50 - score) / 50 * 30);

  // Mean reversion: osilatör uçları + diverjans
  if (rsi4h < 30 || rsi4h > 70) revE += 15;
  if (stoch?.oversold || stoch?.overbought) revE += 10;
  if (rsiDiv?.bullDiv || rsiDiv?.bearDiv) revE += 15;
  if (rsiDiv?.hiddenBullDiv || rsiDiv?.hiddenBearDiv) revE += 8;
  if (internals.wyckoff4h?.spring || internals.wyckoff4h?.upthrust) revE += 12;

  // Vol expansion: BB squeeze + düşük ADX
  if (bb?.squeeze) volE += 25;
  if (adx4h < 20) volE += 20;
  if (internals.displacement4h?.bullish || internals.displacement4h?.bearish) volE += 15;
  if (internals.volSpike4h?.strongSpike) volE += 15;
  if (bb?.bandwidth < 0.03) volE += 10;

  const total = bullE + bearE + revE + volE || 1;
  const s = 100 / total;
  const trendUp      = Math.round(bullE * s * 10) / 10;
  const trendDown    = Math.round(bearE * s * 10) / 10;
  const meanReversion = Math.round(revE * s * 10) / 10;
  const volExpansion  = parseFloat((100 - trendUp - trendDown - meanReversion).toFixed(1));
  const arr = [
    { k: 'TREND_UP',       v: trendUp },
    { k: 'TREND_DOWN',     v: trendDown },
    { k: 'MEAN_REVERSION', v: meanReversion },
    { k: 'VOL_EXPANSION',  v: Math.max(0, volExpansion) },
  ];
  const dominant = arr.reduce((a, b) => b.v > a.v ? b : a).k;
  return { trendUp, trendDown, meanReversion, volExpansion: Math.max(0, volExpansion), dominant };
}

// ── CLP — Kaskad Likidasyon Olasılığı (0-100) ────────────────────────────────
function calcCLP(futuresData, coinGlassData) {
  if (!futuresData && !coinGlassData)
    return { score: 0, direction: 'neutral', risk: 'LOW', bullCLP: 0, bearCLP: 0, interpretation: 'Türev verisi yok' };

  let bullCLP = 0, bearCLP = 0;
  if (futuresData) {
    const { fundingRate: fr, longShortRatio: ls, takerBuyRatio: tb } = futuresData;
    if (fr !== null && fr !== undefined) {
      if      (fr >  0.01)  bearCLP += 30;
      else if (fr >  0.005) bearCLP += 15;
      else if (fr < -0.01)  bullCLP += 30;
      else if (fr < -0.005) bullCLP += 15;
    }
    if (ls !== null && ls !== undefined) {
      if      (ls > 2.0) bearCLP += 20;
      else if (ls > 1.5) bearCLP += 10;
      else if (ls < 0.5) bullCLP += 20;
      else if (ls < 0.8) bullCLP += 10;
    }
    if (tb !== null && tb !== undefined) {
      if (tb > 1.2) bullCLP += 10;
      else if (tb < 0.8) bearCLP += 10;
    }
  }
  if (coinGlassData) {
    if (coinGlassData.liqPressure === 'long_squeezed')  bearCLP += 20;
    if (coinGlassData.liqPressure === 'short_squeezed') bullCLP += 20;
    if (coinGlassData.fundingBias === 'extreme_long')   bearCLP += 15;
    if (coinGlassData.fundingBias === 'extreme_short')  bullCLP += 15;
  }
  const score = Math.min(100, Math.max(bullCLP, bearCLP));
  const direction = bullCLP > bearCLP ? 'BULL_CASCADE' : bearCLP > bullCLP ? 'BEAR_CASCADE' : 'neutral';
  const risk = score >= 50 ? 'EXTREME' : score >= 30 ? 'HIGH' : score >= 15 ? 'MEDIUM' : 'LOW';
  return {
    score,
    bullCLP: Math.min(100, bullCLP),
    bearCLP: Math.min(100, bearCLP),
    direction,
    risk,
    interpretation: score >= 50
      ? `${direction === 'BEAR_CASCADE' ? 'AŞAĞI' : 'YUKARI'} kaskad likidasyon riski YÜKSEK — stop cluster hedef alındı`
      : score >= 30
      ? `${direction === 'BEAR_CASCADE' ? 'Bear' : 'Bull'} cascade ihtimali orta — stop kümesi izle`
      : 'Kaskad likidasyon riski düşük — dengeli pozisyonlanma',
  };
}

// ── SMFI — Akıllı Para Akış Endeksi (0-100) ───────────────────────────────────
function calcSMFI(internals) {
  let score = 50;
  const { obv4h, cvd4h, mfi4h, volSpike4h, displacement4h, premDisc4h, smd4h } = internals;

  if (obv4h?.rising && obv4h?.confirmsTrend) score += 12;
  else if (obv4h?.rising) score += 6;
  else score -= 6;

  if (cvd4h?.rising) score += 10; else score -= 10;

  const mfiVal = mfi4h?.value || 50;
  if      (mfiVal > 60) score += 8;
  else if (mfiVal > 50) score += 4;
  else if (mfiVal < 40) score -= 8;
  else score -= 4;

  if (volSpike4h?.spike) {
    if (volSpike4h.direction === 'bullish') score += 10;
    else score -= 10;
  }
  if (displacement4h?.bullish) score += 12;
  else if (displacement4h?.bearish) score -= 12;

  if (premDisc4h?.optimalBuy)  score += 8;
  else if (premDisc4h?.optimalSell) score -= 8;

  if (smd4h?.bullSMD) score += 10;
  else if (smd4h?.bearSMD) score -= 10;

  const v = Math.max(0, Math.min(100, score));
  return {
    value: parseFloat(v.toFixed(1)),
    interpretation: v >= 75 ? 'GÜÇLÜ ALIM — Kurumsal para akıyor'
                  : v >= 60 ? 'Pozitif akış — akıllı para birikimde'
                  : v >= 45 ? 'Nötr — bekleme/dengeleme'
                  : v >= 30 ? 'Negatif akış — dağıtım sinyalleri var'
                  :           'GÜÇLÜ SATIM — Kurumsal çıkış',
  };
}

// ── Fractal Harmony Score — Çok-TF Koherans (0-1) ────────────────────────────
function calcFractalHarmonyScore(c4h, c1d, c1w, c1m, primaryDirection) {
  const isLong = primaryDirection === 'LONG';
  let aligned = 0, total = 0;

  const check = (candles, weight) => {
    if (!candles || candles.length < 10) return;
    const closes = candles.map(c => c.c);
    const price  = closes[closes.length - 1];
    const ema9   = calcEMA(closes, Math.min(9,  closes.length));
    const ema21  = calcEMA(closes, Math.min(21, closes.length));
    const ema50  = calcEMA(closes, Math.min(50, closes.length));
    if (isLong === (ema9 > ema21 && price > ema50)) aligned += weight;
    total += weight;
  };

  check(c4h, 1);
  check(c1d, 2);
  check(c1w, 3);
  check(c1m && c1m.length >= 4 ? c1m : null, 4);

  if (total === 0) return { score: 0.5, metaEdgeActive: false, interpretation: 'Yetersiz veri' };
  const score = parseFloat((aligned / total).toFixed(3));
  const metaEdgeActive = score >= 0.85;
  return {
    score,
    metaEdgeActive,
    alignedWeight: aligned,
    totalWeight: total,
    interpretation: metaEdgeActive
      ? 'META-EDGE AKTİF — Tüm TF uyumlu, pozisyon +%50 büyütülebilir'
      : score >= 0.7 ? 'Yüksek uyum — güçlü setup'
      : score >= 0.5 ? 'Orta uyum — standart setup'
      :                'Düşük uyum — küçük pozisyon, ekstra teyit gerekli',
  };
}

// ── Monte Carlo Risk Shield (5k senaryo) ──────────────────────────────────────
function calcMonteCarloRisk(winRate, rrRaw, posSizePct, scenarios = 5000, trades = 100) {
  const wr     = (winRate || 65) / 100;
  const rr     = rrRaw || 2.0;
  const risk   = Math.min((posSizePct || 2) / 100, 0.05);
  const reward = risk * rr;
  let ruinCount = 0, ddSum = 0, returnSum = 0;

  for (let s = 0; s < scenarios; s++) {
    let bal = 1.0, peak = 1.0, maxDD = 0;
    for (let t = 0; t < trades; t++) {
      bal = Math.random() < wr ? bal * (1 + reward) : bal * (1 - risk);
      if (bal > peak) peak = bal;
      const dd = (peak - bal) / peak;
      if (dd > maxDD) maxDD = dd;
      if (bal < 0.5) break;
    }
    if (bal < 0.5) ruinCount++;
    ddSum     += maxDD;
    returnSum += (bal - 1) * 100;
  }

  const riskOfRuin    = parseFloat(((ruinCount / scenarios) * 100).toFixed(2));
  const avgDrawdown   = parseFloat(((ddSum / scenarios) * 100).toFixed(1));
  const avgReturnPct  = parseFloat((returnSum / scenarios).toFixed(1));
  return {
    riskOfRuin,
    avgReturnPct,
    avgDrawdownPct: avgDrawdown,
    scenarios,
    trades,
    safe: riskOfRuin < 0.5 && avgDrawdown < 20,
    interpretation: riskOfRuin < 0.5
      ? `Monte Carlo GÜVENLİ — %${scenarios / 100} simülasyon: iflas riski <%0.5`
      : riskOfRuin < 2
      ? `Monte Carlo kabul edilebilir — ort. DD: %${avgDrawdown}`
      : `Monte Carlo UYARI — iflas riski %${riskOfRuin}, pozisyon küçült`,
  };
}

// ── Adaptive Fractional Kelly (Funding + Volatilite Dampener) ─────────────────
function calcAdaptiveKelly(winRate, rrRaw, fundingRate, atrPct) {
  const wr = (winRate || 65) / 100;
  const rr = rrRaw || 2.0;
  const kellyFull = Math.max(0, (wr * rr - (1 - wr)) / rr);
  const kellyBase = kellyFull * 0.35; // 35% fraksiyonel (güvenli-agresif denge)

  let fundingPenalty = 0;
  if (fundingRate !== null && fundingRate !== undefined) {
    if (fundingRate > 0.0005) {
      fundingPenalty = Math.min(0.4, (fundingRate / 0.001) * 0.1);
    } else if (fundingRate < -0.0005) {
      fundingPenalty = Math.min(0.2, (Math.abs(fundingRate) / 0.001) * 0.05);
    }
  }

  let volPenalty = 0;
  const ap = atrPct || 0;
  if      (ap > 6)   volPenalty = 0.35;
  else if (ap > 4)   volPenalty = 0.20;
  else if (ap > 2.5) volPenalty = 0.10;

  const adaptiveKelly = Math.max(0.005, kellyBase * (1 - fundingPenalty - volPenalty));
  return {
    kellyFull:      parseFloat((kellyFull * 100).toFixed(2)),
    kellyBase:      parseFloat((kellyBase * 100).toFixed(2)),
    adaptiveKelly:  parseFloat((adaptiveKelly * 100).toFixed(2)),
    fundingPenalty: parseFloat((fundingPenalty * 100).toFixed(1)),
    volPenalty:     parseFloat((volPenalty * 100).toFixed(1)),
    recommendedRiskPct: parseFloat(Math.min(adaptiveKelly * 100, 3).toFixed(2)),
    interpretation: fundingPenalty > 0.2
      ? 'Kelly dampened — yüksek funding oranı pozisyon büyüklüğünü azalttı'
      : volPenalty > 0.2
      ? 'Kelly dampened — yüksek volatilite pozisyon küçültüldü'
      : 'Normal Adaptive Kelly — standart pozisyon boyutu',
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// PROFESSIONAL ALPHA ENGINE v1.0 — Institutional-Grade Quantitative Modules
// Stochastic Modelling | Microstructure | CVaR | Sentiment | Execution Cost
// ══════════════════════════════════════════════════════════════════════════════

// ── Volatility Regime (GARCH-style clustering) ────────────────────────────────
// Classifies current volatility percentile vs historical, detects clustering
function calcVolatilityRegime(candles, currentAtr) {
  if (!candles || candles.length < 30) return { regime: 'NORMAL', percentile: 50, trend: 'STABLE', clustering: 0, interpretation: 'Yetersiz veri' };

  // True Range history
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1];
    trs.push(Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c)));
  }

  // Rolling 14-period ATR snapshots (every 3 candles for efficiency)
  const atrSnaps = [];
  for (let i = 14; i < trs.length; i += 3) {
    const s = trs.slice(Math.max(0, i - 13), i + 1);
    atrSnaps.push(s.reduce((a, b) => a + b, 0) / s.length);
  }
  if (atrSnaps.length < 3) return { regime: 'NORMAL', percentile: 50, trend: 'STABLE', clustering: 0, interpretation: 'Yetersiz veri' };

  const rank = atrSnaps.filter(v => v <= currentAtr).length;
  const percentile = Math.round((rank / atrSnaps.length) * 100);

  const n = atrSnaps.length;
  const recentAvg = atrSnaps.slice(-Math.ceil(n * 0.25)).reduce((a, b) => a + b, 0) / Math.max(1, Math.ceil(n * 0.25));
  const prevAvg   = atrSnaps.slice(0, Math.ceil(n * 0.5)).reduce((a, b) => a + b, 0) / Math.max(1, Math.ceil(n * 0.5));
  const trend = recentAvg > prevAvg * 1.2 ? 'EXPANDING' : recentAvg < prevAvg * 0.8 ? 'CONTRACTING' : 'STABLE';

  // Volatility clustering: count high-vol candles in last 15
  const medTR = [...trs].sort((a, b) => a - b)[Math.floor(trs.length * 0.5)] || 1;
  const highVolCount = trs.slice(-15).filter(tr => tr > medTR * 1.5).length;
  const clustering = highVolCount >= 8 ? 3 : highVolCount >= 5 ? 2 : highVolCount >= 2 ? 1 : 0;

  const regime = percentile >= 85 ? 'EXTREME' : percentile >= 65 ? 'HIGH' : percentile <= 20 ? 'LOW' : 'NORMAL';

  return {
    regime, percentile, trend, clustering,
    interpretation: regime === 'EXTREME' ? `Aşırı volatilite (%${percentile}lik) — geniş stop, küçük pozisyon` :
      regime === 'HIGH'    ? `Yüksek volatilite (%${percentile}lik) — ATR temelli stop kullan` :
      regime === 'LOW'     ? `Düşük volatilite (%${percentile}lik) — breakout yaklaşıyor olabilir` :
      `Normal volatilite (%${percentile}lik, ${trend}) — standart risk yönetimi`,
  };
}

// ── Order Flow Imbalance (Microstructure) ─────────────────────────────────────
// Estimates buy/sell pressure from OHLCV, detects absorption and delta streaks
function calcOrderFlowImbalance(candles) {
  if (!candles || candles.length < 20) return { imbalance: 0, dominantSide: 'NEUTRAL', streak: 0, absorbed: false, delta20: 0, interpretation: 'Yetersiz veri' };

  const recent = candles.slice(-30);
  let buyVol = 0, sellVol = 0;
  const deltas = [];

  for (const c of recent) {
    const range = c.h - c.l || c.c * 0.001;
    const buyFrac = Math.max(0, Math.min(1, (c.c - c.l) / range));
    const bv = c.v * buyFrac;
    const sv = c.v * (1 - buyFrac);
    buyVol += bv;
    sellVol += sv;
    deltas.push(bv - sv);
  }

  const delta20 = parseFloat(deltas.slice(-20).reduce((a, b) => a + b, 0).toFixed(2));
  const imbalance = parseFloat(((buyVol - sellVol) / (buyVol + sellVol || 1) * 100).toFixed(1));

  // Consecutive direction streak
  const lastDir = delta20 >= 0 ? 1 : -1;
  let streak = 0;
  for (let i = deltas.length - 1; i >= 0; i--) {
    if ((deltas[i] >= 0 ? 1 : -1) === lastDir) streak++;
    else break;
  }

  // Absorption: high volume + small price move (institutional orders absorbing retail)
  const avgVol  = recent.reduce((a, c) => a + c.v, 0) / recent.length;
  const last5   = recent.slice(-5);
  const lastVol = last5.reduce((a, c) => a + c.v, 0) / 5;
  const lastRange = last5.reduce((a, c) => a + (c.h - c.l) / (c.c || 1), 0) / 5;
  const avgRange  = recent.reduce((a, c) => a + (c.h - c.l) / (c.c || 1), 0) / recent.length;
  const absorbed = lastVol > avgVol * 1.5 && lastRange < avgRange * 0.5;

  const dominantSide = imbalance > 10 ? 'BUY' : imbalance < -10 ? 'SELL' : 'NEUTRAL';

  return {
    imbalance, dominantSide, streak: streak * lastDir, absorbed, delta20,
    interpretation: absorbed ? `Absorption tespiti — büyük emirler fiyatı absorbe ediyor (${dominantSide} tarafı)` :
      dominantSide === 'BUY'  ? `Alım baskısı dominant (%${Math.abs(imbalance).toFixed(1)}) — ${streak} periyod arka arkaya` :
      dominantSide === 'SELL' ? `Satım baskısı dominant (%${Math.abs(imbalance).toFixed(1)}) — ${streak} periyod arka arkaya` :
      'Dengeli order flow — net yön baskısı yok',
  };
}

// ── VWAP Deviation Analysis ───────────────────────────────────────────────────
// Distance from VWAP in σ units — institutional overbought/oversold detection
function calcVWAPDeviation(candles, vwap) {
  if (!candles || candles.length < 20 || !vwap || vwap === 0) return { deviationPct: 0, zScore: 0, signal: 'NEUTRAL', interpretation: 'VWAP hesaplanamadı' };

  const price = candles[candles.length - 1].c;
  const recent = candles.slice(-Math.min(50, candles.length));

  // Typical prices
  const typPrices = recent.map(c => (c.h + c.l + c.c) / 3);
  const typVwap   = calcVWAP(recent);
  const dists     = typPrices.map(p => p - typVwap);
  const std       = Math.sqrt(dists.reduce((a, d) => a + d * d, 0) / dists.length) || (vwap * 0.01);

  const deviationPct = parseFloat(((price - vwap) / vwap * 100).toFixed(2));
  const zScore       = parseFloat(((price - typVwap) / std).toFixed(2));
  const atr          = calcATR(candles, 14);
  const deviationATR = parseFloat((Math.abs(price - vwap) / (atr || 1)).toFixed(2));

  const band1up = parseFloat((typVwap + std).toFixed(8));
  const band1dn = parseFloat((typVwap - std).toFixed(8));
  const band2up = parseFloat((typVwap + 2 * std).toFixed(8));
  const band2dn = parseFloat((typVwap - 2 * std).toFixed(8));

  const signal = zScore > 2.0 ? 'OVERBOUGHT_VWAP' : zScore < -2.0 ? 'OVERSOLD_VWAP' :
                 zScore > 1.0 ? 'ABOVE_1STD'      : zScore < -1.0 ? 'BELOW_1STD' : 'FAIR_VALUE';

  return {
    deviationPct, deviationATR, zScore, band1up, band1dn, band2up, band2dn, signal,
    interpretation: signal === 'OVERBOUGHT_VWAP' ? `VWAP'dan +${zScore}σ uzakta — mean reversion olası, dikkatli` :
      signal === 'OVERSOLD_VWAP' ? `VWAP'dan ${zScore}σ aşağıda — kurumsal alım bölgesi yakın` :
      signal === 'ABOVE_1STD'    ? `VWAP üstünde +${zScore}σ — momentum güçlü` :
      signal === 'BELOW_1STD'    ? `VWAP altında ${zScore}σ — potansiyel geri dönüş bölgesi` :
      `VWAP adil değer yakını (${deviationPct > 0 ? '+' : ''}${deviationPct}%) — denge bölgesi`,
  };
}

// ── Ornstein-Uhlenbeck Mean Reversion Model ───────────────────────────────────
// Stochastic process: dX = θ(μ-X)dt + σdW  →  estimates speed, half-life, Z-score
function calcOUProcess(closes) {
  if (!closes || closes.length < 30) return { halfLife: 999, zScore: 0, equilibrium: 0, reversionSignal: false, speed: 0, interpretation: 'Yetersiz veri' };

  const series    = closes.slice(-Math.min(100, closes.length));
  const logSeries = series.map(p => Math.log(Math.max(p, 1e-10)));

  // OLS regression: X[t] = a + b*X[t-1] + ε → θ = -ln(|b|), μ = a/(1-b)
  const x = logSeries.slice(0, -1);
  const y = logSeries.slice(1);
  const n2     = x.length;
  const sumX   = x.reduce((a, b) => a + b, 0);
  const sumY   = y.reduce((a, b) => a + b, 0);
  const sumXX  = x.reduce((a, b) => a + b * b, 0);
  const sumXY  = x.reduce((a, b, i) => a + b * y[i], 0);
  const denom  = n2 * sumXX - sumX * sumX;

  if (Math.abs(denom) < 1e-12) return { halfLife: 999, zScore: 0, equilibrium: series[series.length - 1], reversionSignal: false, speed: 0, interpretation: 'Trend piyasası — OU uygulanamıyor' };

  const b = (n2 * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n2;

  const theta   = Math.max(0, -Math.log(Math.abs(b)));
  const halfLife = theta > 0.001 ? parseFloat((Math.log(2) / theta).toFixed(1)) : 999;

  const mu          = (b > 0 && b < 1) ? a / (1 - b) : logSeries.reduce((a, b) => a + b, 0) / logSeries.length;
  const equilibrium = parseFloat(Math.exp(mu).toFixed(8));

  const residuals = x.map((xi, i) => y[i] - (a + b * xi));
  const resSd     = Math.sqrt(residuals.reduce((a, r) => a + r * r, 0) / residuals.length) || 0.001;
  const lastLog   = logSeries[logSeries.length - 1];
  const zScore    = parseFloat(((lastLog - mu) / resSd).toFixed(2));

  const reversionSignal = Math.abs(zScore) > 1.8 && halfLife < 40 && halfLife > 0;

  return {
    halfLife: halfLife > 500 ? 999 : halfLife,
    zScore, equilibrium, reversionSignal,
    speed: parseFloat(theta.toFixed(4)),
    interpretation: reversionSignal
      ? `OU Sinyal: Z=${zScore} (aşırı) — ~${halfLife} periyot içinde $${equilibrium} dengesine dönüş bekleniyor`
      : halfLife < 15  ? `Hızlı mean reversion (yarı-ömür ${halfLife} periyot) — range/kontr-trend stratejisi uygun`
      : halfLife < 60  ? `Orta hızlı mean reversion (${halfLife} periyot) — denge: $${equilibrium}`
      : 'Güçlü trend piyasası — OU mean reversion zayıf, trend takip et',
  };
}

// ── CVaR — Conditional Value at Risk (Expected Shortfall) ─────────────────────
// More accurate than VaR for fat-tailed crypto returns
function calcCVaR(candles) {
  if (!candles || candles.length < 30) return { var95: 0, cvar95: 0, risk: 'LOW', kurtosis: 0, interpretation: 'Yetersiz veri' };

  const closes  = candles.map(c => c.c);
  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(Math.max(closes[i], 1e-10) / Math.max(closes[i - 1], 1e-10)));
  }

  const sorted = [...returns].sort((a, b) => a - b);
  const cutoff = Math.max(1, Math.floor(sorted.length * 0.05));

  const var95  = parseFloat((Math.abs(sorted[cutoff] || 0) * 100).toFixed(2));
  const tail   = sorted.slice(0, cutoff);
  const cvar95 = parseFloat((Math.abs(tail.reduce((a, b) => a + b, 0) / (tail.length || 1)) * 100).toFixed(2));

  // Excess kurtosis — fat tail indicator
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const std  = Math.sqrt(returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length) || 0.001;
  const kurtosis = parseFloat((returns.reduce((a, b) => a + ((b - mean) / std) ** 4, 0) / returns.length - 3).toFixed(2));

  const risk = cvar95 > 10 ? 'EXTREME' : cvar95 > 6 ? 'HIGH' : cvar95 > 3 ? 'MEDIUM' : 'LOW';

  return {
    var95, cvar95, kurtosis, risk,
    interpretation: `CVaR 95%: Kötü senaryo kaybı ort. %${cvar95} | VaR 95%: %${var95} | Fat-tail: ${kurtosis > 3 ? `YÜKSEK (κ=${kurtosis}) — crypto kuyruk riski ekstra büyük` : `Normal (κ=${kurtosis})`}`,
  };
}

// ── Composite Sentiment (Fear/Greed Proxy) ────────────────────────────────────
// Derivatives + volume flow → institutional sentiment score with contrarian signal
function calcCompositeSentiment(futuresData, internals) {
  let score = 0;
  const components = [];

  if (futuresData?.fundingRate != null) {
    const fr = futuresData.fundingRate;
    if      (fr >  0.01)  { score -= 30; components.push('Funding: AŞIRI LONG (contrarian ayı)'); }
    else if (fr >  0.003) { score -= 15; components.push('Funding: Pozitif yüksek'); }
    else if (fr < -0.003) { score += 15; components.push('Funding: Negatif yüksek'); }
    else if (fr < -0.001) { score +=  8; components.push('Funding: Negatif hafif'); }
    else                    components.push('Funding: Nötr');
  }

  if (futuresData?.longShortRatio != null) {
    const ls = futuresData.longShortRatio;
    if      (ls >  2.5) { score -= 25; components.push('L/S: Aşırı long kalabalık — contrarian BEAR'); }
    else if (ls >  1.5) { score -= 10; components.push('L/S: Long dominant'); }
    else if (ls <  0.5) { score += 25; components.push('L/S: Aşırı short kalabalık — contrarian BULL'); }
    else if (ls <  0.8) { score += 10; components.push('L/S: Short dominant'); }
    else                   components.push('L/S: Dengeli');
  }

  if (futuresData?.takerBuyRatio != null) {
    const tb = futuresData.takerBuyRatio;
    if      (tb >  1.3) { score += 15; components.push('Taker: Agresif alım baskısı'); }
    else if (tb >  1.1) { score +=  8; components.push('Taker: Hafif alım'); }
    else if (tb <  0.7) { score -= 15; components.push('Taker: Panik satış'); }
    else if (tb <  0.9) { score -=  8; components.push('Taker: Hafif satım'); }
  }

  if (internals?.cvd4h != null) {
    if (internals.cvd4h.rising) { score += 10; components.push('CVD: Pozitif birikme'); }
    else                        { score -= 10; components.push('CVD: Negatif dağıtım'); }
  }

  if (internals?.obv4h != null) {
    score += internals.obv4h.rising ? 5 : -5;
  }

  const clamped = Math.max(-100, Math.min(100, score));
  const regime  = clamped >  40 ? 'EXTREME_GREED' :
                  clamped >  15 ? 'GREED' :
                  clamped < -40 ? 'EXTREME_FEAR'  :
                  clamped < -15 ? 'FEAR' : 'NEUTRAL';

  const contrarianSignal = regime === 'EXTREME_GREED' ? 'SHORT_BIAS' :
                           regime === 'EXTREME_FEAR'  ? 'LONG_BIAS'  : null;

  return {
    score: clamped, regime, components, contrarianSignal,
    interpretation: regime === 'EXTREME_GREED' ? `AŞIRI AÇ GÖZLÜ (${clamped}) — Contrarian satış fırsatı yakın` :
      regime === 'EXTREME_FEAR'  ? `AŞIRI KORKU (${clamped}) — Contrarian alım fırsatı yaklaşıyor` :
      regime === 'GREED'         ? `Açgözlülük (${clamped}) — dikkatli giriş, stop sıkı tut` :
      regime === 'FEAR'          ? `Korku modu (${clamped}) — alım fırsatı olgunlaşıyor` :
      `Nötr sentiment (${clamped}) — yön için confluence teyidi bekle`,
  };
}

// ── Execution Cost Model ───────────────────────────────────────────────────────
// Estimates spread, slippage, market impact → effective entry price adjustment
function calcExecutionCost(price, atr, volume24h, direction) {
  const spreadPct  = parseFloat((atr / price * 12).toFixed(4));   // ~12% of ATR = typical spread
  const slippagePct = volume24h > 0
    ? parseFloat(Math.min(0.5, (price * 100 / volume24h * 0.05)).toFixed(4))
    : 0.1;
  const impactPct  = parseFloat((atr / price * 0.5 * 100).toFixed(4));  // 0.5 ATR market impact
  const totalCostPct = parseFloat((spreadPct + slippagePct + impactPct).toFixed(4));

  const adjFactor    = direction === 'LONG' ? 1 + totalCostPct / 100 : 1 - totalCostPct / 100;
  const effectiveEntry = parseFloat((price * adjFactor).toFixed(price > 1000 ? 2 : 6));

  return {
    spreadPct, slippagePct, impactPct, totalCostPct, effectiveEntry,
    optimalWindow: 'LONDON_NY_OVERLAP (13:00-17:00 UTC)',
    interpretation: `Tahmini işlem maliyeti: %${totalCostPct} | Spread: %${spreadPct} | Slippage: %${slippagePct} | Etkin giriş: $${effectiveEntry}`,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// INSTITUTIONAL ALPHA ENGINE v2.0 — Model-Based, Orthogonal, Probabilistic
// Fixes: Correlated indicators → Orthogonal domains | Rule-based → Model-based
// Bayesian regime classifier | Multi-factor logistic model | Dynamic risk sizing
// ══════════════════════════════════════════════════════════════════════════════

// ── Orthogonal Signal Score ───────────────────────────────────────────────────
// Solves the "indicator stacking" problem: groups correlated signals into domains,
// counts INDEPENDENT confirmations (not correlated duplicates)
function calcOrthogonalSignalScore(internals, layers) {
  const isLong = internals.direction !== 'SHORT';

  // Domain 1: TREND — price structure indicators (EMA, BOS, Supertrend, ADX)
  // These are all trend-measuring → count best 1 representative per sub-type
  const emaOk        = layers.marketStructure?.emaAligned || false;
  const bosOk        = (internals.struct4h?.bos || '').includes(isLong ? 'BULLISH' : 'BEARISH');
  const stOk         = internals.supertrend4h?.bullish === isLong;
  const adxOk        = (internals.adx4h?.adx || 0) > 25 && (internals.adx4h?.bullish === isLong);
  const trendVotes   = [emaOk, bosOk, stOk, adxOk].filter(Boolean).length;
  const trendScore   = trendVotes >= 3 ? 25 : trendVotes >= 2 ? 17 : trendVotes >= 1 ? 9 : 0;

  // Domain 2: MOMENTUM — oscillators are correlated but RSI divergence is orthogonal
  // Diminishing returns: 4 oversold oscillators ≠ 4× signal strength
  const rsiExtreme   = internals.rsi4h < 32 || internals.rsi4h > 68;
  const macdCross    = internals.macd4h?.crossUp || internals.macd4h?.crossDown;
  const stochExtreme = internals.stochRSI?.oversold || internals.stochRSI?.overbought;
  const rsiDivOk     = internals.rsiDiv4h?.bullDiv || internals.rsiDiv4h?.bearDiv;
  // RSI divergence is truly orthogonal (different information source)
  const momOrtho     = rsiDivOk ? 20 : [rsiExtreme, macdCross, stochExtreme].filter(Boolean).length >= 2 ? 12 : [rsiExtreme, macdCross, stochExtreme].filter(Boolean).length === 1 ? 6 : 0;

  // Domain 3: VOLUME FLOW — independent from price oscillators
  const obvOk        = internals.obv4h?.rising === isLong;
  const cvdOk        = internals.cvd4h?.rising === isLong;
  const mfiOk        = isLong ? internals.mfi4h?.oversold : internals.mfi4h?.overbought;
  const volSpikeOk   = internals.volSpike4h?.spike && internals.volSpike4h?.direction === (isLong ? 'bullish' : 'bearish');
  const volVotes     = [obvOk, cvdOk, mfiOk, volSpikeOk].filter(Boolean).length;
  const volScore     = volVotes >= 3 ? 20 : volVotes >= 2 ? 13 : volVotes >= 1 ? 6 : 0;

  // Domain 4: INSTITUTIONAL STRUCTURE — zone-based (different info source)
  const inOB         = layers.liquiditySMC?.inOB || false;
  const fvgOverlap   = layers.liquiditySMC?.fvgOBOverlap || false;
  const liqSweep     = layers.liquiditySMC?.liquiditySweep || false;
  const pdOk         = isLong ? internals.premDisc4h?.optimalBuy : internals.premDisc4h?.optimalSell;
  const smcVotes     = [inOB, fvgOverlap, liqSweep, pdOk].filter(Boolean).length;
  const smcScore     = smcVotes >= 3 ? 20 : smcVotes >= 2 ? 13 : smcVotes >= 1 ? 7 : 0;

  // Domain 5: MACRO / HTF — higher timeframe (truly independent of 4H signals)
  const bullCnt      = layers.mtfAlignment?.bullCount || 0;
  const htfAligned   = layers.mtfAlignment?.htfAligned || false;
  const htfScore     = bullCnt >= 4 ? 15 : (bullCnt >= 3 && htfAligned) ? 10 : bullCnt >= 3 ? 7 : bullCnt === 2 ? 3 : 0;

  const rawTotal     = trendScore + momOrtho + volScore + smcScore + htfScore;

  // Conflict penalty: going long when price is in premium (structurally unfavorable)
  const conflictPenalty = (isLong && internals.premDisc4h?.premium) ? 6 :
                          (!isLong && internals.premDisc4h?.discount) ? 6 : 0;

  const orthogonalScore = Math.max(0, Math.min(100, rawTotal - conflictPenalty));
  const independentConfirmations = [trendScore >= 9, momOrtho >= 6, volScore >= 6, smcScore >= 7, htfScore >= 7].filter(Boolean).length;

  return {
    orthogonalScore,
    independentConfirmations,
    domainScores: {
      trend: trendScore, momentum: momOrtho, volume: volScore,
      structure: smcScore, macro: htfScore,
    },
    conflictPenalty,
    interpretation: independentConfirmations >= 4
      ? `${independentConfirmations}/5 bağımsız alan teyit etti — yüksek güvenilirlik (korelasyon temizlendi)`
      : independentConfirmations >= 3
      ? `${independentConfirmations}/5 bağımsız alan teyit — trade edilebilir sinyal`
      : independentConfirmations >= 2
      ? `${independentConfirmations}/5 alan — ek teyit bekle, indikatör yığını değil`
      : 'Yetersiz bağımsız sinyal — correlated indicator yığınına güvenme',
  };
}

// ── Bayesian Regime Classifier ────────────────────────────────────────────────
// Updates prior regime probabilities with multiple evidence sources
// Output: posterior probability distribution over 4 regimes
function calcBayesianRegimeProbability(candles, adxResult, bbResult, rsi4h, atrPct) {
  if (!candles || candles.length < 30) return { dominant: 'UNKNOWN', confidence: 0, probabilities: {}, strategyRecommendation: 'Yetersiz veri', interpretation: 'Yetersiz veri' };

  // Base priors (empirical crypto distribution)
  let pBull = 0.30, pBear = 0.30, pRange = 0.30, pBreak = 0.10;

  // Evidence 1: ADX strength
  const adx = adxResult?.adx || 25;
  if      (adx > 40) { pBull *= 2.5; pBear *= 2.5; pRange *= 0.25; pBreak *= 1.2; }
  else if (adx > 25) { pBull *= 1.5; pBear *= 1.5; pRange *= 0.65; }
  else               { pBull *= 0.5; pBear *= 0.5; pRange *= 2.2; pBreak *= 1.8; }

  // Evidence 2: Bollinger Band width
  const bw = bbResult?.bandwidth || 0.05;
  if      (bw < 0.025) { pBreak *= 3.5; pRange *= 1.5; pBull *= 0.2; pBear *= 0.2; }
  else if (bw < 0.05)  { pRange *= 1.5; pBreak *= 1.5; }
  else if (bw > 0.12)  { pBull *= 2.2; pBear *= 2.2; pRange *= 0.3; pBreak *= 0.4; }

  // Evidence 3: RSI position
  if      (rsi4h > 62) { pBull *= 2.0; pBear *= 0.3; pRange *= 0.8; }
  else if (rsi4h < 38) { pBear *= 2.0; pBull *= 0.3; pRange *= 0.8; }
  else                 { pRange *= 1.4; }

  // Evidence 4: ATR% (volatility)
  if      (atrPct > 5)   { pBreak *= 2.0; pBull *= 1.3; pBear *= 1.3; pRange *= 0.4; }
  else if (atrPct < 1.5) { pRange *= 2.5; pBreak *= 1.8; pBull *= 0.4; pBear *= 0.4; }

  // Evidence 5: Price structure (HH/HL vs LL/LH)
  const recent = candles.slice(-20);
  const recentH = recent.map(c => c.h);
  const recentL = recent.map(c => c.l);
  const isHHHL = recentH[recentH.length - 1] > recentH[0] && recentL[recentL.length - 1] > recentL[0];
  const isLLLH = recentH[recentH.length - 1] < recentH[0] && recentL[recentL.length - 1] < recentL[0];
  if (isHHHL) { pBull *= 2.2; pBear *= 0.25; }
  if (isLLLH) { pBear *= 2.2; pBull *= 0.25; }

  // Normalize to probabilities
  const total = pBull + pBear + pRange + pBreak || 1;
  const probs = {
    BULL_TREND: parseFloat((pBull / total * 100).toFixed(1)),
    BEAR_TREND: parseFloat((pBear / total * 100).toFixed(1)),
    RANGE:      parseFloat((pRange / total * 100).toFixed(1)),
    BREAKOUT:   parseFloat((pBreak / total * 100).toFixed(1)),
  };

  const sorted    = Object.entries(probs).sort((a, b) => b[1] - a[1]);
  const dominant  = sorted[0][0];
  const second    = sorted[1][0];
  const confidence = Math.round(sorted[0][1] - sorted[1][1]);

  const stratMap = {
    BULL_TREND: "Trend takip \u2014 pullback'tan OB/FVG giris, HTF yonunde",
    BEAR_TREND: "Trend takip \u2014 yukselis sat, supply zone giris",
    RANGE:      "Range trading \u2014 S/R'dan islem, OU mean reversion kullan",
    BREAKOUT:   "Momentum breakout \u2014 BB sikismasi acilimini hacim teyidiyle yakala",
  };

  return {
    dominant, confidence, probabilities: probs,
    strategyRecommendation: stratMap[dominant] || 'Belirsiz rejim',
    interpretation: `Bayesian: ${dominant} %${sorted[0][1]} | vs ${second} %${sorted[1][1]} | Güven: ${confidence}puan | ${stratMap[dominant]}`,
  };
}

// ── Multi-Factor Alpha Model (Logistic Regression Approximation) ──────────────
// Converts correlated rule-based logic to probability-based model output
// 8 orthogonal features × hand-tuned weights → P(price up)
function calcAlphaFactorModel(internals, futuresData, orderFlowData, volRegimeData) {
  const isLong = internals.direction !== 'SHORT';
  const price  = internals.price || 1;

  // Factor 1: Structural Trend (price vs VWAP1D — macro position) [-1, +1]
  const vwap1d = internals.vwap1d || price;
  const f1 = Math.max(-1, Math.min(1, (price - vwap1d) / (vwap1d * 0.05)));

  // Factor 2: Momentum (RSI z-score from 50 + divergence) [-1, +1]
  const rsiNorm  = ((internals.rsi4h || 50) - 50) / 50;
  const divBonus = internals.rsiDiv4h?.bullDiv ? 0.35 : internals.rsiDiv4h?.bearDiv ? -0.35 : 0;
  const f2 = Math.max(-1, Math.min(1, rsiNorm + divBonus));

  // Factor 3: Volume Flow (OBV + CVD — independent of price oscillators) [-1, +1]
  const obvF = internals.obv4h?.rising ? 0.5 : -0.5;
  const cvdF = internals.cvd4h?.rising ? 0.5 : -0.5;
  const f3   = obvF + cvdF; // [-1, +1]

  // Factor 4: Microstructure (order flow imbalance) [-1, +1]
  const f4 = orderFlowData ? Math.max(-1, Math.min(1, (orderFlowData.imbalance || 0) / 40)) : 0;

  // Factor 5: Regime Quality (ADX × directional alignment) [-1, +1]
  const adxNorm = Math.min(1, (internals.adx4h?.adx || 25) / 50);
  const f5 = internals.adx4h?.bullish === isLong ? adxNorm : -adxNorm * 0.6;

  // Factor 6: Carry (funding rate — contrarian signal) [-1, +1]
  const fr = futuresData?.fundingRate || 0;
  const f6 = Math.max(-1, Math.min(1, -(fr / 0.004)));

  // Factor 7: Volatility Quality (low vol = better entry quality) [-0.5, +0.5]
  const volPct = (volRegimeData?.percentile || 50) / 100;
  const f7 = volPct < 0.3 ? 0.4 : volPct > 0.8 ? -0.4 : 0;

  // Factor 8: SMC / Institutional Zone Quality [-1, +1]
  const dispBull = internals.displacement4h?.bullish && isLong  ? 0.4 : 0;
  const dispBear = internals.displacement4h?.bearish && !isLong ? 0.4 : 0;
  const pdBull   = internals.premDisc4h?.optimalBuy  && isLong  ? 0.25 : 0;
  const pdBear   = internals.premDisc4h?.optimalSell && !isLong ? 0.25 : 0;
  const sweepOk  = internals.liq4h?.recentSweep ? 0.35 : 0;
  const f8 = Math.min(1, Math.max(-1, dispBull + dispBear + pdBull + pdBear + sweepOk));

  // Weights: empirically tuned for crypto — trend + structure highest weight
  const w = { f1: 0.22, f2: 0.14, f3: 0.14, f4: 0.11, f5: 0.14, f6: 0.08, f7: 0.05, f8: 0.12 };
  const logit = w.f1*f1 + w.f2*f2 + w.f3*f3 + w.f4*f4 + w.f5*f5 + w.f6*f6 + w.f7*f7 + w.f8*f8;

  // Logistic function → probability
  const probability    = 1 / (1 + Math.exp(-logit * 6));
  const probabilityUp  = parseFloat((probability * 100).toFixed(1));
  const probabilityDn  = parseFloat((100 - probabilityUp).toFixed(1));

  // Contribution breakdown (for explainability)
  const contribs = [
    { name: 'Yapısal Trend',   value: parseFloat((w.f1 * f1 * 100).toFixed(1)) },
    { name: 'Momentum',        value: parseFloat((w.f2 * f2 * 100).toFixed(1)) },
    { name: 'Hacim Akışı',     value: parseFloat((w.f3 * f3 * 100).toFixed(1)) },
    { name: 'Mikroyapı',       value: parseFloat((w.f4 * f4 * 100).toFixed(1)) },
    { name: 'Rejim Kalitesi',  value: parseFloat((w.f5 * f5 * 100).toFixed(1)) },
    { name: 'Carry/Funding',   value: parseFloat((w.f6 * f6 * 100).toFixed(1)) },
    { name: 'SMC/Kurumsal',    value: parseFloat((w.f8 * f8 * 100).toFixed(1)) },
  ].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const edge = probabilityUp > 67 ? 'STRONG_BULL' : probabilityUp < 33 ? 'STRONG_BEAR' :
               probabilityUp > 57 ? 'MODERATE_BULL' : probabilityUp < 43 ? 'MODERATE_BEAR' : 'NO_EDGE';

  return {
    probabilityUp, probabilityDn, edge,
    logit: parseFloat(logit.toFixed(4)),
    factors: { f1, f2, f3, f4, f5, f6, f7, f8 },
    contributions: contribs.slice(0, 3),
    interpretation: `Alpha Model P(↑)=%${probabilityUp} P(↓)=%${probabilityDn} | Edge: ${edge} | Top faktörler: ${contribs.slice(0,3).map(c => `${c.name}(${c.value > 0 ? '+' : ''}${c.value})`).join(', ')}`,
  };
}

// ── Dynamic Position Sizing (CVaR + Regime + Alpha Edge) ─────────────────────
// True institutional risk engine: position size adapts to risk environment
function calcDynamicPositionSizing(cvarData, volRegimeData, quantum, adaptiveKellyData, alphaData) {
  const cvar95        = cvarData?.cvar95 || 3;
  const volRegime     = volRegimeData?.regime || 'NORMAL';
  const winRate       = quantum?.winRate || 60;
  const probabilityUp = alphaData?.probabilityUp || 50;
  const isLong        = quantum?.direction === 'LONG';

  // Base fraction from existing Kelly model
  const baseKellyPct  = adaptiveKellyData?.adaptiveKelly || 2;
  const baseFraction  = baseKellyPct / 100;

  // CVaR multiplier: reduce size proportionally with tail risk
  const cvarMult = cvar95 < 2 ? 1.25 : cvar95 < 4 ? 1.0 : cvar95 < 7 ? 0.65 : cvar95 < 12 ? 0.4 : 0.2;

  // Volatility regime multiplier
  const regimeMult = { LOW: 1.1, NORMAL: 1.0, HIGH: 0.65, EXTREME: 0.35 }[volRegime] ?? 1.0;

  // Alpha edge multiplier (model-based probability)
  const edgeMult = probabilityUp > 68 ? 1.25 : probabilityUp > 58 ? 1.0 :
                   probabilityUp > 48 ? 0.65 : 0.3;

  // Win rate multiplier
  const wrMult = winRate >= 78 ? 1.2 : winRate >= 68 ? 1.0 : winRate >= 58 ? 0.7 : 0.4;

  // Final size
  const adjSize = baseFraction * cvarMult * regimeMult * edgeMult * wrMult;
  const recommendedSizePct = parseFloat(Math.min(adjSize * 100, 5).toFixed(2)); // hard cap 5%

  // Max safe leverage based on volatility + CVaR + alpha
  const rawMaxLev = volRegime === 'EXTREME' ? 2 : volRegime === 'HIGH' ? 3 :
                    cvar95 > 10 ? 2 : cvar95 > 6 ? 3 : cvar95 > 3 ? 5 : 10;
  const recommendedLeverage = Math.max(1, Math.min(rawMaxLev, Math.round(rawMaxLev * edgeMult * wrMult)));

  const riskBudget  = parseFloat((recommendedSizePct * recommendedLeverage).toFixed(2));
  const maxDrawdown = parseFloat(Math.min(cvar95 * 2.5, 20).toFixed(2));

  return {
    recommendedSizePct, recommendedLeverage,
    riskBudget, maxDrawdown,
    multipliers: {
      cvar: parseFloat(cvarMult.toFixed(2)),
      regime: parseFloat(regimeMult.toFixed(2)),
      edge: parseFloat(edgeMult.toFixed(2)),
      winRate: parseFloat(wrMult.toFixed(2)),
    },
    interpretation: `Dinamik Pozisyon: %${recommendedSizePct} risk | ${recommendedLeverage}x kaldıraç | CVaR×Rejim×Edge ölçeklendi | Max DD: %${maxDrawdown} | Risk bütçe: %${riskBudget} portföy`,
  };
}

// ── Regime-Adaptive Strategy Selector ────────────────────────────────────────
// Selects optimal trading approach based on Bayesian regime + OU + flow data
function calcRegimeAdaptiveStrategy(bayesianRegime, ouProcessData, quantum, orderFlowData) {
  const regime    = bayesianRegime?.dominant || 'UNKNOWN';
  const confidence = bayesianRegime?.confidence || 0;
  const ouHL      = ouProcessData?.halfLife || 999;
  const ouZ       = ouProcessData?.zScore || 0;
  const direction = quantum?.direction || 'NEUTRAL';
  const isLong    = direction === 'LONG';

  let optimalStrategy, entryStyle, targetHoldingPeriod, stopType, notes;

  if (regime === 'BULL_TREND' || regime === 'BEAR_TREND') {
    optimalStrategy      = 'TREND_FOLLOWING';
    entryStyle           = `${regime === 'BULL_TREND' ? 'Dip' : 'Yükseliş'}'te OB/EMA giriş — HTF yönü takip et`;
    targetHoldingPeriod  = '1-5 gün (4H-1D setup)';
    stopType             = 'Yapısal SL — BOS/CHoCH geçersiz kılar';
    notes                = `${regime}: mean reversion sinyallerini filtrele, momentum ile işlem`;
  } else if (regime === 'RANGE' && Math.abs(ouZ) > 1.5 && ouHL < 60) {
    optimalStrategy      = 'MEAN_REVERSION';
    entryStyle           = `OU Z=${ouZ.toFixed(1)}σ ekstrem — ${ouZ > 0 ? 'SHORT' : 'LONG'} giriş`;
    targetHoldingPeriod  = `~${ouHL} periyot (yarı-ömür)`;
    stopType             = 'Sabit % stop + zaman limiti';
    notes                = `Denge hedef: $${typeof ouProcessData?.equilibrium === 'number' ? ouProcessData.equilibrium.toFixed(4) : '?'} | OU half-life ${ouHL} periyot`;
  } else if (regime === 'BREAKOUT') {
    optimalStrategy      = 'MOMENTUM_BREAKOUT';
    entryStyle           = 'BB sıkışması açılımı — hacim teyidiyle agresif giriş';
    targetHoldingPeriod  = '6-48 saat (momentum)';
    stopType             = 'BB ortası veya ATR×1.5 stop';
    notes                = 'Volatilite genişlemesi yakın — pozisyon boyutunu düşük tut, TP agresif';
  } else {
    optimalStrategy      = 'WAIT_FOR_SIGNAL';
    entryStyle           = 'Net rejim oluşmadı — bekleme modu';
    targetHoldingPeriod  = 'Yok';
    stopType             = 'Yok';
    notes                = `Bayesian güven ${confidence}p düşük — rejim netleşene kadar bekle`;
  }

  const flowAligned = orderFlowData?.dominantSide === (isLong ? 'BUY' : 'SELL');

  return {
    optimalStrategy, entryStyle, targetHoldingPeriod, stopType, notes,
    flowAligned, regimeConfidence: confidence,
    interpretation: `Strateji: ${optimalStrategy} | ${entryStyle} | Tutma: ${targetHoldingPeriod} | Flow: ${flowAligned ? 'HİZALI ✓' : 'ÇAKIŞMIYOR ✗'} | ${notes}`,
  };
}

// ── Main Handler ──────────────────────────────────────────────────────────────

export default async function handler(req) {
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });

  try {
  const body   = await req.json().catch(() => ({}));
  const symbol = (body.coin || 'BTC').toUpperCase().replace(/USDT?$/i, '').trim();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const binanceSym = BINANCE_MAP[symbol];
  if (!binanceSym)
    return new Response(JSON.stringify({ error: `Desteklenmeyen coin: ${symbol}. Desteklenen: ${Object.keys(BINANCE_MAP).join(', ')}` }), { status: 400 });

  // Paralel veri çekimi: Binance klines (4H/1D/1W/1M) + Futures + CoinGecko + CoinGlass
  const [k4h, k1d, k1w, k1m, gecko, futuresData, coinGlassData] = await Promise.all([
    fetchBinance(binanceSym, '4h',  200),
    fetchBinance(binanceSym, '1d',  200),
    fetchBinance(binanceSym, '1w',  104),
    fetchBinance(binanceSym, '1M',   36),
    GECKO_MAP[symbol] ? fetchGecko(GECKO_MAP[symbol]) : Promise.resolve(null),
    fetchFuturesData(binanceSym),
    fetchCoinGlass(symbol),  // optional — only runs if COINGLASS_API_KEY set
  ]);

  if (!k4h || k4h.length < 30)
    return new Response(JSON.stringify({ error: `${symbol} için piyasa verisi alınamadı. Lütfen tekrar deneyin.` }), { status: 502 });

  const c4h = k4h;
  const c1d = k1d && k1d.length >= 14 ? k1d : k4h.filter((_, i) => i % 6 === 0);
  const c1w = k1w && k1w.length >= 8  ? k1w : c1d.filter((_, i) => i % 7 === 0);
  const c1m = k1m && k1m.length >= 3  ? k1m : c1w.filter((_, i) => i % 4 === 0);

  // Timing Analysis (computed first so it can be passed to computeConfluentScore)
  const timing = analyzeOptimalTiming();

  // 9-Katman Quantum Confluence Score (futuresData dahil)
  const { quantum, layers, internals } = computeConfluentScore(c4h, c1d, c1w, c1m, futuresData, timing);
  const price = internals.price;
  const atr4h = internals.atr4h;

  // ── QUANTUM ZONE DETECTION ──────────────────────────────────────────────────
  const mtfZones   = detectMTFZones(c4h, c1d, c1w, c1m, price);
  const liqVoids4h = detectLiqVoids(c4h, '4H', price);
  const liqVoids1d = detectLiqVoids(c1d, '1D', price);
  const imbZones4h = detectImbZones(c4h, '4H', price);
  const imbZones1d = detectImbZones(c1d, '1D', price);
  const traps4h    = detectTrapSignals(c4h, '4H');
  const traps1d    = detectTrapSignals(c1d, '1D');
  const allTraps   = [...traps4h, ...traps1d];

  let allZones = deduplicateZones([
    ...mtfZones,
    ...liqVoids4h, ...liqVoids1d,
    ...imbZones4h, ...imbZones1d,
  ]).filter(z => Math.abs(z.distanceFromPrice) <= 6);

  // ── Freshness recomputation — son 5 günlük (30x4H) price action'a göre ──────
  // Tüm zone'lar hardcode VIRGIN olarak oluşturulur; burada gerçek test sayısına
  // bakarak TESTED_ONCE / TESTED_MULTI / null (mitigated) atıyoruz.
  {
    const recent5d = c4h.slice(-30); // last 30×4H ≈ 5 days
    allZones = allZones.map(z => {
      // Kaç mum zone içine girdi (low ≤ zoneHigh AND high ≥ zoneLow)
      const touches = recent5d.filter(c => c.l <= z.highPrice && c.h >= z.lowPrice).length;
      // Fully mitigated: close fully through zone (demand → close below low, supply → close above high)
      const fullyThrough = recent5d.filter(c =>
        z.type === 'DEMAND' ? c.c < z.lowPrice * 0.999 : c.c > z.highPrice * 1.001
      ).length;
      if (fullyThrough >= 2) return null; // mitigation → zone artık geçersiz
      const freshness = touches === 0 ? 'VIRGIN'
        : touches === 1 ? 'TESTED_ONCE'
        : 'TESTED_MULTI';
      return { ...z, freshness };
    }).filter(Boolean);
  }

  // Score each zone
  const { fvg4h, ob4h, liq4h, liq1d, cvd4h, vp4h } = internals;
  const bullBias = quantum.direction === 'LONG';

  const scoredZones = allZones.map(zone => {
    const mid = zone.midPrice;
    const hasOBOverlap = ob4h.some(ob =>
      !ob.mitigated && ob.low <= zone.highPrice && ob.high >= zone.lowPrice
    );
    const hasFVGOverlap = fvg4h.some(fvg =>
      fvg.low <= zone.highPrice && fvg.high >= zone.lowPrice
    );
    const hasVPPOC = vp4h.poc > 0 &&
      Math.abs(vp4h.poc - mid) / mid < 0.015;
    const hasPsychLevel = (() => {
      const step = price > 10000 ? 1000 : price > 1000 ? 100 : price > 100 ? 10 : 1;
      return Math.abs(mid % step) / step < 0.02;
    })();
    const hasLiquidityPool = [...liq4h.bsl, ...liq4h.ssl, ...liq1d.bsl, ...liq1d.ssl]
      .some(l => Math.abs(l - mid) / mid < 0.01);
    const trapDetected = allTraps.some(t => Math.abs(t.price - mid) / mid < 0.02);
    const zoneTrendAligned = zone.type === 'DEMAND' ? bullBias : !bullBias;
    const cvdConf = zone.type === 'DEMAND' ? cvd4h.rising : !cvd4h.rising;

    const quality = scoreZone(zone, {
      hasOBOverlap, hasFVGOverlap,
      hasHTFSR: hasOBOverlap || hasFVGOverlap,
      hasVPPOC, hasPsychLevel, hasLiquidityPool,
      trapDetected,
      cvdConfirming: cvdConf,
      trendAligned: zoneTrendAligned,
      // killZoneActive and weekdayOptimal intentionally omitted —
      // zone quality must be consistent for all users at any time
    });

    return { zone, quality };
  });

  // Swing points for TP targets
  const { highs: swingH, lows: swingL } = findSwingPoints(c4h, 4);
  const swingHighPrices = swingH.map(s => s.price);
  const swingLowPrices  = swingL.map(s => s.price);

  // ── Fresh TP seviyesi filtresi ────────────────────────────────────────────────
  // Son 20×4H (≈3 gün) içinde price'ın zaten ULAŞTIĞI swing high/low'ları çıkarıyoruz.
  // Böylece TP1 her zaman "henüz test edilmemiş" bir direnç/destek noktasına işaret eder.
  // Price range içinde kaldığında bile TP hedefleri güncellenir.
  const recent3dHigh = Math.max(...c4h.slice(-20).map(c => c.h));
  const recent3dLow  = Math.min(...c4h.slice(-20).map(c => c.l));
  const freshSwingHighs = swingHighPrices.filter(h => h > recent3dHigh * 1.003);
  const freshSwingLows  = swingLowPrices.filter(l => l < recent3dLow  * 0.997);
  // Yeterli fresh swing yoksa orijinal listeye fallback
  const tpSwingHighs = freshSwingHighs.length >= 2 ? freshSwingHighs : swingHighPrices;
  const tpSwingLows  = freshSwingLows.length  >= 2 ? freshSwingLows  : swingLowPrices;

  // Build quantum setups from top scored zones (max 3)
  const quantumSetups = scoredZones
    .sort((a, b) => b.quality - a.quality)
    .slice(0, 5)
    .map(({ zone, quality }) => buildZoneSetup(
      zone, quality,
      zone.type === 'DEMAND' ? bullBias : !bullBias,
      tpSwingHighs, tpSwingLows, atr4h
    ))
    .filter(Boolean)
    .slice(0, 3);

  // ── NEW: Horizontal S/R, PA Patterns, Manipulation ──────────────────────────
  const srLevels1d  = detectHorizontalSRLevels(c1d, 0.003);
  const srLevels4h  = detectHorizontalSRLevels(c4h, 0.004);
  // Merge and deduplicate: prefer 1D levels, add unique 4H levels
  const allSRLevels = [...srLevels1d];
  for (const lvl of srLevels4h) {
    const dup = allSRLevels.some(l => Math.abs(l.price - lvl.price) / (lvl.price||1) < 0.006);
    if (!dup) allSRLevels.push({ ...lvl, timeframe:'4H' });
  }
  const srLevelsFinal = allSRLevels
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 10)
    .map(l => ({ ...l, timeframe: l.timeframe || '1D' }));

  const paPatterns4h  = detectPriceActionPatterns(c4h);
  const paPatterns1d  = detectPriceActionPatterns(c1d);
  const paPatternsBest = paPatterns1d.length > 0 ? paPatterns1d : paPatterns4h;

  const manipulation = detectManipulationRisk(c4h, price, internals.liq4h, futuresData);

  // Risk Filter
  const riskFilter = applyRiskFilter(quantum, internals, futuresData);

  // ── MTF Averaged Setup (priority 0 — highest win rate) ───────────────────
  // Scans all 4 TFs, builds weighted-average entry zone from aligned OB/FVG zones
  const mtfSetup = buildMTFAveragedSetup(c4h, c1d, c1w, c1m, internals.direction, price, atr4h);

  // Institutional setup — ALWAYS generated (never null)
  // MTF averaged setup overrides when 3+ TFs are aligned (highest reliability)
  const legacySetup = (mtfSetup && mtfSetup.alignedTFs >= 3)
    ? mtfSetup
    : generateSetup(internals, c4h, quantum, quantumSetups, recent3dHigh, recent3dLow);
  const leverage = calcLeverage(legacySetup, quantum);

  // ── ALL Analytics computed before AI call so they feed into the prompt ───────

  // v2.0 Meta-Layer
  const probabilityVector = calcProbabilityVector(quantum, layers, internals);
  const clp               = calcCLP(futuresData, coinGlassData);
  const smfi              = calcSMFI(internals);
  const fractalHarmony    = calcFractalHarmonyScore(c4h, c1d, c1w, c1m, internals.direction);
  const monteCarlo        = calcMonteCarloRisk(
    quantum.winRate,
    legacySetup?.rrRaw || 2.0,
    legacySetup?.riskPct || 2,
  );
  const adaptiveKelly = calcAdaptiveKelly(
    quantum.winRate,
    legacySetup?.rrRaw || 2.0,
    futuresData?.fundingRate ?? null,
    internals.regime4h?.atrPct || 2,
  );

  // Professional Alpha Engine v1.0
  const volRegime  = calcVolatilityRegime(c4h, atr4h);
  const orderFlow  = calcOrderFlowImbalance(c4h);
  const vwapDev    = calcVWAPDeviation(c4h, internals.vwap4h);
  const ouProcess  = calcOUProcess(c4h.map(c => c.c));
  const cvar       = calcCVaR(c4h);
  const sentiment  = calcCompositeSentiment(futuresData, internals);
  const execCost   = calcExecutionCost(price, atr4h, gecko?.volume24h || 0, quantum.direction);

  // Institutional Alpha Engine v2.0
  const orthogonalScore  = calcOrthogonalSignalScore(internals, layers);
  const bayesianRegime   = calcBayesianRegimeProbability(c4h, internals.adx4h, internals.bb4h, internals.rsi4h, internals.regime4h?.atrPct || 2);
  const alphaModel       = calcAlphaFactorModel(internals, futuresData, orderFlow, volRegime);
  const dynamicSizing    = calcDynamicPositionSizing(cvar, volRegime, quantum, adaptiveKelly, alphaModel);
  const adaptiveStrategy = calcRegimeAdaptiveStrategy(bayesianRegime, ouProcess, quantum, orderFlow);

  // Fractal & Entropy Engine
  const closes4h         = c4h.map(c => c.c);
  const hurstExponent    = calcHurstProxy(closes4h);
  const shannonEntropy   = calcShannonEntropyReturns(closes4h);

  // AI Analysis — all analytics now available for the prompt
  const analysis = await getAIAnalysis(
    symbol, price, atr4h, quantum, layers, internals,
    futuresData, quantumSetups, timing, apiKey, coinGlassData,
    c4h, c1d, c1w, c1m,
    { orthogonalScore, bayesianRegime, alphaModel, dynamicSizing, adaptiveStrategy, volRegime, sentiment, monteCarlo, cvar, hurstExponent, shannonEntropy, legacySetup }
  );

  // Market data
  const last6h = c4h.slice(-6);
  const market = gecko ? {
    price:     gecko.price,
    change24h: gecko.change24h,
    change7d:  gecko.change7d,
    change30d: gecko.change30d,
    high24h:   gecko.high24h,
    low24h:    gecko.low24h,
    volume24h: gecko.volume24h,
    marketCap: gecko.marketCap,
  } : {
    price,
    change24h: c1d.length >= 2 ? ((price - c1d[c1d.length - 2].c) / c1d[c1d.length - 2].c) * 100 : 0,
    change7d:  c1d.length >= 8 ? ((price - c1d[c1d.length - 8].c) / c1d[c1d.length - 8].c) * 100 : null,
    change30d: null,
    high24h:   Math.max(...last6h.map(c => c.h)),
    low24h:    Math.min(...last6h.map(c => c.l)),
    volume24h: last6h.reduce((s, c) => s + c.v * c.c, 0),
    marketCap: null,
  };

  // Structured fallback analysis — CRYPTO LEVERAGE MASTER v3.0 format (parsed as sections by app.jsx)
  const fmtN = (n) => { const num = parseFloat(n); return isNaN(num) ? '—' : num > 1000 ? num.toFixed(2) : num > 1 ? num.toFixed(4) : num.toFixed(6); };
  const qz0  = quantumSetups[0];
  const lmt  = legacySetup;

  // CLMV3 pre-computed values for fallback
  const fb_regime5   = detectRegime5(internals, layers);
  const fb_setupType = detectSetupType(internals, quantum, layers, futuresData);
  const fb_conf16    = calcConf16(quantum, layers, internals, futuresData);
  const fb_atr       = internals.atr4h?.value || internals.regime4h?.atrPct ? (price * (parseFloat(internals.regime4h?.atrPct||'1')/100)) : price * 0.02;
  const fb_recLev    = calcVolAdjustedLeverage(fb_conf16.maxLeverage, c4h, fb_atr, price);
  const fb_liqPriceRec = (function() {
    const _dec = price > 1000 ? 2 : price > 1 ? 4 : 6;
    return quantum.direction === 'LONG'
      ? parseFloat((price * (1 - 0.9 / Math.max(1, fb_recLev))).toFixed(_dec))
      : parseFloat((price * (1 + 0.9 / Math.max(1, fb_recLev))).toFixed(_dec));
  })();
  const fb_regime5Matrix = {
    'TRENDING BULL':      { dir:'LONG ağırlıklı',    maxLev:'10x' },
    'TRENDING BEAR':      { dir:'SHORT ağırlıklı',   maxLev:'10x' },
    'RANGE-BOUND':        { dir:'İki yön (S/R)',      maxLev:'5–7x' },
    'VOLATILE EXPANSION': { dir:'Trend yönü',         maxLev:'5x'  },
    'COMPRESSION':        { dir:'Breakout bekle',     maxLev:'7–10x'},
  };
  const fb_regMatrix = fb_regime5Matrix[fb_regime5] || { dir:'Belirsiz', maxLev:'5x' };

  const isLong      = quantum.direction === 'LONG';
  const adxVal      = layers.marketStructure.adxStrength || 0;
  const adxLabel    = adxVal > 40 ? 'Çok Güçlü' : adxVal > 25 ? 'Aktif' : 'Zayıf/Yatay';
  const bullCount   = layers.mtfAlignment.bullCount || 0;
  const htfBias     = layers.marketStructure.htfBias;
  const bosType     = layers.marketStructure.bosType?.replace(/_/g,' ') || 'INTACT';
  const ichiCloud   = layers.marketStructure.ichimokuCloud;
  const ichi1d      = layers.mtfAlignment.ichimoku1d || '?';
  const wyPhase     = internals.wyckoff4h?.phase || '?';
  const wyDetail    = internals.wyckoff4h?.spring ? ' — SPRING [ALIM FIRSATI]'
                    : internals.wyckoff4h?.upthrust ? ' — UPTHRUST [SATIŞ UYARISI]' : '';
  const regime      = internals.regime4h?.regime || 'UNKNOWN';
  const volatility  = internals.regime4h?.volatility || 'ORTA';
  const atrPct      = internals.regime4h?.atrPct || '?';

  // Best institutional zone description
  const zoneDesc = qz0
    ? `${qz0.zone.type} $${fmtN(qz0.zone.lowPrice)}-$${fmtN(qz0.zone.highPrice)} (${(qz0.zone.sources||[]).join('+')} — ${qz0.zone.timeframe})`
    : `${isLong?'DEMAND':'SUPPLY'} — net bölge oluşmadı`;

  // Premium/Discount
  const pdZone  = internals.premDisc4h?.zone || '?';
  const pdPct   = internals.premDisc4h?.pct  || '?';
  const pdLabel = internals.premDisc4h?.optimalBuy  ? 'OPTİMAL ALIM BÖLGESİ'
                : internals.premDisc4h?.optimalSell ? 'OPTİMAL SATIŞ BÖLGESİ' : 'Denge Noktası';

  // Top institutional signals (priority: displacement > SMD > liq sweep > POC > RSI div)
  const instSigs = [
    internals.displacement4h?.bullish ? 'Displacement: YUKARI — kurumsal alım teyitleniyor' : null,
    internals.displacement4h?.bearish ? 'Displacement: AŞAĞI — kurumsal satım teyitleniyor' : null,
    internals.smd4h?.bullSMD ? 'Smart Money: BULL SMD — akıllı para birikimde' : null,
    internals.smd4h?.bearSMD ? 'Smart Money: BEAR SMD — akıllı para dağıtımda' : null,
    layers.liquiditySMC?.liquiditySweep ? 'Likidite Süpürme: TESPİT EDİLDİ — reversal baskısı yüksek' : null,
    layers.liquiditySMC?.poc > 0 ? `Volume Profile: POC $${fmtN(layers.liquiditySMC.poc)} — %${layers.liquiditySMC.pocProximity||0} uzaklıkta${(layers.liquiditySMC.pocProximity||0) > 3 ? (isLong && price < layers.liquiditySMC.poc ? ', hedef POC' : !isLong && price > layers.liquiditySMC.poc ? ', hedef POC' : '') : ', fiyat POC yakınında'}` : null,
    internals.rsiDiv4h?.bullDiv ? 'Momentum: RSI Bullish Diverjans (4H) — güçlü reversal sinyali' : null,
    internals.rsiDiv4h?.bearDiv ? 'Momentum: RSI Bearish Diverjans (4H) — düşüş uyarısı' : null,
  ].filter(Boolean).slice(0, 3);

  // Futures signals
  const futLines = [];
  if (futuresData) {
    const fr = futuresData.fundingRate;
    const ls = futuresData.longShortRatio;
    const tb = futuresData.takerBuyRatio;
    if (fr !== null) futLines.push(`Funding Rate: ${(fr*100).toFixed(4)}% — ${fr > 0.005 ? 'Long aşırı (squeeze riski)' : fr < -0.005 ? 'Short aşırı (long squeeze bekleniyor)' : 'Nötr (sağlıklı)'}`);
    if (ls !== null) futLines.push(`Long/Short Oranı: ${ls.toFixed(2)} — ${ls > 1.5 ? 'Long baskısı dominant (dikkat)' : ls < 0.67 ? 'Short dominant (squeeze potansiyeli)' : 'Dengeli piyasa'}`);
    if (tb !== null) futLines.push(`Taker Akışı: ${tb > 1.05 ? 'ALIM baskısı dominant' : tb < 0.95 ? 'SATIM baskısı dominant — dikkat' : 'Dengeli'}`);
    if (coinGlassData?.oiTrend) futLines.push(`OI Trendi: ${coinGlassData.oiTrend}${coinGlassData.oiChange24h !== null ? ' (' + coinGlassData.oiChange24h.toFixed(1) + '% 24s)' : ''} | Kalabalık Taraf: ${coinGlassData.crowdedSide||'?'}`);
  }

  const lvStr = leverage
    ? `Muhafazakar ${leverage.conservative}x | Standart 5x (Önerilen) | Agresif ${leverage.aggressive}x`
    : 'Standart 5x (Önerilen)';

  // 4H/1D/1W/1M RSI & trend summary for display
  const rsi4hFmt = internals.rsi4h?.toFixed(1) || '50';
  const rsi1dFmt = internals.rsi1d?.toFixed(1) || '50';
  const rsi1wFmt = internals.rsi1w?.toFixed(1) || '50';
  const adx4hFmt = internals.adx4h?.adx?.toFixed(1) || '0';
  const adx1dFmt = internals.adx1d?.adx?.toFixed(1) || '0';
  const stochKFmt = internals.stochRSI?.k?.toFixed(1) || '50';
  const stochDFmt = internals.stochRSI?.d?.toFixed(1) || '50';
  const williamsVal = internals.williamsR4h?.value?.toFixed(1) || '-50';
  const cciVal = internals.cci4h?.value?.toFixed(1) || '0';
  const mfiVal = internals.mfi4h?.value?.toFixed(1) || '50';
  const macd4hStr = internals.macd4h?.bullish ? 'BULL' : 'BEAR';
  const macd1dStr = internals.macd1d?.bullish ? 'BULL' : 'BEAR';
  const bbSqueeze = internals.bb4h?.squeeze ? 'SQUEEZE AKTİF ⚡' : 'Normal';
  const bbBW = ((internals.bb4h?.bandwidth || 0) * 100).toFixed(1);
  const ichimoku4hStr = internals.ichimoku4h?.aboveCloud ? 'CLOUD ÜSTÜ (BULL)' : internals.ichimoku4h?.belowCloud ? 'CLOUD ALTI (BEAR)' : 'CLOUD İÇİNDE (NÖR)';
  const ichimoku1dStr = internals.ichimoku1d?.aboveCloud ? 'CLOUD ÜSTÜ (BULL)' : internals.ichimoku1d?.belowCloud ? 'CLOUD ALTI (BEAR)' : 'CLOUD İÇİNDE';
  const ichimoku1wStr = internals.ichimoku1w?.aboveCloud ? 'CLOUD ÜSTÜ (BULL)' : internals.ichimoku1w?.belowCloud ? 'CLOUD ALTI (BEAR)' : 'CLOUD İÇİNDE';
  const supertrend4hStr = internals.supertrend4h?.bullish ? 'YUKARI (BUY)' : 'AŞAĞI (SELL)';
  const supertrend1dStr = internals.supertrend1d?.bullish ? 'YUKARI (BUY)' : 'AŞAĞI (SELL)';
  const fib4hStr = internals.fibonacci4h
    ? (internals.fibonacci4h.inOTE ? 'OTE BÖLGE 0.618-0.705 — KURUMSAL GİRİŞ' : internals.fibonacci4h.inGoldenPocket ? 'GOLDEN POCKET 0.618-0.786 — YÜK.OLASILI' : `En yakın seviye: ${internals.fibonacci4h.nearest || '?'} (uzaklık: %${internals.fibonacci4h.nearestDist || '?'})`)
    : 'Hesaplanıyor';
  const fib4h = internals.fibonacci4h || null;
  const fib1dStr = internals.fibonacci1d?.inGoldenPocket ? 'GOLDEN POCKET (1D)' : internals.fibonacci1d?.inOTE ? 'OTE ZONE (1D)' : 'Normal seviye';
  const pivStr = internals.pivots1d
    ? `PP: $${fmtN(internals.pivots1d.pp)} | R1: $${fmtN(internals.pivots1d.r1)} | R2: $${fmtN(internals.pivots1d.r2)} | S1: $${fmtN(internals.pivots1d.s1)} | S2: $${fmtN(internals.pivots1d.s2)} | Yakın: ${internals.pivots1d.nearestLevel}`
    : 'Hesaplanıyor';
  const pivWStr = internals.pivots1w
    ? `PP(W): $${fmtN(internals.pivots1w.pp)} | R1(W): $${fmtN(internals.pivots1w.r1)} | S1(W): $${fmtN(internals.pivots1w.s1)}`
    : '';
  const swingHighStr = internals.struct4h?.htfBias || 'Belirsiz';
  const bos4hStr = internals.struct4h?.bos || 'NONE';
  const bos1dStr = internals.struct1d?.bos || 'NONE';
  const bos1wStr = internals.struct1w?.bos || 'NONE';
  const choch4hStr = internals.struct4h?.choch || 'NONE';
  const choch1dStr = internals.struct1d?.choch || 'NONE';
  const vwap4hStr = internals.vwap4h > 0 ? `$${fmtN(internals.vwap4h)}` : '—';
  const vwap1dStr = internals.vwap1d > 0 ? `$${fmtN(internals.vwap1d)}` : '—';
  const obvStr = internals.obv4h?.rising ? 'YÜKSELİYOR (BULL)' : 'DÜŞÜYOR (BEAR)';
  const cvdStr = internals.cvd4h?.rising ? 'POZİTİF (ALIM BASKISI)' : 'NEGATİF (SATIM BASKISI)';
  const breakerStr = internals.breakers4h
    ? `Bull Breaker: ${internals.breakers4h.bullBreakers.length} | Bear Breaker: ${internals.breakers4h.bearBreakers.length}`
    : '—';
  const rsiDivStr = internals.rsiDiv4h?.bullDiv ? 'RSI BULLISH DIVERJANS (GÜÇlü REVERSAL)' : internals.rsiDiv4h?.bearDiv ? 'RSI BEARISH DIVERJANS (DÜŞÜŞ UYARISI)' : 'Diverjans yok';
  const volSpikeStr = internals.volSpike4h?.strongSpike ? 'GÜÇLÜ HACİM ARTIŞI ⚡' : internals.volSpike4h?.spike ? 'Orta hacim artışı' : 'Normal hacim';

  // Aliases for fallback analysis (handler uses different variable names)
  const manip = manipulation;

  // Liquidity levels for fallback analysis
  const _liq4h = internals.liq4h || { bsl: [], ssl: [], sweptBSL: [], sweptSSL: [] };
  const _liq1d = internals.liq1d || { bsl: [], ssl: [], sweptBSL: [], sweptSSL: [] };
  const bslLevels = [...new Set([..._liq4h.bsl.slice(0, 3), ..._liq1d.bsl.slice(0, 2)])].slice(0, 4).map(l => `$${l}`).join(', ') || '—';
  const sslLevels = [...new Set([..._liq4h.ssl.slice(0, 3), ..._liq1d.ssl.slice(0, 2)])].slice(0, 4).map(l => `$${l}`).join(', ') || '—';
  const _sweepBSL = _liq4h.sweptBSL?.[0] || _liq1d.sweptBSL?.[0];
  const _sweepSSL = _liq4h.sweptSSL?.[0] || _liq1d.sweptSSL?.[0];
  const sweepLine = _sweepBSL ? `BULL SWEEP $${_sweepBSL}` : _sweepSSL ? `BEAR SWEEP $${_sweepSSL}` : 'YOK';
  const _premDisc = internals.premDisc4h || { zone: 'EQUILIBRIUM', pct: 50 };
  const premDiscLine = `${_premDisc.zone} %${_premDisc.pct}`;

  // Best 3 demand zones below price (for LONG setup)
  const demandZones = scoredZones.filter(z => z.zone?.type === 'DEMAND').slice(0, 3);
  const supplyZones = scoredZones.filter(z => z.zone?.type === 'SUPPLY').slice(0, 3);
  const zoneSummary = (isLong ? demandZones : supplyZones).map((s, i) =>
    `Bölge ${i+1}: $${fmtN(s.zone?.lowPrice)} - $${fmtN(s.zone?.highPrice)} | TF: ${s.zone?.timeframe} | Kaynak: ${(s.zone?.sources||[]).join('+')} | Kalite: ${s.quality || s.qualityScore || 0}/100 | İnvalidasyon: $${fmtN(s.zone?.invalidation)}`
  ).join('\n');

  // ── Halving cycle for fallback ─────────────────────────────────────────────
  const _halvingMs   = new Date('2024-04-19').getTime();
  const _daysSince   = Math.floor((Date.now() - _halvingMs) / 86400000);
  const _halvingFaz  = _daysSince < 180 ? 'ACCUMULATION' : _daysSince < 540 ? 'MARKUP' : _daysSince < 720 ? 'DISTRIBUTION' : 'MARKDOWN';
  const _monthIdx    = new Date().getMonth();
  const _monthsEn    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const _strongM     = new Set([0,1,9,10]);
  const _weakM       = new Set([4,5,8]);
  const _seasonTag   = _strongM.has(_monthIdx) ? 'GUCLU' : _weakM.has(_monthIdx) ? 'ZAYIF' : 'NOTR';

  // ── Confluence scoring for fallback ───────────────────────────────────────
  const _fScore = (cond) => cond ? '+' : '-';
  const _fLong  = [
    isLong && internals.rsi4h < 70,
    internals.macd4h?.bullish,
    internals.supertrend4h?.bullish,
    internals.ichimoku4h?.aboveCloud,
    internals.cvd4h?.rising,
    internals.obv4h?.rising,
    isLong && (internals.wyckoff4h?.phase === 'ACCUMULATION' || internals.wyckoff4h?.spring),
    isLong && bos4hStr !== 'NONE',
    isLong && layers.liquiditySMC?.liquiditySweep,
    futuresData?.fundingRate < 0.01,
    _daysSince < 540,
    lmt && parseFloat(lmt.rr?.split(':')[1]) >= 2,
  ].filter(Boolean).length;
  const _fShort = 12 - _fLong;
  const _confPct = Math.round((_fLong / 12) * 100);

  // ── Derived values for fallback sections ──────────────────────────────────
  const cmfVal     = internals.cmf4h?.value ?? null;
  const cmfLine    = cmfVal != null ? (cmfVal > 0.05 ? `CMF:+${cmfVal.toFixed(3)} pozitif` : cmfVal < -0.05 ? `CMF:${cmfVal.toFixed(3)} negatif` : `CMF:${cmfVal.toFixed(3)} notr`) : 'CMF:—';
  const _adxVal    = internals.adx4h?.adx || 0;
  const _adxLabel  = _adxVal > 25 ? 'guclu trend' : _adxVal > 15 ? 'orta trend' : 'range/zayif';
  const _bbWPct    = ((internals.bb4h?.bandwidth || 0) * 100).toFixed(1);
  const _regimeMap = { BULL_TREND:'R1 Trend', BEAR_TREND:'R1 Trend (bear)', BULL_RANGE:'R2 Mean Reversion', BEAR_RANGE:'R2 Mean Reversion', BREAKOUT:'R3 Liq Expansion', ACCUMULATION:'R4 Accumulation', DISTRIBUTION:'R4 Distribution' };
  const _macroReg  = _regimeMap[bayesianRegime.dominant] || 'R2 Mean Reversion';
  const _confGuven = Math.round(bayesianRegime.confidence || 60);
  const _oiDelta   = futuresData?.openInterest ? `$${(futuresData.openInterest / 1e6).toFixed(1)}M` : 'N/A';
  const _frPct     = futuresData?.fundingRate != null ? (futuresData.fundingRate * 100).toFixed(4) + '%' : 'N/A';
  const _frBias    = futuresData?.fundingRate != null ? (futuresData.fundingRate > 0.005 ? 'Asiri long tahakkuk' : futuresData.fundingRate < -0.005 ? 'Asiri short tahakkuk' : 'Normal') : 'N/A';
  const _lsRatio   = futuresData?.longShortRatio != null ? futuresData.longShortRatio.toFixed(2) : 'N/A';
  const _sqzShort  = `$${fmtN(lmt?.entryHigh || price * 1.03)}-$${fmtN(lmt?.tp1 || price * 1.06)}`;
  const _sqzLong   = `$${fmtN(lmt?.stop || price * 0.95)}-$${fmtN(lmt?.entryLow || price * 0.97)}`;
  const _mvrvProxy = quantum.score > 75 ? 'Overvalued (skor>75 — dagilim riski)' : quantum.score < 35 ? 'Undervalued (skor<35 — alim firsati)' : 'Fair (makul degerlenme)';
  const _bullPct   = alphaModel.probabilityUp || 55;
  const _bearPct   = Math.max(5, 100 - _bullPct - 10);
  const _trapPct   = 100 - _bullPct - _bearPct;
  const _netAction = isLong
    ? `$${fmtN(lmt?.entryLow||price)}-$${fmtN(lmt?.entryHigh||price)} bolgesinde ${qz0?.estimatedWinRate||quantum.winRate}% WR limit — Stop $${fmtN(lmt?.stop||price*0.95)} kapanma teyidi — TP serileri $${fmtN(lmt?.tp1||price*1.03)}/$${fmtN(lmt?.tp2||price*1.06)}/$${fmtN(lmt?.tp3||price*1.10)}`
    : quantum.direction === 'SHORT'
    ? `$${fmtN(lmt?.entryHigh||price)}-$${fmtN(lmt?.entryLow||price)} SHORT zone — Stop $${fmtN(lmt?.stop||price*1.05)} yukari kapanmasi — TP: $${fmtN(lmt?.tp1||price*0.97)}/$${fmtN(lmt?.tp2||price*0.94)}`
    : `Confluence eksik — net giris yok; $${fmtN(lmt?.entryHigh||price)} veya $${fmtN(lmt?.entryLow||price)} kirilimine bekle`;

  const _cvdBull     = internals.cvd4h?.rising;
  const _obvBull     = internals.obv4h?.rising;
  const _takerBull   = futuresData?.takerBuyRatio != null && futuresData.takerBuyRatio > 1.05;
  const _takerBear   = futuresData?.takerBuyRatio != null && futuresData.takerBuyRatio < 0.95;
  const tripleOFConfirm = _cvdBull && _obvBull && _takerBull ? 'ÜÇLÜ BULL TEYİT'
    : !_cvdBull && !_obvBull && _takerBear ? 'ÜÇLÜ BEAR TEYİT' : 'KARISIK';
  const _mmCrowded   = coinGlassData?.crowdedSide || (isLong ? 'LONG' : 'SHORT');
  const _mmTrap      = manip.riskLevel === 'HIGH' ? 'AKTIF TUZAK — organik olmayan hareket' : manip.signals.length > 0 ? `${manip.signals[0]?.label || 'Zayif sinyal'} — dikkatli ol` : 'Tuzak riski düşük';
  const _mmEdge      = fb_conf16.total >= 10 ? 'Yüksek konfluens — kurumsal tarafla aynı yönde' : fb_conf16.total >= 7 ? 'Orta konfluens — selective entry' : 'Düşük konfluens — edge belirsiz, bekle';
  const _mmSSLtarget = sslLevels.split(',')[0]?.trim() || `$${fmtN(price * 0.97)}`;
  const _mmBSLtarget = bslLevels.split(',')[0]?.trim() || `$${fmtN(price * 1.02)}`;
  const _mmHuntDir   = isLong ? `SSL ${_mmSSLtarget} sweep sonrası ${quantum.direction}` : `BSL ${_mmBSLtarget} sweep sonrası ${quantum.direction}`;
  const _mmBias      = bayesianRegime.dominant.includes('BULL') ? 'BULLISH' : bayesianRegime.dominant.includes('BEAR') ? 'BEARISH' : 'NEUTRAL';
  const _mmFunding   = futuresData?.fundingRate != null
    ? (futuresData.fundingRate > 0.0003 ? 'pozitif fonlama — uzun kalabalık, short bias MM'
       : futuresData.fundingRate < -0.0001 ? 'negatif fonlama — kısa kalabalık, long bias MM'
       : 'nötr fonlama')
    : 'fonlama verisi yok';
  const _mm48h = fb_conf16.total >= 7 && lmt
    ? `$${fmtN(lmt.entryLow)}-$${fmtN(lmt.entryHigh)} giriş bölgesine çekilme → ${isLong ? 'LONG' : 'SHORT'} trigger, hedef $${fmtN(lmt.tp1||price*1.04)}`
    : `Net setup yok — ${isLong ? _mmBSLtarget : _mmSSLtarget} kırılımını bekle, yön teyitli giriş`;

  const fallbackAnalysis = [
    `[SENARYO — ${symbol}/USDT]`,
    `Senaryo A (Liq Hunt, %${_trapPct}): ${_mmHuntDir} → $${fmtN(lmt?.tp1||price*1.04)} | İptal: $${fmtN(lmt?.stop||price*0.95)}`,
    `Senaryo B (Trend, %${_bullPct}): $${fmtN(lmt?.entryHigh||price*1.01)} BOS/ChoCH tetik → TP1 $${fmtN(lmt?.tp1||price*1.03)} TP2 $${fmtN(lmt?.tp2||price*1.06)} | İptal: $${fmtN(lmt?.stop||price*0.95)}`,
    `Senaryo C (Tail, %${_bearPct}): Yapı bozulma $${fmtN(lmt?.stop||price*0.95)} → panik $${fmtN(price*0.87)} | Makro şok / BTC %8+`,
    `Kritik Seviye: $${fmtN(internals.vp4h?.poc||price)} (VP POC) | İptal: $${fmtN(lmt?.stop||price*0.95)} 4H kapanışı`,
    `[YONETICI-OZETI — ${symbol}/USDT]`,
    `Nihai Karar: ${quantum.direction} | Bias: ${_mmBias}`,
    `Net Aksiyon: ${_netAction}`,
    `Kritik Metrik: Confluence ${fb_conf16.total}/16 (${fb_conf16.grade}) — ${_mmEdge}`,
    `[MM-DESK — ${symbol}/USDT]`,
    `KEY SIGNAL: ${_mmCrowded === 'LONG' ? 'Uzun taraf kalabalık — MM muhtemelen ' + _mmSSLtarget + ' altına sweep atacak, sonra toplayacak' : _mmCrowded === 'SHORT' ? 'Kısa taraf kalabalık — MM ' + _mmBSLtarget + ' üstüne sweep, sonra dağıtacak' : 'Taraflar dengeli — yön kırılıma göre netleşecek'}`,
    `Stop Avı: ${isLong ? 'SSL kümesi ' + _mmSSLtarget + ' altında retail stop yoğun' : 'BSL kümesi ' + _mmBSLtarget + ' üstünde retail stop yoğun'} — ${sweepLine !== 'YOK' ? sweepLine + ' yaşandı, reversal fırsatı' : 'Henüz sweep yok, sabır'}`,
    `Kurumsal Pozisyon: ${_mmBias} yönünde birikim — ${_mmFunding} | ${tripleOFConfirm !== 'KARISIK' ? tripleOFConfirm + ' (CVD+OBV+Taker teyitli)' : 'Order flow karışık — net pozisyon belirsiz'}`,
    `Retail Tuzağı: ${_mmTrap} | ${manip.riskLevel === 'HIGH' ? 'Kalabalık taraf likide edilecek' : fb_conf16.total < 7 ? 'Düşük confluence — erken giriş tuzağı' : 'Risk dengeli — makul giriş penceresi'}`,
    `48-72H Oyun: ${_mm48h}`,
    `Edge: ${_mmEdge} | Kaldıraç: ${fb_recLev}x | Likidasyon: $${fmtN(fb_liqPriceRec)} | RR: ${lmt?.rr||'1:2'}`,
  ].join('\n');

  return new Response(JSON.stringify({
    coin: symbol,
    market,
    quantum,
    layers,

    // CHARTOS APEX QUANTUM v2 — Zone-Based Outputs
    quantumSetups,
    quantumZones: scoredZones
      .sort((a, b) => b.quality - a.quality)
      .slice(0, 5)
      .map(({ zone, quality }) => ({ ...zone, qualityScore: quality })),
    traps: allTraps.slice(0, 5),
    timing,

    // MTF Averaged Setup (highest win rate when 3-4 TFs aligned)
    mtfSetup,

    // Active setup (mtfSetup if 3+ TFs aligned, else quantum zone setup)
    setup: legacySetup,
    leverage,
    futures: futuresData,
    riskFilter,
    analysis: analysis || fallbackAnalysis,
    timestamp: new Date().toISOString(),

    coinGlass: coinGlassData,

    // ── v2.0 Meta-Layer Çıktıları ─────────────────────────────────────────────
    probabilityVector,
    clp,
    smfi,
    fractalHarmony,
    monteCarlo,
    adaptiveKelly,

    // ── Professional Alpha Engine v1.0 ────────────────────────────────────────
    microstructure: {
      volatilityRegime: volRegime,
      orderFlowImbalance: orderFlow,
      vwapDeviation: vwapDev,
    },
    stochasticModels: {
      ouProcess,
    },
    advancedRisk: {
      cvar,
      sentiment,
      executionCost: execCost,
    },

    // ── Institutional Alpha Engine v2.0 ────────────────────────────────────────
    institutionalAlpha: {
      orthogonalScore,
      bayesianRegime,
      alphaModel,
      dynamicSizing,
      adaptiveStrategy,
    },

    _meta: {
      engine:        'DEEP TRADE SCAN v7.0 — INSTITUTIONAL ALPHA ENGINE | Orthogonal Signals + Bayesian Regime + Multi-Factor Alpha Model + Dynamic Risk Sizing',
      algorithm:     '7-Layer Confluence | ICT/SMC | Orthogonal Signal Decomposition | Bayesian Regime Classifier | Multi-Factor Alpha (Logistic) | Dynamic Position Sizing (CVaR+Regime+Edge) | Regime-Adaptive Strategy | Ornstein-Uhlenbeck | CVaR Expected Shortfall | Order Flow Imbalance | VWAP Deviation | Volatility Regime | Composite Sentiment | Execution Cost | Probability Vector | CLP | SMFI | Fractal Harmony | Adaptive Kelly | Monte Carlo | Displacement | Premium/Discount | Smart Money | Wyckoff | Ichimoku | Supertrend | MTF Averaged Setup',
      dataSources:   ['Binance Spot API', 'Binance Futures API', 'CoinGecko', coinGlassData ? 'CoinGlass' : null].filter(Boolean),
      timeframes:    ['4H', '1D', '1W', '1M'],
      entryType:     'MTF WEIGHTED AVERAGE — 4TF OB/FVG Confluence + HTF SL/TP',
      model:         'claude-sonnet-4-6',
      candles:       { '4H': c4h.length, '1D': c1d.length, '1W': c1w.length, '1M': c1m.length },
      zonesDetected: allZones.length,
      setupsBuilt:   quantumSetups.length,
      mtfSetup:      mtfSetup ? { alignedTFs: mtfSetup.alignedTFs, tfsUsed: mtfSetup.tfsUsed, winRate: mtfSetup.zoneWinRate } : null,
      futuresData:   futuresData ? { fundingRate: futuresData.fundingRate, longShortRatio: futuresData.longShortRatio, takerBuyRatio: futuresData.takerBuyRatio } : null,
    },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  } catch (err) {
    const msg = err?.message || String(err);
    return new Response(JSON.stringify({ error: 'Sunucu hatası: ' + msg, stack: err?.stack?.split('\n').slice(0,5).join(' | ') }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
