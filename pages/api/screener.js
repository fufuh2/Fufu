/**
 * DEEP TRADE SCAN — Professional Coin Screener v1.0
 * ═══════════════════════════════════════════════════
 * Birden fazla coin'i analiz eder, skora göre sıralar ve filtreler.
 *
 * Kullanım:
 *   GET /api/screener?key=SECRET                      → Tüm listeden tarama
 *   GET /api/screener?key=SECRET&coins=BTC,ETH,SOL    → Belirli coinler
 *   GET /api/screener?key=SECRET&minScore=60&tier=1   → Filtreli tarama
 *   GET /api/screener?key=SECRET&regime=STRONG_TREND  → Rejim filtresi
 *   GET /api/screener?key=SECRET&limit=5              → Üst 5 fırsat
 *   GET /api/screener?status=1                        → Sistem durumu
 *
 * Sıralama kriteri: Confluence skoru × Rejim uyarlaması × Order flow
 * Tier sistemi:
 *   Tier 1 — PRIME    : valid=true + score≥65 + LONG/SHORT
 *   Tier 2 — SETUP    : score≥52  + winRate≥58 + pillar≥2
 *   Tier 3 — WATCH    : score≥40  + pillar≥1  + okunabilir rejim
 *
 * Runtime: Node.js (Pages API — uzun timeout desteği)
 */

import { detectVolatilityRegime } from '../../lib/volatility-regime.js';
import { analyzeOrderFlow }       from '../../lib/order-flow-engine.js';

export default async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ── Sistem Durumu ─────────────────────────────────────────────────────────
  if (req.query.status === '1') {
    return res.status(200).json({
      ok:       true,
      engine:   'DEEP TRADE SCAN Screener v1.0',
      tiers:    { 1: 'valid+score≥65', 2: 'score≥52+winRate≥58+pillar≥2', 3: 'score≥40+pillar≥1' },
      modules:  ['VolatilityRegime', 'OrderFlow', 'CVD', 'VWAP', 'OI', 'FundingRate'],
      coins:    ALL_COINS,
    });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET || 'deeptradescan-cron-2024';
  const hasKey = req.query.key === secret || req.headers['x-render-cron'] === '1';
  if (!hasKey) {
    return res.status(401).json({ error: 'Yetkisiz. ?key=CRON_SECRET ekle.' });
  }

  // ── Parametreler ──────────────────────────────────────────────────────────
  const origin      = process.env.APP_BASE_URL || 'https://deeptradescan.com';
  const limitParam  = parseInt(req.query.limit    || '10', 10);
  const minScore    = parseInt(req.query.minScore  || '40', 10);
  const filterTier  = req.query.tier   ? req.query.tier.split(',').map(Number) : [1, 2, 3];
  const filterReg   = req.query.regime || null; // 'STRONG_TREND' | 'QUIET_TREND' | 'RANGE' | 'CHAOS'
  const direction   = (req.query.direction || '').toUpperCase() || null; // 'LONG' | 'SHORT'

  // İstek edilen coin listesi (varsayılan: tüm liste)
  const requestedCoins = req.query.coins
    ? req.query.coins.split(',').map(c => c.toUpperCase().trim()).filter(c => ALL_COINS.includes(c))
    : ALL_COINS;

  const coins = requestedCoins.slice(0, 20); // Maks 20 coin (zaman aşımı koruması)

  // ── Tarama ───────────────────────────────────────────────────────────────
  const results = [];
  const errors  = [];
  const ts      = Date.now();

  for (let i = 0; i < coins.length; i++) {
    const coin = coins[i];
    if (i > 0) await sleep(1200); // Rate limit koruması

    try {
      const analysisData = await fetchAnalysis(coin, origin);
      if (!analysisData || analysisData.error) {
        errors.push({ coin, reason: analysisData?.error || 'Analiz verisi alınamadı' });
        continue;
      }

      // ── Temel Skor Metrikleri ────────────────────────────────────────────
      const q   = analysisData.quantum    || {};
      const lay = analysisData.layers     || {};
      const fut = analysisData.futures    || {};
      const mkt = analysisData.market     || {};
      const setup = analysisData.setup    || {};
      const pil   = lay.pillarAnalysis    || {};

      const score       = q.score         || 0;
      const dir         = q.direction     || 'NEUTRAL';
      const rawDir      = q.rawDirection  || 'NEUTRAL';
      const valid       = q.valid === true;
      const winRate     = q.winRate       || 0;
      const pillarCount = pil.count       ?? 0;
      const regimeBlock = pil.regimeBlocked === true;

      // ── Tier Tespiti ──────────────────────────────────────────────────────
      const tier1 = valid && score >= 65 && (dir === 'LONG' || dir === 'SHORT');
      const tier2 = !tier1 && score >= 52 && winRate >= 58 && (rawDir === 'LONG' || rawDir === 'SHORT') && pillarCount >= 2 && !regimeBlock;
      const tier3 = !tier1 && !tier2 && score >= 40 && pillarCount >= 1;
      const tier  = tier1 ? 1 : tier2 ? 2 : tier3 ? 3 : 0;

      if (tier === 0) continue; // Tier yoksa atla

      // ── Volatilite Rejimi ─────────────────────────────────────────────────
      // analyze.js zaten microstructure.volatilityRegime hesaplıyor
      // Burada sadece etiketi çıkarıyoruz
      const existingRegime = analysisData.microstructure?.volatilityRegime;
      const regimeLabel    = _parseRegimeLabel(existingRegime);

      // ── Order Flow (analyze.js çıktısından) ───────────────────────────────
      const flowScore = _parseFlowScore(analysisData, dir || rawDir);

      // ── Bileşik Skor (screening rank için) ────────────────────────────────
      const compositeScore = calcCompositeScore(score, tier, winRate, pillarCount, flowScore, regimeLabel);

      // ── Fiyat & Setup Bilgisi ─────────────────────────────────────────────
      const price    = mkt.price || setup.entryMid || 0;
      const change24 = mkt.change24h ?? null;

      results.push({
        coin,
        tier,
        direction:       dir,
        rawDirection:    rawDir,
        score,
        winRate,
        pillarCount,
        valid,
        compositeScore,
        regime:          regimeLabel,
        flowScore,
        price,
        change24h:       change24 !== null ? +change24.toFixed(2) : null,
        entry:           setup.entryMid ? +setup.entryMid.toFixed(6) : null,
        entryLow:        setup.entryLow ? +setup.entryLow.toFixed(6) : null,
        entryHigh:       setup.entryHigh ? +setup.entryHigh.toFixed(6) : null,
        sl:              setup.stop     ? +setup.stop.toFixed(6) : null,
        tp1:             setup.tp1      ? +setup.tp1.toFixed(6)  : null,
        tp2:             setup.tp2      ? +setup.tp2.toFixed(6)  : null,
        rr:              setup.rr       || null,
        grade:           q.grade        || '—',
        funding:         fut.fundingRate != null ? +(parseFloat(fut.fundingRate) * 100).toFixed(4) : null,
        lsRatio:         fut.longShortRatio ? +parseFloat(fut.longShortRatio).toFixed(2) : null,
        regimeBlocked:   regimeBlock,
        pillarNames:     pil.names      || [],
        signalType:      q.signalType   || null,
        skipReason:      null,
      });

    } catch (e) {
      errors.push({ coin, reason: e.message });
    }
  }

  // ── Filtrele ──────────────────────────────────────────────────────────────
  let filtered = results
    .filter(r => r.score      >= minScore)
    .filter(r => filterTier.includes(r.tier))
    .filter(r => !filterReg   || r.regime === filterReg)
    .filter(r => !direction   || r.direction === direction || r.rawDirection === direction);

  // ── Sırala (compositeScore azalan) ────────────────────────────────────────
  filtered.sort((a, b) => b.compositeScore - a.compositeScore);

  // ── Limit Uygula ─────────────────────────────────────────────────────────
  const topResults = filtered.slice(0, Math.min(limitParam, 20));

  // ── İstatistik Özet ───────────────────────────────────────────────────────
  const stats = {
    scanned:       coins.length,
    qualified:     results.length,
    filtered:      filtered.length,
    returned:      topResults.length,
    tier1Count:    results.filter(r => r.tier === 1).length,
    tier2Count:    results.filter(r => r.tier === 2).length,
    tier3Count:    results.filter(r => r.tier === 3).length,
    longCount:     results.filter(r => r.direction === 'LONG' || r.rawDirection === 'LONG').length,
    shortCount:    results.filter(r => r.direction === 'SHORT' || r.rawDirection === 'SHORT').length,
    avgScore:      results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0,
    duration:      Date.now() - ts,
    errors:        errors.length,
  };

  return res.status(200).json({
    success:   true,
    timestamp: new Date().toISOString(),
    stats,
    results:   topResults,
    errors:    errors.length ? errors : undefined,
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Yardımcı Fonksiyonlar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Bileşik skor hesaplar — tarama sıralaması için
 * Ağırlıklar: Confluence %40 + Tier Bonus %20 + WinRate %20 + Pillar %10 + Flow %10
 */
function calcCompositeScore(score, tier, winRate, pillarCount, flowScore, regime) {
  const tierBonus    = tier === 1 ? 20 : tier === 2 ? 12 : 6;
  const pillarBonus  = Math.min(10, pillarCount * 2);
  const flowBonus    = Math.min(10, (flowScore || 0) * 0.1);
  const regimePenalty = regime === 'CHAOS' ? -15 : regime === 'RANGE' ? -5 : 0;

  return Math.round(
    score * 0.45 +
    (winRate * 0.20) +
    tierBonus +
    pillarBonus +
    flowBonus +
    regimePenalty
  );
}

/**
 * analyze.js çıktısındaki microstructure veriden rejim etiketini çıkarır
 */
function _parseRegimeLabel(microRegime) {
  if (!microRegime) return 'UNKNOWN';
  // analyze.js'in volatilityRegime çıktısı string veya object olabilir
  if (typeof microRegime === 'string') return microRegime;
  if (microRegime.regime) return microRegime.regime;
  // Sayısal değer varsa (eski format)
  if (typeof microRegime === 'number') {
    if (microRegime > 0.7) return 'STRONG_TREND';
    if (microRegime > 0.4) return 'QUIET_TREND';
    if (microRegime < 0.2) return 'RANGE';
    return 'UNKNOWN';
  }
  return 'UNKNOWN';
}

/**
 * analyze.js çıktısından order flow skoru çıkarır
 */
function _parseFlowScore(data, direction) {
  // Mevcut orderFlowImbalance değeri varsa kullan
  const of = data.microstructure?.orderFlowImbalance;
  if (typeof of === 'number') return Math.round(of * 100);
  if (of?.score) return of.score;

  // Yoksa futures verilerinden basit bir skor üret
  const fut = data.futures || {};
  let score = 50;
  const fr  = parseFloat(fut.fundingRate || 0);
  const ls  = parseFloat(fut.longShortRatio || 1);
  const tb  = parseFloat(fut.takerBuyRatio || 1);

  if (direction === 'LONG') {
    if (fr < -0.002) score += 15; // Short kalabalık = long fırsatı
    if (fr > 0.005)  score -= 10;
    if (ls < 0.7)    score += 10;
    if (tb > 1.1)    score += 10;
  } else if (direction === 'SHORT') {
    if (fr > 0.005)  score += 15; // Long kalabalık = short fırsatı
    if (fr < -0.002) score -= 10;
    if (ls > 2.0)    score += 10;
    if (tb < 0.9)    score += 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Analiz API'sini çağırır
 */
async function fetchAnalysis(coin, origin) {
  const ctrl = new AbortController();
  const t    = setTimeout(() => ctrl.abort(), 55_000);

  try {
    const r = await fetch(`${origin}/api/analyze`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin':       origin,
        'User-Agent':   'DeepTradeScan-Screener/1.0',
      },
      body:   JSON.stringify({ coin }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) throw new Error(`analyze HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Coin Listesi ──────────────────────────────────────────────────────────────

const ALL_COINS = [
  // Büyük Kapler
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP',
  // DeFi
  'AAVE', 'UNI', 'LINK', 'PENDLE', 'GMX',
  // L1/L2
  'AVAX', 'DOT', 'NEAR', 'APT', 'SUI', 'INJ', 'TIA', 'SEI',
  // Meme
  'DOGE', 'PEPE', 'WIF',
  // AI / RWA
  'FET', 'RENDER', 'TAO',
  // Diğer
  'ADA', 'ATOM', 'RUNE', 'KAS', 'STX', 'HBAR', 'LTC', 'AAVE',
];
