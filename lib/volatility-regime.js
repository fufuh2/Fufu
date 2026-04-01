/**
 * DEEP TRADE SCAN — Volatility Regime Engine v1.0
 * ═══════════════════════════════════════════════
 * Module C: Volatility Regime Detection & Parameter Adaptation
 *
 * Piyasa Rejimleri:
 *   STRONG_TREND  → Yüksek vol + Yüksek ADX  → Momentum stratejisi
 *   QUIET_TREND   → Düşük vol  + Yüksek ADX  → Pullback girişi, breakout beklentisi
 *   RANGE         → Düşük vol  + Düşük ADX   → Mean reversion, destek/direnç
 *   CHAOS         → Yüksek vol + Düşük ADX   → Pozisyon boyutunu kıs veya bekle
 *
 * Çıktılar:
 *   - Rejim sınıfı + güven skoru
 *   - Rejime özel parametreler (RSI eşikleri, stop çarpanı, TP oranı)
 *   - Pozisyon boyutu çarpanı
 *   - Tavsiye edilen giriş stili
 *
 * Bağımlılıklar: Yok (pure JS — Edge Runtime uyumlu)
 */

'use strict';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BÖLÜM 1 — Temel İndikatör Hesaplamaları
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * ATR (Average True Range) hesaplar
 * Candlestick formatı: [timestamp, open, high, low, close, volume]
 */
function calcATR(candles, period = 14) {
  if (!candles || candles.length < period + 1) return 0;

  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const [, , h, l, c] = candles[i];
    const prevC = candles[i - 1][4];
    trs.push(Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC)));
  }

  // Wilder's ATR (exponential smoothing)
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

/**
 * ADX (Average Directional Index) hesaplar — trend gücü ölçer
 */
function calcADX(candles, period = 14) {
  if (!candles || candles.length < period * 2 + 1) return 20;

  let plusDM14 = 0, minusDM14 = 0, tr14 = 0;

  // Başlangıç değerlerini hesapla
  for (let i = 1; i <= period; i++) {
    const [, , h, l] = candles[i];
    const [, , ph, pl, pc] = candles[i - 1];
    const hDiff = h - ph;
    const lDiff = pl - l;
    plusDM14  += (hDiff > lDiff && hDiff > 0) ? hDiff : 0;
    minusDM14 += (lDiff > hDiff && lDiff > 0) ? lDiff : 0;
    tr14      += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }

  const dxValues = [];

  for (let i = period + 1; i < candles.length; i++) {
    const [, , h, l] = candles[i];
    const [, , ph, pl, pc] = candles[i - 1];
    const hDiff = h - ph;
    const lDiff = pl - l;
    const tr    = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));

    plusDM14  = plusDM14  - plusDM14  / period + ((hDiff > lDiff && hDiff > 0) ? hDiff : 0);
    minusDM14 = minusDM14 - minusDM14 / period + ((lDiff > hDiff && lDiff > 0) ? lDiff : 0);
    tr14      = tr14      - tr14      / period  + tr;

    if (tr14 > 0) {
      const pDI = (plusDM14  / tr14) * 100;
      const mDI = (minusDM14 / tr14) * 100;
      const sum = pDI + mDI;
      if (sum > 0) dxValues.push(Math.abs(pDI - mDI) / sum * 100);
    }
  }

  if (dxValues.length === 0) return 20;
  const slice = dxValues.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/**
 * Bollinger Band Width hesaplar — sıkışma/genişleme göstergesi
 */
function calcBBWidth(candles, period = 20, mult = 2) {
  if (!candles || candles.length < period) return 0.06;

  const closes = candles.slice(-period).map(c => c[4]);
  const sma    = closes.reduce((a, b) => a + b, 0) / period;
  const std    = Math.sqrt(closes.reduce((s, v) => s + (v - sma) ** 2, 0) / period);

  return sma > 0 ? (2 * mult * std) / sma : 0.06;
}

/**
 * Hurst Exponent hesaplar (R/S Analizi)
 * H > 0.55 → Trending (momentum)
 * H = 0.5  → Random walk
 * H < 0.45 → Mean-reverting
 */
function calcHurst(candles, maxPeriod = 80) {
  if (!candles || candles.length < 50) return 0.5;

  const closes = candles.map(c => c[4]);
  const n      = Math.min(closes.length, 200);
  const data   = closes.slice(-n);

  const logLags = [];
  const logRS   = [];
  const minLag  = 8;

  for (let lag = minLag; lag <= Math.min(maxPeriod, Math.floor(n / 2)); lag += 4) {
    const chunks = Math.floor(n / lag);
    if (chunks < 2) continue;

    const rsArr = [];
    for (let c = 0; c < chunks; c++) {
      const seg  = data.slice(c * lag, (c + 1) * lag);
      const mean = seg.reduce((a, b) => a + b, 0) / lag;
      let cumDev = 0, maxD = -Infinity, minD = Infinity, sumSq = 0;

      for (const v of seg) {
        cumDev += v - mean;
        if (cumDev > maxD) maxD = cumDev;
        if (cumDev < minD) minD = cumDev;
        sumSq += (v - mean) ** 2;
      }

      const range = maxD - minD;
      const std   = Math.sqrt(sumSq / lag);
      if (std > 0 && range > 0) rsArr.push(range / std);
    }

    if (rsArr.length > 0) {
      const avgRS = rsArr.reduce((a, b) => a + b, 0) / rsArr.length;
      logLags.push(Math.log(lag));
      logRS.push(Math.log(avgRS));
    }
  }

  if (logLags.length < 3) return 0.5;

  // OLS regression: log(RS) = H * log(n) + c
  const nn   = logLags.length;
  const sumX = logLags.reduce((a, b) => a + b, 0);
  const sumY = logRS.reduce((a, b) => a + b, 0);
  const sumXY = logLags.reduce((s, x, i) => s + x * logRS[i], 0);
  const sumX2 = logLags.reduce((s, x) => s + x * x, 0);
  const denom = nn * sumX2 - sumX * sumX;

  if (denom === 0) return 0.5;
  const H = (nn * sumXY - sumX * sumY) / denom;
  return Math.max(0.1, Math.min(0.9, H));
}

/**
 * Shannon Entropy hesaplar — getiri dağılımının okunabilirliği
 * 0 → Çok düzenli (düşük bilgi), 1 → Tamamen rastgele (yüksek kaos)
 */
function calcEntropy(candles, bins = 12) {
  if (!candles || candles.length < 20) return 0.8;

  const returns = [];
  for (let i = 1; i < candles.length; i++) {
    const r = (candles[i][4] - candles[i - 1][4]) / (candles[i - 1][4] || 1);
    returns.push(r);
  }

  const recent = returns.slice(-50);
  const min    = Math.min(...recent);
  const max    = Math.max(...recent);
  const range  = max - min;
  if (range === 0) return 0;

  const hist = new Array(bins).fill(0);
  for (const r of recent) {
    const b = Math.min(bins - 1, Math.floor(((r - min) / range) * bins));
    hist[b]++;
  }

  const total = recent.length;
  let entropy = 0;
  for (const count of hist) {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  }

  return entropy / Math.log2(bins); // [0,1] normalize
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BÖLÜM 2 — Rejim Sınıflandırma
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Volatilite rejimini tespit eder ve parametreleri uyarlar
 * @param {Array} candles - [[ts, o, h, l, c, v], ...]
 * @returns {Object} Rejim bilgisi + uyarlanmış parametreler
 */
function detectVolatilityRegime(candles) {
  if (!candles || candles.length < 50) {
    return _buildUnknownRegime();
  }

  const lastClose = candles[candles.length - 1][4] || 1;

  // ── Metrik Hesapla ─────────────────────────────────────────────────────────
  const atr     = calcATR(candles, 14);
  const atrPct  = atr / lastClose;                // Normalize ATR (% olarak)
  const adx     = calcADX(candles, 14);
  const bbWidth = calcBBWidth(candles, 20);
  const hurst   = calcHurst(candles);
  const entropy = calcEntropy(candles);

  // ── Eşik Değerleri (crypto piyasası için kalibre edilmiş) ──────────────────
  const IS_HIGH_VOL    = atrPct > 0.022 || bbWidth > 0.075;
  const IS_STRONG_ADX  = adx     > 23;
  const IS_TRENDING    = hurst   > 0.54;
  const IS_READABLE    = entropy < 0.78;

  // ── Rejim Sınıflandırma Matrisi ────────────────────────────────────────────
  let regime, confidence, tradeability;

  if (IS_HIGH_VOL && IS_STRONG_ADX && IS_TRENDING) {
    regime      = 'STRONG_TREND';
    confidence  = Math.min(100, adx * 1.8 + hurst * 25 + (1 - entropy) * 15);
    tradeability = IS_READABLE ? 88 : 55;
  } else if (!IS_HIGH_VOL && IS_STRONG_ADX) {
    regime      = 'QUIET_TREND';
    confidence  = Math.min(100, adx * 1.5 + (1 - bbWidth * 8) * 40 + (IS_TRENDING ? 15 : 0));
    tradeability = IS_READABLE ? 72 : 45;
  } else if (!IS_HIGH_VOL && !IS_STRONG_ADX && !IS_TRENDING) {
    regime      = 'RANGE';
    confidence  = Math.min(100, (0.5 - Math.abs(hurst - 0.5)) * 180 + (IS_READABLE ? 20 : 0));
    tradeability = IS_READABLE ? 65 : 40;
  } else {
    regime      = 'CHAOS';
    confidence  = Math.min(100, (IS_HIGH_VOL ? 35 : 20) + (!IS_READABLE ? 35 : 10) + (!IS_TRENDING ? 20 : 5));
    tradeability = 12;
  }

  const params = _getRegimeParams(regime, { atrPct, adx });

  return {
    regime,
    confidence:          Math.round(confidence),
    readable:            IS_READABLE,
    tradeability:        Math.round(tradeability),

    // Ham metrikler
    metrics: {
      atrPct:  +(atrPct * 100).toFixed(3),
      adx:     +adx.toFixed(1),
      bbWidth: +(bbWidth * 100).toFixed(2),
      hurst:   +hurst.toFixed(3),
      entropy: +entropy.toFixed(3),
    },

    // Rejim bilgileri
    params,
    positionMultiplier:  _positionMultiplier(regime, IS_READABLE),
    description:         _description(regime),
    entryStyle:          params.entryStyle,
    recommendation:      _recommendation(regime, IS_READABLE),

    // Uyarılar
    warnings: _warnings({ IS_HIGH_VOL, IS_STRONG_ADX, IS_TRENDING, IS_READABLE, entropy, atrPct }),
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BÖLÜM 3 — Yardımcı Fonksiyonlar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function _getRegimeParams(regime, { atrPct, adx }) {
  // ATR bazlı stop çarpanı (düşük volatilite = dar stop, yüksek = geniş)
  const stopMult = Math.max(1.5, Math.min(4.5, 0.025 / Math.max(atrPct, 0.005)));

  const base = {
    STRONG_TREND: { rsiOS: 40, rsiOB: 62, emaFast: 9,  emaSlow: 21, minScore: 68, entryStyle: 'breakout',  tpRatios: [1.5, 3.0, 5.5] },
    QUIET_TREND:  { rsiOS: 35, rsiOB: 65, emaFast: 21, emaSlow: 55, minScore: 60, entryStyle: 'pullback',   tpRatios: [1.2, 2.5, 4.0] },
    RANGE:        { rsiOS: 28, rsiOB: 72, emaFast: 50, emaSlow: 200,minScore: 55, entryStyle: 'reversal',   tpRatios: [0.8, 1.6, 2.4] },
    CHAOS:        { rsiOS: 18, rsiOB: 82, emaFast: 21, emaSlow: 55, minScore: 82, entryStyle: 'wait',       tpRatios: [1.0, 1.5, 2.0] },
  }[regime] || { rsiOS: 30, rsiOB: 70, emaFast: 21, emaSlow: 55, minScore: 65, entryStyle: 'pullback', tpRatios: [1.2, 2.5, 4.0] };

  return { ...base, stopAtrMultiplier: +stopMult.toFixed(1) };
}

function _positionMultiplier(regime, readable) {
  if (!readable) return 0.2;
  return { STRONG_TREND: 1.0, QUIET_TREND: 0.75, RANGE: 0.70, CHAOS: 0.25 }[regime] ?? 0.5;
}

function _description(regime) {
  return {
    STRONG_TREND: 'Güçlü trend — momentum stratejisi, geniş stop, trailing SL kullan',
    QUIET_TREND:  'Sessiz trend — pullback girişi bekle, breakout doğrulandıktan sonra gir',
    RANGE:        'Sıkışık piyasa — destek/direnç mean reversion, dar stop, kısa TP',
    CHAOS:        'Kaotik piyasa — pozisyon boyutunu %75 kıs veya bekle',
  }[regime] || 'Belirsiz rejim — küçük pozisyon';
}

function _recommendation(regime, readable) {
  if (!readable) return 'İşlem yapma — fiyat hareketi okunaksız (entropi yüksek)';
  return {
    STRONG_TREND: 'Trendi takip et — momentum sinyallerini önceliklendir',
    QUIET_TREND:  'Pullback bekle — EMA desteklerinden zone tabanlı giriş',
    RANGE:        'Destek/direnç uçlarını kullan — RSI ekstremlerinde giriş',
    CHAOS:        'Küçük pozisyon veya bekle — volatilite normalize olana kadar',
  }[regime] || 'Dikkatli ol — belirsiz koşullar';
}

function _warnings({ IS_HIGH_VOL, IS_STRONG_ADX, IS_TRENDING, IS_READABLE, entropy, atrPct }) {
  const w = [];
  if (!IS_READABLE)  w.push(`Entropi çok yüksek (${(entropy * 100).toFixed(0)}%) — sinyal kalitesi düşük`);
  if (IS_HIGH_VOL)   w.push(`ATR yüksek (%${(atrPct * 100).toFixed(2)}) — stopları genişlet`);
  if (!IS_TRENDING && !IS_STRONG_ADX) w.push('Trend yok — yönlü pozisyonlardan kaçın');
  return w;
}

function _buildUnknownRegime() {
  return {
    regime:            'UNKNOWN',
    confidence:        0,
    readable:          true,
    tradeability:      40,
    metrics:           { atrPct: 0, adx: 0, bbWidth: 0, hurst: 0.5, entropy: 0.5 },
    params:            { rsiOS: 30, rsiOB: 70, emaFast: 21, emaSlow: 55, minScore: 65, entryStyle: 'pullback', tpRatios: [1.2, 2.5, 4.0], stopAtrMultiplier: 2.0 },
    positionMultiplier: 0.5,
    description:       'Yetersiz veri — varsayılan parametreler kullanılıyor',
    entryStyle:        'pullback',
    recommendation:    'Küçük pozisyon — daha fazla veri bekle',
    warnings:          ['Yetersiz mum verisi — rejim tespit edilemedi'],
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BÖLÜM 4 — Çoklu Zaman Dilimi Rejim Özeti
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Birden fazla zaman dilimine ait mum verisini alır ve rejim özeti üretir
 * @param {{ '4h': Array, '1d': Array, '1w': Array }} candlesByTF
 * @returns {Object} MTF rejim özeti
 */
function detectMTFRegime(candlesByTF) {
  const results = {};
  const weights = { '1w': 3, '1d': 2, '4h': 1 };
  let weightedScore = 0;
  let totalWeight   = 0;
  const regimeCounts = { STRONG_TREND: 0, QUIET_TREND: 0, RANGE: 0, CHAOS: 0 };

  for (const [tf, candles] of Object.entries(candlesByTF)) {
    if (!candles || candles.length < 20) continue;
    const regime        = detectVolatilityRegime(candles);
    results[tf]         = regime;
    const w             = weights[tf] || 1;
    weightedScore      += regime.tradeability * w;
    totalWeight        += w;
    regimeCounts[regime.regime] = (regimeCounts[regime.regime] || 0) + 1;
  }

  // Baskın rejim
  const dominant = Object.entries(regimeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'UNKNOWN';

  return {
    byTimeframe:        results,
    dominant,
    dominantCount:      regimeCounts[dominant],
    weightedTradeability: totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 40,
    aligned:            Object.values(regimeCounts).filter(v => v > 0).length === 1, // Tüm TF'ler aynı rejimde mi?
    regimeCounts,
    recommendation:     _mtfRecommendation(dominant, regimeCounts),
  };
}

function _mtfRecommendation(dominant, counts) {
  const aligned = Object.values(counts).filter(v => v > 0).length === 1;
  if (dominant === 'CHAOS')        return 'Tüm TF\'lerde kaos — işlem yapma';
  if (dominant === 'STRONG_TREND' && aligned) return 'Güçlü trend tüm TF\'lerde — momentum al';
  if (dominant === 'RANGE'        && aligned) return 'Range tüm TF\'lerde — sadece sınırlardan giriş';
  return `Karışık rejim — baskın: ${dominant}, dikkatli ol`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dışa Aktar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export {
  detectVolatilityRegime,
  detectMTFRegime,
  calcATR,
  calcADX,
  calcBBWidth,
  calcHurst,
  calcEntropy,
};
