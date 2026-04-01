// pages/api/backtest.js
// DeepTradeScan — Trade Log & Portfolio Engine v2.0
// Historical Outcome Resolution | Trailing SL | DB Persistence | Real P&L

const SB_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_SVC = () => process.env.SUPABASE_SERVICE_KEY;

const FEE_PER_LEG = 0.001;  // 0.1% Binance taker fee
const SLIPPAGE    = 0.0008; // 0.08% slippage per side

// Coins supported on Binance for historical kline fetch
const BINANCE_COINS = new Set([
  'BTC','ETH','BNB','SOL','XRP','ADA','AVAX','DOT','ARB','OP','MATIC','LINK',
  'UNI','AAVE','GMX','PENDLE','LDO','CRV','DYDX','INJ','SUI','APT','NEAR',
  'ATOM','TON','SEI','TIA','FET','RENDER','TAO','WLD','DOGE','SHIB','PEPE',
  'WIF','BONK','FLOKI','LTC','XLM','HBAR','TRX','ORDI','RUNE','STX','ENA',
  'KAS','JTO','PYTH','STRK','IMX','ALT','W','EIGEN','MANTA','BNB',
]);

const GECKO = {
  BTC:'bitcoin',ETH:'ethereum',BNB:'binancecoin',SOL:'solana',XRP:'ripple',
  ADA:'cardano',AVAX:'avalanche-2',DOT:'polkadot',DOGE:'dogecoin',TRX:'tron',
  LTC:'litecoin',ARB:'arbitrum',OP:'optimism',IMX:'immutable-x',STRK:'starknet',
  NEAR:'near',APT:'aptos',SUI:'sui',SEI:'sei-network',INJ:'injective-protocol',
  TIA:'celestia',TON:'the-open-network',KAS:'kaspa',HBAR:'hedera-hashgraph',
  STX:'blockstack',ATOM:'cosmos',LINK:'chainlink',UNI:'uniswap',AAVE:'aave',
  CRV:'curve-dao-token',GMX:'gmx',PENDLE:'pendle',LDO:'lido-dao',
  FET:'fetch-ai',RENDER:'render-token',TAO:'bittensor',WLD:'worldcoin-wld',
  ORDI:'ordinals',PYTH:'pyth-network',JTO:'jito-governance-token',BONK:'bonk',
  SHIB:'shiba-inu',PEPE:'pepe',WIF:'dogwifcoin',FLOKI:'floki',ENA:'ethena',
  ONDO:'ondo-finance',RUNE:'thorchain',MATIC:'matic-network',
};

// ── Auth ────────────────────────────────────────────────────────────────────────
async function getUserFromToken(token) {
  if (!token) return null;
  try {
    const r = await fetch(`${SB_URL()}/auth/v1/user`, {
      headers: { apikey: SB_SVC(), Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.id ? d : null;
  } catch { return null; }
}

// ── DB Operations ───────────────────────────────────────────────────────────────
async function fetchTrades(userId, page = 1, limit = 100) {
  if (!SB_URL() || !SB_SVC()) return { items: [], total: 0, dbError: 'ENV_MISSING' };
  try {
    const offset = (page - 1) * limit;
    const r = await fetch(
      `${SB_URL()}/rest/v1/user_analyses?user_id=eq.${userId}&order=created_at.desc&limit=${limit}&offset=${offset}`,
      { headers: { apikey: SB_SVC(), Authorization: `Bearer ${SB_SVC()}`, Prefer: 'count=exact' } }
    );
    const total = parseInt(r.headers.get('content-range')?.split('/')[1] || '0');
    const data  = await r.json();
    if (!r.ok) {
      const errMsg = data?.message || data?.hint || data?.code || `HTTP ${r.status}`;
      return { items: [], total: 0, dbError: errMsg };
    }
    return { items: Array.isArray(data) ? data : [], total };
  } catch (e) { return { items: [], total: 0, dbError: e.message }; }
}

async function saveTrade(userId, payload) {
  if (!SB_URL() || !SB_SVC()) return { error: 'ENV_MISSING: SUPABASE_SERVICE_KEY or NEXT_PUBLIC_SUPABASE_URL not set' };
  try {
    const body = {
      user_id:          userId,
      coin:             String(payload.coin || '').toUpperCase().replace(/USDT?$/i, '').trim() || 'UNKNOWN',
      direction:        payload.direction || 'NEUTRAL',
      entry_mid:        parseFloat(payload.entry_mid) || 0,
      stop:             parseFloat(payload.stop) || 0,
      tp1:              parseFloat(payload.tp1) || 0,
      tp2:              parseFloat(payload.tp2) || 0,
      tp3:              parseFloat(payload.tp3) || 0,
      grade:            payload.grade || 'B',
      win_rate:         parseFloat(payload.win_rate) || 70,
      confluence_score: parseFloat(payload.confluence_score) || 0,
      rr:               typeof payload.rr === 'number' ? payload.rr : (parseFloat(String(payload.rr || '2').split(':').pop()) || 2),
      entry_method:     String(payload.entry_method || 'SMC Confluence').slice(0, 120),
      result:           'ENTRY_WAITING',
      result_r:         0,
    };
    const r = await fetch(`${SB_URL()}/rest/v1/user_analyses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SB_SVC(), Authorization: `Bearer ${SB_SVC()}`, Prefer: 'return=representation' },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    if (!r.ok) {
      const errMsg = parsed?.message || parsed?.hint || parsed?.code || `HTTP ${r.status}: ${text.slice(0, 200)}`;
      console.error('saveTrade failed:', r.status, errMsg);
      return { error: errMsg };
    }
    return parsed;
  } catch (e) {
    console.error('saveTrade exception:', e.message);
    return { error: e.message };
  }
}

async function updateTradeOutcome(id, patch) {
  if (!SB_URL() || !SB_SVC() || !id) return false;
  try {
    const r = await fetch(`${SB_URL()}/rest/v1/user_analyses?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', apikey: SB_SVC(), Authorization: `Bearer ${SB_SVC()}`, Prefer: 'return=minimal' },
      body: JSON.stringify(patch),
    });
    return r.ok;
  } catch { return false; }
}

async function deleteTrade(id, userId) {
  if (!SB_URL() || !SB_SVC()) return false;
  try {
    const r = await fetch(`${SB_URL()}/rest/v1/user_analyses?id=eq.${id}&user_id=eq.${userId}`, {
      method: 'DELETE',
      headers: { apikey: SB_SVC(), Authorization: `Bearer ${SB_SVC()}` },
    });
    return r.ok;
  } catch { return false; }
}

// ── Market Data ─────────────────────────────────────────────────────────────────
async function fetchBinance1H(coin, startMs, endMs) {
  if (!BINANCE_COINS.has(coin)) return null;
  const sym   = `${coin}USDT`;
  const limit = Math.min(1000, Math.ceil((endMs - startMs) / 3600000) + 5);
  if (limit < 2) return null;
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${sym}&interval=1h&startTime=${startMs}&endTime=${endMs}&limit=${limit}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const d = await r.json();
    if (!Array.isArray(d) || d.length === 0) return null;
    return d.map(k => ({
      ts:    parseInt(k[0]),
      open:  parseFloat(k[1]),
      high:  parseFloat(k[2]),
      low:   parseFloat(k[3]),
      close: parseFloat(k[4]),
    }));
  } catch { return null; }
}

async function fetchOKX1H(coin, startMs, endMs) {
  const instId = `${coin}-USDT`;
  const needed = Math.ceil((endMs - startMs) / 3600000) + 5;
  const map    = new Map(); // ts → candle (dedup)

  const parseOKXK = arr => ({
    ts:    parseInt(arr[0]),
    open:  parseFloat(arr[1]),
    high:  parseFloat(arr[2]),
    low:   parseFloat(arr[3]),
    close: parseFloat(arr[4]),
  });

  // 1) Current candles endpoint — up to 300 bars, works for recent weeks
  try {
    const url = `https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=1H&after=${endMs + 1}&limit=300`;
    const r   = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const d = await r.json();
      if (Array.isArray(d?.data)) {
        for (const k of d.data) {
          const c = parseOKXK(k);
          if (c.ts >= startMs && c.ts <= endMs) map.set(c.ts, c);
        }
      }
    }
  } catch {}

  // 2) History candles endpoint — paginate back if not enough
  if (map.size < needed - 5) {
    let after = endMs + 1;
    for (let page = 0; page < 6 && map.size < needed; page++) {
      try {
        const url = `https://www.okx.com/api/v5/market/history-candles?instId=${instId}&bar=1H&after=${after}&limit=100`;
        const r   = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!r.ok) break;
        const d = await r.json();
        if (!Array.isArray(d?.data) || d.data.length === 0) break;
        let reachedStart = false;
        for (const k of d.data) {
          const c = parseOKXK(k);
          if (c.ts < startMs) { reachedStart = true; break; }
          if (c.ts <= endMs)  map.set(c.ts, c);
        }
        if (reachedStart) break;
        after = parseInt(d.data[d.data.length - 1][0]); // paginate older
      } catch { break; }
    }
  }

  if (map.size === 0) return null;
  return [...map.values()].sort((a, b) => a.ts - b.ts);
}

async function fetchKlines1H(coin, startMs, endMs) {
  const binance = await fetchBinance1H(coin, startMs, endMs);
  if (binance && binance.length > 0) return binance;
  return await fetchOKX1H(coin, startMs, endMs);
}

async function fetchOKXPrices(symbols) {
  const out = {};
  await Promise.allSettled(symbols.map(async sym => {
    try {
      const r = await fetch(
        `https://www.okx.com/api/v5/market/ticker?instId=${sym}-USDT`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!r.ok) return;
      const d = await r.json();
      const price = parseFloat(d?.data?.[0]?.last);
      if (price > 0) out[sym] = price;
    } catch {}
  }));
  return out;
}

async function fetchCoinGeckoPrices(symbols) {
  try {
    const ids = [...new Set(symbols.map(s => GECKO[s]).filter(Boolean))];
    if (!ids.length) return {};
    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) return {};
    const d = await r.json();
    const out = {};
    for (const sym of symbols) {
      const id = GECKO[sym];
      if (id && d[id]?.usd) out[sym] = d[id].usd;
    }
    return out;
  } catch { return {}; }
}

async function fetchCurrentPrices(symbols) {
  if (!symbols.length) return {};
  // Try OKX first (faster, no rate limits), fill gaps with CoinGecko
  const okx = await fetchOKXPrices(symbols);
  const missing = symbols.filter(s => !okx[s]);
  if (missing.length === 0) return okx;
  const gecko = await fetchCoinGeckoPrices(missing);
  return { ...okx, ...gecko };
}

// ── Core: Historical Outcome Resolution ────────────────────────────────────────
// Walks 1H klines from trade creation, applies trailing SL, determines outcome.
// Returns { outcome, closePrice, closedAt, actualRr, tpHit } or null (still open)
const NO_DATA = { outcome: 'NO_DATA' }; // klines unavailable — cannot determine entry status

function resolveOutcome(trade, klines) {
  if (!klines || !Array.isArray(klines) || klines.length === 0) return NO_DATA;
  if (!trade.entry_mid || !trade.stop || !trade.direction || trade.direction === 'NEUTRAL') return NO_DATA;

  const { direction, entry_mid: em, stop: sl0, tp1, tp2, tp3 } = trade;
  const isLong       = direction === 'LONG';
  const riskPerUnit  = Math.abs(em - sl0);
  if (riskPerUnit < 1e-10) return NO_DATA; // invalid setup — entry == stop

  // Sort candles chronologically (oldest first) and ONLY consider candles
  // that opened AFTER the trade was created. This is critical: klines are
  // fetched from before trade creation (for efficiency across multiple trades),
  // so without this filter, a historical candle that passed through the entry
  // price BEFORE the trade was set up would falsely trigger entry confirmation.
  const tradeCreatedAt = new Date(trade.created_at).getTime();
  const candles = [...klines]
    .sort((a, b) => a.ts - b.ts)
    .filter(c => c.ts >= tradeCreatedAt);

  if (candles.length === 0) {
    // No candles after trade creation yet — too fresh, wait for next bar
    return { outcome: 'ENTRY_WAITING', closePrice: null, closedAt: null, actualRr: 0, tpHit: [] };
  }

  // ── Phase 1: Find entry trigger ────────────────────────────────────────────
  // Entry triggers ONLY when the candle's range CONTAINS the entry price.
  // Both sides must be satisfied: low ≤ entry AND high ≥ entry (±0.3% for spread).
  // This prevents false triggers when candle is entirely ABOVE (for longs)
  // or entirely BELOW (for shorts) the entry level.
  // Example: SHORT at $2291, candle high=$2370, low=$2300 → low($2300) > em($2291) → NOT triggered.
  let entryIdx = -1;
  for (let i = 0; i < candles.length; i++) {
    const { high, low } = candles[i];
    const triggered = low <= em * 1.003 && high >= em * 0.997; // candle spans entry ±0.3%
    if (triggered) { entryIdx = i; break; }
  }

  if (entryIdx === -1) {
    // Entry never triggered — check if setup is expired (> 14 days old)
    const age = Date.now() - new Date(trade.created_at).getTime();
    if (age > 14 * 86400000) return { outcome: 'EXPIRED', closePrice: null, closedAt: null, actualRr: 0, tpHit: [] };
    return { outcome: 'ENTRY_WAITING', closePrice: null, closedAt: null, actualRr: 0, tpHit: [] };
  }

  // ── Phase 2: Walk candles after entry, trailing SL ─────────────────────────
  // TP close fractions: 40% at TP1, 35% at TP2, 25% at TP3
  const TP_FRACTIONS = [0.40, 0.35, 0.25];
  const tpLevels     = [tp1, tp2, tp3].map(v => parseFloat(v) || 0).filter(v => v > 0);
  const tpHit        = []; // { level, idx, price }

  let currentSL = sl0; // trailing stop loss

  for (let i = entryIdx; i < candles.length; i++) {
    const { high, low, ts } = candles[i];
    const closedAt = new Date(ts).toISOString();

    // Check SL before TPs (conservative — protects capital)
    const slHit = isLong ? low <= currentSL : high >= currentSL;

    if (slHit) {
      // Calculate weighted R from partial closes + SL close
      const closedFrac = tpHit.reduce((s, t) => s + TP_FRACTIONS[t.idx], 0);
      const remFrac    = Math.max(0, 1 - closedFrac);
      let netR         = 0;

      // Add R from each TP hit
      for (const t of tpHit) {
        const pnl = isLong ? (t.price - em) / riskPerUnit : (em - t.price) / riskPerUnit;
        netR += pnl * TP_FRACTIONS[t.idx];
      }
      // Add R from SL close of remaining fraction
      const slPnl = isLong ? (currentSL - em) / riskPerUnit : (em - currentSL) / riskPerUnit;
      netR += slPnl * remFrac;

      // Subtract fees (entry + exit)
      netR -= (FEE_PER_LEG * 2 + SLIPPAGE) * (netR < 0 ? 1 : 1);

      const outcome = tpHit.length > 0
        ? `TP${tpHit.length}_SL`  // e.g. "TP1_SL" — partial win then SL
        : 'SL';

      return {
        outcome,
        closePrice:  parseFloat(currentSL.toFixed(8)),
        closedAt,
        actualRr:    parseFloat(netR.toFixed(3)),
        tpHit:       tpHit.map(t => `TP${t.idx + 1}`),
        pnlPct:      parseFloat((netR * (trade.rr || 2) * 100 * 0.01).toFixed(2)), // approx % PnL
      };
    }

    // Check TPs in order (only next uncleared TP)
    for (let j = tpHit.length; j < tpLevels.length; j++) {
      const tpPrice = tpLevels[j];
      if (!tpPrice) continue;
      const hit = isLong ? high >= tpPrice : low <= tpPrice;
      if (hit) {
        tpHit.push({ idx: j, price: tpPrice, ts });
        // Trailing SL: after TP1 → breakeven with 0.3% profit buffer, after TP2 → TP1
        if (j === 0) {
          // After TP1: move SL to breakeven with 0.3% profit buffer
          const breakevenBuffer = isLong ? em * 1.003 : em * 0.997;
          if (isLong  && breakevenBuffer > currentSL) currentSL = breakevenBuffer;
          if (!isLong && breakevenBuffer < currentSL) currentSL = breakevenBuffer;
        }
        if (j === 1 && tpLevels[0]) {
          if (isLong  && tpLevels[0] > currentSL) currentSL = tpLevels[0];
          if (!isLong && tpLevels[0] < currentSL) currentSL = tpLevels[0];
        }
      }
    }

    // All TPs hit → full win
    if (tpHit.length === tpLevels.length && tpLevels.length > 0) {
      const netR = tpHit.reduce((s, t) => {
        const pnl = isLong ? (t.price - em) / riskPerUnit : (em - t.price) / riskPerUnit;
        return s + pnl * TP_FRACTIONS[t.idx];
      }, 0) - FEE_PER_LEG * 2;

      return {
        outcome:    'TP3',
        closePrice:  tpLevels[tpLevels.length - 1],
        closedAt,
        actualRr:    parseFloat(netR.toFixed(3)),
        tpHit:       tpHit.map(t => `TP${t.idx + 1}`),
        pnlPct:      parseFloat((netR * 100 * 0.01).toFixed(2)),
      };
    }
  }

  // End of klines — trade still running
  if (tpHit.length > 0) {
    return {
      outcome:    `TP${tpHit.length}_PARTIAL`,
      closePrice:  null,
      closedAt:    null,
      actualRr:    0,
      tpHit:       tpHit.map(t => `TP${t.idx + 1}`),
      isPartial:   true,
    };
  }

  return null; // trade still open, in progress
}

// ── Live Evaluation for OPEN positions ─────────────────────────────────────────
function evalLive(trade, currentPrice) {
  if (!trade.entry_mid || !trade.stop) {
    // No setup data — show live price if available, otherwise generic open
    return {
      state: currentPrice ? 'ACTIVE' : 'PENDING',
      level: currentPrice ? 'PROFIT' : 'PENDING',
      badge: currentPrice ? '◈ AÇIK' : '◈ AÇIK',
      uiColor: '#9CA3AF',
      pnlPct: 0, pnlFormatted: '—', rr: 0, rrFormatted: '—',
      livePrice: currentPrice,
    };
  }
  if (!currentPrice) {
    return {
      state: 'ACTIVE', level: 'PENDING',
      badge: '◈ AÇIK', uiColor: '#9CA3AF',
      pnlPct: 0, pnlFormatted: '—', rr: 0, rrFormatted: '—',
    };
  }

  const { direction: dir, entry_mid: em, stop, tp1, tp2, tp3 } = trade;
  const isLong       = dir === 'LONG';
  const riskPerUnit  = Math.abs(em - stop);
  if (riskPerUnit === 0) return { state: 'ERROR', level: 'ERROR', badge: '⚠️ Hatalı', uiColor: '#F59E0B', pnlPct: 0, pnlFormatted: '—', rr: 0, rrFormatted: '—' };

  let level, pnlRaw, rrR;

  if (isLong) {
    if      (tp3 && currentPrice >= tp3) { level = 'TP3_LIVE'; pnlRaw = (tp3 - em)/em; rrR =  Math.abs(tp3-em)/riskPerUnit; }
    else if (tp2 && currentPrice >= tp2) { level = 'TP2_LIVE'; pnlRaw = (tp2 - em)/em; rrR =  Math.abs(tp2-em)/riskPerUnit; }
    else if (tp1 && currentPrice >= tp1) { level = 'TP1_LIVE'; pnlRaw = (tp1 - em)/em; rrR =  Math.abs(tp1-em)/riskPerUnit; }
    else if (currentPrice > em)          { level = 'PROFIT';   pnlRaw = (currentPrice - em)/em; rrR = Math.abs(currentPrice-em)/riskPerUnit; }
    else if (currentPrice <= stop)       { level = 'SL_ZONE';  pnlRaw = (stop - em)/em; rrR = -1; }
    else                                 { level = 'DRAWDOWN'; pnlRaw = (currentPrice - em)/em; rrR = -Math.abs(currentPrice-em)/riskPerUnit; }
  } else {
    if      (tp3 && currentPrice <= tp3) { level = 'TP3_LIVE'; pnlRaw = (em - tp3)/em; rrR =  Math.abs(em-tp3)/riskPerUnit; }
    else if (tp2 && currentPrice <= tp2) { level = 'TP2_LIVE'; pnlRaw = (em - tp2)/em; rrR =  Math.abs(em-tp2)/riskPerUnit; }
    else if (tp1 && currentPrice <= tp1) { level = 'TP1_LIVE'; pnlRaw = (em - tp1)/em; rrR =  Math.abs(em-tp1)/riskPerUnit; }
    else if (currentPrice < em)          { level = 'PROFIT';   pnlRaw = (em - currentPrice)/em; rrR = Math.abs(em-currentPrice)/riskPerUnit; }
    else if (currentPrice >= stop)       { level = 'SL_ZONE';  pnlRaw = (em - stop)/em; rrR = -1; }
    else                                 { level = 'DRAWDOWN'; pnlRaw = (em - currentPrice)/em; rrR = -Math.abs(em-currentPrice)/riskPerUnit; }
  }

  const netPnl = (pnlRaw - FEE_PER_LEG * 2 - SLIPPAGE) * 100;

  const BADGES = {
    TP3_LIVE: { badge: '👑 TP3 YÖNÜNde',  color: '#10B981' },
    TP2_LIVE: { badge: '✅ TP2 YÖNÜNde',  color: '#34D399' },
    TP1_LIVE: { badge: '✔️ TP1 YÖNÜNde',  color: '#6EE7B7' },
    PROFIT:   { badge: '📈 KÂRDA (Açık)', color: '#3B82F6' },
    SL_ZONE:  { badge: '⚠️ SL BÖLGESİ',  color: '#EF4444' },
    DRAWDOWN: { badge: '📉 DD (Açık)',    color: '#F59E0B' },
    PENDING:  { badge: '⏳ BEKLENİYOR',  color: '#9CA3AF' },
  };
  const cfg = BADGES[level] || BADGES.PENDING;

  return {
    state: 'ACTIVE', level,
    badge: cfg.badge, uiColor: cfg.color,
    pnlPct:       parseFloat(netPnl.toFixed(2)),
    pnlFormatted: (netPnl > 0 ? '+' : '') + netPnl.toFixed(2) + '%',
    rr:           parseFloat(rrR.toFixed(2)),
    rrFormatted:  (rrR > 0 ? '+' : '') + rrR.toFixed(2) + 'R',
    livePrice:    currentPrice,
  };
}

// ── Build performance object for a CLOSED trade (from DB) ──────────────────────
function buildClosedPerf(trade) {
  const outcome  = trade.result   || 'OPEN';
  const actualRr = trade.result_r || 0;
  const tp_hit   = trade.tp_hit   || '';

  const OUTCOME_MAP = {
    'TP3':          { badge: '👑 TP3 FULL WIN',   color: '#10B981', state: 'CLOSED' },
    'TP2':          { badge: '✅ TP2 HIT',        color: '#34D399', state: 'CLOSED' },
    'TP1':          { badge: '✔️ TP1 HIT',        color: '#6EE7B7', state: 'CLOSED' },
    'TP2_SL':       { badge: '📊 TP2→SL Kısmi',  color: '#60A5FA', state: 'CLOSED' },
    'TP1_SL':       { badge: '📊 TP1→SL Kısmi',  color: '#93C5FD', state: 'CLOSED' },
    'SL':           { badge: '🛑 STOP HIT',       color: '#EF4444', state: 'CLOSED' },
    'EXPIRED':      { badge: '🕐 SÜRESİ DOLDU',  color: '#6B7280', state: 'CLOSED' },
    'TP3_PARTIAL':  { badge: '📊 TP3 (Kısmi)',    color: '#10B981', state: 'ACTIVE' },
    'TP2_PARTIAL':  { badge: '📊 TP2 (Kısmi)',    color: '#34D399', state: 'ACTIVE' },
    'TP1_PARTIAL':  { badge: '📊 TP1 (Kısmi)',    color: '#6EE7B7', state: 'ACTIVE' },
    'ENTRY_WAITING':{ badge: '⏳ ENTRY BEKLENİYOR',color: '#9CA3AF', state: 'PENDING' },
  };

  const cfg = OUTCOME_MAP[outcome] || { badge: '◈ AÇIK', color: '#9CA3AF', state: 'ACTIVE' };
  const pnlPct = actualRr !== 0 ? parseFloat((actualRr * 2 * 100 * 0.01).toFixed(2)) : 0; // rough estimate

  return {
    state:        cfg.state,
    level:        outcome,
    badge:        cfg.badge,
    uiColor:      cfg.color,
    rr:           parseFloat(actualRr.toFixed(2)),
    rrFormatted:  (actualRr > 0 ? '+' : '') + actualRr.toFixed(2) + 'R',
    pnlPct:       pnlPct,
    pnlFormatted: pnlPct !== 0 ? (pnlPct > 0 ? '+' : '') + pnlPct + '%' : '—',
    tpHit:        tp_hit ? tp_hit.split(',').filter(Boolean) : [],
    closedAt:     trade.closed_at || null,
    closePrice:   trade.close_price || null,
  };
}

// ── Portfolio Statistics ────────────────────────────────────────────────────────
function calcStats(trades) {
  const active   = trades.filter(t => t._state === 'ACTIVE');
  const pending  = trades.filter(t => t._state === 'PENDING');

  // Only count truly closed trades (TP/SL outcomes) — exclude EXPIRED and OPEN
  const closedTrades = trades.filter(t => ['TP1','TP2','TP3','TP1_SL','TP2_SL','SL'].includes(t.result));
  const wonTrades    = closedTrades.filter(t => ['TP1','TP2','TP3','TP1_SL','TP2_SL'].includes(t.result));
  const winRate      = closedTrades.length > 0 ? (wonTrades.length / closedTrades.length * 100) : 0;

  // Use closedTrades as the basis (legacy alias for downstream stats)
  const closed = closedTrades;

  // Separate wins and losses from closed trades
  const wins   = closed.filter(t => (t.result_r || 0) > 0);
  const losses = closed.filter(t => (t.result_r || 0) <= 0);

  const totalR     = closed.reduce((s, t) => s + (t.result_r || 0), 0);
  const grossWinR  = wins.reduce((s, t) => s + (t.result_r || 0), 0);
  const grossLossR = losses.reduce((s, t) => s + Math.abs(t.result_r || 0), 0);
  const profitFactor = grossLossR === 0 ? (grossWinR > 0 ? 99.9 : 0) : grossWinR / grossLossR;

  // Sharpe (simplified over R-series)
  const rrList = closed.map(t => t.result_r || 0);
  let sharpe = 0;
  if (rrList.length >= 3) {
    const mean = rrList.reduce((s, v) => s + v, 0) / rrList.length;
    const std  = Math.sqrt(rrList.reduce((s, v) => s + (v - mean) ** 2, 0) / rrList.length);
    sharpe = std > 0 ? parseFloat((mean / std).toFixed(2)) : 0;
  }

  // Max Drawdown (sequential)
  let peak = 0, maxDD = 0, runningR = 0;
  for (const r of rrList) {
    runningR += r;
    if (runningR > peak) peak = runningR;
    const dd = peak - runningR;
    if (dd > maxDD) maxDD = dd;
  }
  const calmar = maxDD > 0 ? parseFloat((totalR / maxDD).toFixed(2)) : 0;

  // Win/Loss streaks (max and current)
  let curWin = 0, curLoss = 0, maxWin = 0, maxLoss = 0;
  let consecutiveWins = 0, consecutiveLosses = 0;
  for (const r of rrList) {
    if (r > 0) { curWin++; curLoss = 0; if (curWin > maxWin) maxWin = curWin; }
    else        { curLoss++; curWin = 0; if (curLoss > maxLoss) maxLoss = curLoss; }
  }
  consecutiveWins   = curWin;
  consecutiveLosses = curLoss;

  // Average R per trade
  const avgWinR  = wins.length   > 0 ? grossWinR  / wins.length   : 0;
  const avgLossR = losses.length > 0 ? grossLossR / losses.length : 0;
  const expectancy = winRate / 100 * avgWinR - (1 - winRate / 100) * avgLossR;

  // Average R:R of winning trades
  const avgRR = wins.length > 0
    ? parseFloat((wins.reduce((s, t) => s + (t.rr || t.result_r || 0), 0) / wins.length).toFixed(2))
    : 0;

  return {
    total_signals:     trades.length,
    closed_positions:  closed.length,
    active_positions:  active.length,
    pending_positions: pending.length,
    win_count:         wins.length,
    loss_count:        losses.length,
    win_rate_pct:      parseFloat(winRate.toFixed(1)),
    net_r:             parseFloat(totalR.toFixed(2)),
    gross_win_r:       parseFloat(grossWinR.toFixed(2)),
    gross_loss_r:      parseFloat(grossLossR.toFixed(2)),
    profit_factor:     parseFloat(profitFactor.toFixed(2)),
    sharpe_ratio:      sharpe,
    max_drawdown_r:    parseFloat(maxDD.toFixed(2)),
    calmar_ratio:      calmar,
    max_win_streak:    maxWin,
    max_loss_streak:   maxLoss,
    consecutive_wins:  consecutiveWins,
    consecutive_losses: consecutiveLosses,
    avg_win_r:         parseFloat(avgWinR.toFixed(2)),
    avg_loss_r:        parseFloat(avgLossR.toFixed(2)),
    avg_rr:            avgRR,
    expectancy_r:      parseFloat(expectancy.toFixed(3)),
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────────
function fmtP(p) {
  const v = parseFloat(p);
  if (!p || isNaN(v)) return '$0';
  if (v >= 10000) return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 100)   return '$' + v.toFixed(2);
  if (v >= 1)     return '$' + v.toFixed(4);
  if (v >= 0.001) return '$' + v.toFixed(6);
  return '$' + v.toFixed(8);
}

function isClosed(result) {
  return ['TP1','TP2','TP3','SL','TP1_SL','TP2_SL','TP3_SL','EXPIRED'].includes(result);
}

function isWaiting(result) {
  return result === 'ENTRY_WAITING';
}

// ── Handler ──────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Kimlik doğrulama gerekli.' });

  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'Oturum süresi dolmuş.' });

  // ── POST: Save new trade signal ────────────────────────────────────────────
  if (req.method === 'POST') {
    const p = req.body;
    if (!p?.coin || !p?.direction) return res.status(400).json({ error: 'Eksik parametreler.' });

    // Reject NEUTRAL signals — nothing actionable to track
    if (p.direction === 'NEUTRAL') {
      return res.status(200).json({ success: true, skipped: 'NEUTRAL direction — not saved.' });
    }

    // Reject if entry or stop is missing/zero
    if (!parseFloat(p.entry_mid) || !parseFloat(p.stop)) {
      return res.status(200).json({ success: true, skipped: 'No valid entry/stop levels — not saved.' });
    }

    const saved = await saveTrade(user.id, p);
    if (saved?.error) return res.status(500).json({ error: saved.error });
    if (saved) return res.status(201).json({ success: true, data: saved });
    return res.status(500).json({ error: 'Veritabanı hatası.' });
  }

  // ── DELETE: Remove a trade ─────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Trade ID gerekli.' });
    const ok = await deleteTrade(id, user.id);
    if (ok) return res.status(200).json({ success: true });
    return res.status(500).json({ error: 'Silme başarısız.' });
  }

  // ── PATCH: Manual outcome override ─────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { id } = req.query;
    const body = req.body;
    if (!id) return res.status(400).json({ error: 'Trade ID gerekli.' });
    const allowedFields = ['result','result_r','close_price','closed_at','notes'];
    const patch = {};
    for (const f of allowedFields) {
      if (body[f] !== undefined) patch[f] = body[f];
    }
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Güncellenecek alan yok.' });
    const ok = await updateTradeOutcome(id, patch);
    if (ok) return res.status(200).json({ success: true });
    return res.status(500).json({ error: 'Güncelleme başarısız.' });
  }

  // ── GET: Load and resolve trades ───────────────────────────────────────────
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const page = parseInt(req.query.page || '1');
  const { items, total, dbError } = await fetchTrades(user.id, page, 100);

  if (dbError) {
    return res.status(200).json({
      portfolio_stats: calcStats([]),
      pagination: { current_page: 1, total_pages: 1, total: 0 },
      analyses_log: [],
      updated_count: 0,
      db_error: dbError,   // ← client sees the real error
    });
  }

  if (!items.length) {
    return res.status(200).json({
      portfolio_stats: calcStats([]),
      pagination: { current_page: 1, total_pages: 1, total },
      analyses_log: [],
      updated_count: 0,
    });
  }

  const now     = Date.now();
  const MAX_AGE = 42 * 24 * 3600 * 1000; // 42 days = 1000 1H candles

  // ── Step 0: Auto-expire broken/old trades ─────────────────────────────────
  // Trades with NEUTRAL direction or missing entry data that are >7 days old
  const brokenExpireUpdates = [];
  for (const a of items) {
    if (isClosed(a.result)) continue;
    const ageMs = now - new Date(a.created_at).getTime();
    const isBroken = !a.entry_mid || !a.stop || !a.direction || a.direction === 'NEUTRAL';
    if (isBroken && ageMs > 7 * 86400000) {
      brokenExpireUpdates.push(updateTradeOutcome(a.id, {
        result: 'EXPIRED', result_r: 0, closed_at: new Date().toISOString(),
      }));
      a.result = 'EXPIRED'; // mutate in-memory so Step 5 sees it
    }
  }
  if (brokenExpireUpdates.length > 0) await Promise.allSettled(brokenExpireUpdates);

  // ── Step 1: Identify OPEN trades that need outcome resolution ──────────────
  const openTrades = items.filter(a =>
    !isClosed(a.result) &&
    a.entry_mid && a.direction && a.direction !== 'NEUTRAL'
  );

  // ── Step 2: Fetch historical 1H klines for each unique coin (open trades) ──

  // Group open trades by coin for efficient fetching
  const coinTradeMap = {};
  for (const t of openTrades) {
    if (!coinTradeMap[t.coin]) coinTradeMap[t.coin] = [];
    coinTradeMap[t.coin].push(t);
  }

  // Fetch klines for each coin (earliest trade start → now)
  const klinesCache = {};
  await Promise.all(
    Object.entries(coinTradeMap).map(async ([coin, trades]) => {
      const earliest = Math.min(...trades.map(t => new Date(t.created_at).getTime()));
      const ageMs    = now - earliest;
      if (ageMs > MAX_AGE) return; // too old, skip (will be expired)
      const klines = await fetchKlines1H(coin, earliest - 3600000, now + 3600000);
      if (klines) klinesCache[coin] = klines;
    })
  );

  // ── Step 3: Resolve outcomes and UPDATE DB for newly closed trades ─────────
  const dbUpdates = [];
  const resolvedOutcomes = {}; // id → outcome object

  for (const trade of openTrades) {
    const klines = klinesCache[trade.coin];
    const ageMs  = now - new Date(trade.created_at).getTime();

    // Mark very old trades without data as EXPIRED
    if (ageMs > MAX_AGE && !klines) {
      resolvedOutcomes[trade.id] = { outcome: 'EXPIRED', closePrice: null, closedAt: null, actualRr: 0, tpHit: [] };
      dbUpdates.push(updateTradeOutcome(trade.id, {
        result: 'EXPIRED', result_r: 0,
        closed_at: new Date().toISOString(),
      }));
      continue;
    }

    const resolved = resolveOutcome(trade, klines);

    // ── NO_DATA: klines unavailable — cannot confirm entry, keep current state ──
    if (resolved === NO_DATA) {
      // Trade stays as ENTRY_WAITING / OPEN — do not touch DB
      // Response builder will use a.result to determine display
      continue;
    }

    // ── null: klines available, entry triggered, trade still running ──────────
    if (!resolved) {
      if (trade.result === 'ENTRY_WAITING') {
        // klines confirmed entry was hit → promote to OPEN
        dbUpdates.push(updateTradeOutcome(trade.id, { result: 'OPEN' }));
        resolvedOutcomes[trade.id] = { outcome: 'OPEN' };
      }
      // Already OPEN → stays OPEN, evalLive() will handle display
      continue;
    }

    resolvedOutcomes[trade.id] = resolved;

    // ── CLOSED outcomes: persist to DB ────────────────────────────────────────
    if (isClosed(resolved.outcome)) {
      const patch = { result: resolved.outcome, result_r: resolved.actualRr };
      if (resolved.closePrice != null)  patch.close_price = resolved.closePrice;
      if (resolved.closedAt   != null)  patch.closed_at   = resolved.closedAt;
      if (resolved.tpHit?.length)       patch.tp_hit      = resolved.tpHit.join(',');
      dbUpdates.push(updateTradeOutcome(trade.id, patch));

    // ── ENTRY_WAITING: klines confirm entry not yet hit ───────────────────────
    } else if (resolved.outcome === 'ENTRY_WAITING') {
      if (trade.result !== 'ENTRY_WAITING') {
        dbUpdates.push(updateTradeOutcome(trade.id, { result: 'ENTRY_WAITING' }));
      }
    }
  }

  // Await DB updates so trades are persisted before sending response
  if (dbUpdates.length > 0) await Promise.allSettled(dbUpdates);

  // ── Step 4: Fetch live prices for ALL non-closed trades ───────────────────
  const priceFetchCoins = [...new Set(
    items
      .filter(a => !isClosed(a.result))
      .map(a => a.coin)
      .filter(Boolean)
  )];
  const livePrices = priceFetchCoins.length > 0 ? await fetchCurrentPrices(priceFetchCoins) : {};

  // ── Step 5: Build enriched response ────────────────────────────────────────
  const enriched = items.map(a => {
    let performance;
    const resolved = resolvedOutcomes[a.id];

    if (isClosed(a.result)) {
      // Trade was already closed in DB from a previous run
      performance = buildClosedPerf(a);

    } else if (resolved && isClosed(resolved.outcome)) {
      // Trade just got resolved in this run (DB update queued)
      const merged = {
        ...a,
        result:      resolved.outcome,
        result_r:    resolved.actualRr,
        close_price: resolved.closePrice,
        closed_at:   resolved.closedAt,
        tp_hit:      resolved.tpHit?.join(',') || '',
      };
      performance = buildClosedPerf(merged);

    } else if (resolved?.outcome === 'OPEN') {
      // Entry just confirmed this run — trade is now live (DB promoted to OPEN)
      const currentPrice = livePrices[a.coin] || null;
      performance = evalLive(a, currentPrice);

    } else if (
      resolved?.outcome === 'ENTRY_WAITING' ||
      resolved?.outcome === 'NO_DATA'       ||  // klines unavailable → show as pending
      a.result === 'ENTRY_WAITING'
    ) {
      // Entry zone not yet reached (or klines unavailable — conservative default)
      const currentPrice = livePrices[a.coin] || null;
      const isLong = a.direction === 'LONG';
      const distPct = currentPrice && a.entry_mid
        ? parseFloat(((isLong
            ? (a.entry_mid - currentPrice)
            : (currentPrice - a.entry_mid)
          ) / currentPrice * 100).toFixed(2))
        : null;
      performance = {
        state: 'PENDING', level: 'ENTRY_WAITING',
        badge: '⏳ ENTRY BEKLENİYOR', uiColor: '#9CA3AF',
        pnlPct: 0, pnlFormatted: '—', rr: 0, rrFormatted: '—',
        distanceToEntry: distPct != null ? `${distPct > 0 ? '+' : ''}${distPct}%` : null,
        currentPrice,
      };

    } else if (resolved?.isPartial) {
      // Some TPs hit, still running — show live evaluation
      const currentPrice = livePrices[a.coin] || null;
      performance = evalLive(a, currentPrice);
      performance.badge = `📊 ${resolved.tpHit?.join('+')} HIT (Devam)`;
      performance.tpHit = resolved.tpHit || [];

    } else {
      // Fully OPEN trade — live evaluation
      // But first check: if klines were unavailable, verify entry was reachable.
      // LONG entry: price must have come DOWN to entry at some point (current ≤ entry is a hint).
      // SHORT entry: price must have come UP to entry at some point (current ≥ entry is a hint).
      // If current price has NEVER reached the entry direction, treat as PENDING.
      const currentPrice = livePrices[a.coin] || null;
      const em  = a.entry_mid;
      const dir = a.direction;
      const klines = klinesCache[a.coin];

      if (!klines && em && dir && dir !== 'NEUTRAL' && currentPrice) {
        // No kline data available — use conservative heuristic:
        // For SHORT: if current price is below entry AND trade is new (< 4h old),
        // we cannot confirm entry was hit, so mark PENDING until klines confirm.
        const ageMs  = now - new Date(a.created_at).getTime();
        const isLong = dir === 'LONG';
        const priceNeverReachedEntry = isLong
          ? currentPrice > em * 1.003   // LONG: current still above entry — never dipped in
          : currentPrice < em * 0.997;  // SHORT: current still below entry — never rallied up
        if (priceNeverReachedEntry && ageMs < 4 * 3600000) {
          // Very new trade, no klines, price hasn't crossed entry → show as PENDING
          const distPct = isLong
            ? parseFloat(((em - currentPrice) / currentPrice * 100).toFixed(2))
            : parseFloat(((currentPrice - em) / currentPrice * 100).toFixed(2));
          performance = {
            state: 'PENDING', level: 'ENTRY_WAITING',
            badge: '⏳ ENTRY BEKLENİYOR', uiColor: '#9CA3AF',
            pnlPct: 0, pnlFormatted: '—', rr: 0, rrFormatted: '—',
            distanceToEntry: `${distPct > 0 ? '+' : ''}${distPct}%`,
            currentPrice,
          };
        } else {
          performance = evalLive(a, currentPrice);
        }
      } else {
        performance = evalLive(a, currentPrice);
      }
    }

    // Mark state helper for stats
    a._state = performance.state;

    return {
      id:         a.id,
      coin:       a.coin,
      direction:  a.direction,
      grade:      a.grade,
      win_rate:   a.win_rate,
      rr:         a.rr,
      entry_method: a.entry_method,
      confluence_score: a.confluence_score,
      date:       new Date(a.created_at).toLocaleDateString('tr-TR', { day:'2-digit', month:'short', year:'2-digit', hour:'2-digit', minute:'2-digit' }),
      rawDate:    a.created_at,
      closedDate: a.closed_at ? new Date(a.closed_at).toLocaleDateString('tr-TR', { day:'2-digit', month:'short', year:'2-digit', hour:'2-digit', minute:'2-digit' }) : null,
      entry:      fmtP(a.entry_mid),
      stop:       fmtP(a.stop),
      targets: {
        tp1: fmtP(a.tp1),
        tp2: fmtP(a.tp2),
        tp3: fmtP(a.tp3),
      },
      rawSetup: {
        entry:     a.entry_mid,
        stop:      a.stop,
        tp1:       a.tp1,
        tp2:       a.tp2,
        tp3:       a.tp3,
        direction: a.direction,
      },
      currentPrice: performance.livePrice
        ? fmtP(performance.livePrice)
        : performance.currentPrice
          ? fmtP(performance.currentPrice)
          : livePrices[a.coin]
            ? fmtP(livePrices[a.coin])
            : '—',
      performance,
    };
  });

  const stats = calcStats(items);

  return res.status(200).json({
    portfolio_stats:  stats,
    pagination:       { current_page: page, total_pages: Math.ceil(total / 100), total },
    analyses_log:     enriched,
    updated_count:    dbUpdates.length,
    resolved_this_run: Object.values(resolvedOutcomes).filter(r => isClosed(r.outcome)).length,
    timestamp:        new Date().toISOString(),
  });
}
