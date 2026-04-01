/**
 * DEEP TRADE SCAN — Order Flow Engine v1.0
 * ═══════════════════════════════════════════════
 * Module B: Order Flow & Market Microstructure Analysis
 *
 * Bileşenler:
 *   CVD Analysis     → Kümülatif Hacim Delta — agresör alıcı/satıcı baskısı
 *   VWAP Analysis    → Kurumsal referans fiyat sapması
 *   OI Change        → Açık faiz değişimi yorumu (4 senaryo matrisi)
 *   Funding Rate     → Kaldıraçlı pozisyon kalabalığı ve contrarian sinyaller
 *   Taker Ratio      → Agresif emir akışı yönü
 *   Liquidity Score  → Likidite tuzağı ve manipülasyon riski
 *   Flow Score       → Tüm bileşenlerin ağırlıklı skoru (0-100)
 *
 * Bağımlılıklar: Yok (pure JS — Edge Runtime uyumlu)
 */

'use strict';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BÖLÜM 1 — CVD (Cumulative Volume Delta)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * CVD analizi yapar
 * Gövde oranı ile hacim delta'sını tahmin eder (tick verisi yoksa)
 * @param {Array} candles [[ts, open, high, low, close, volume], ...]
 */
function analyzeCVD(candles) {
  if (!candles || candles.length < 10) {
    return _neutralCVD();
  }

  let cvd = 0;
  const cvdSeries = [];

  for (const c of candles) {
    const [, open, high, low, close, volume] = c;
    const wick  = high - low || 0.000001;
    // Mum gövde oranı: pozitif = boğa, negatif = ayı
    // Ek: alt/üst fitil asimetrisi de dahil edilir
    const bodyRatio = (close - open) / wick;
    const delta     = bodyRatio * (volume || 0);
    cvd += delta;
    cvdSeries.push(cvd);
  }

  const lookback = Math.min(14, cvdSeries.length);
  const cvdNow   = cvdSeries[cvdSeries.length - 1];
  const cvdPast  = cvdSeries[cvdSeries.length - lookback];
  const cvdChange = cvdNow - cvdPast;
  const cvdTrend  = cvdChange > 0 ? 'BULLISH' : 'BEARISH';

  // Diverjans tespiti: fiyat yönü vs CVD yönü
  const priceStart  = candles[candles.length - lookback][4];
  const priceNow    = candles[candles.length - 1][4];
  const priceUp     = priceNow > priceStart;
  const cvdUp       = cvdChange > 0;
  const divergence  = priceUp !== cvdUp;
  const divType     = divergence
    ? (priceUp ? 'BEARISH_DIVERGENCE' : 'BULLISH_DIVERGENCE')
    : null;

  // Son 20 mumda boğa oranı
  const recent        = candles.slice(-20);
  const bullCount     = recent.filter(c => c[4] > c[1]).length;
  const bullPressure  = Math.round((bullCount / recent.length) * 100);

  // CVD momentum (son 5 / önceki 5)
  const last5  = cvdSeries.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const prev5  = cvdSeries.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
  const cvdMomentum = last5 > prev5 ? 'ACCELERATING' : 'DECELERATING';

  return {
    cvd:          Math.round(cvdNow),
    cvdChange:    Math.round(cvdChange),
    trend:        cvdTrend,
    momentum:     cvdMomentum,
    divergence,
    divType,
    bullPressure,
    interpretation: _cvdInterpretation(cvdTrend, divergence, divType, cvdMomentum),
  };
}

function _neutralCVD() {
  return { cvd: 0, cvdChange: 0, trend: 'NEUTRAL', momentum: 'FLAT', divergence: false, divType: null, bullPressure: 50, interpretation: 'Yetersiz veri' };
}

function _cvdInterpretation(trend, divergence, divType, momentum) {
  if (divergence && divType === 'BEARISH_DIVERGENCE') return '⚠️ Boğa diverjansı — alım zayıflıyor, düzeltme riski';
  if (divergence && divType === 'BULLISH_DIVERGENCE') return '⚠️ Ayı diverjansı — satış zayıflıyor, toparlanma riski';
  if (trend === 'BULLISH' && momentum === 'ACCELERATING') return '🟢 CVD güçlü yükselişte — alım baskısı artıyor';
  if (trend === 'BULLISH') return '🟢 CVD boğa — alım baskısı hakim';
  if (trend === 'BEARISH' && momentum === 'ACCELERATING') return '🔴 CVD hızlı düşüşte — satım baskısı artıyor';
  return '🔴 CVD ayı — satım baskısı hakim';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BÖLÜM 2 — VWAP Analizi
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * VWAP sapması analizi — kurumsal referans fiyat kontrolü
 */
function analyzeVWAP(candles) {
  if (!candles || candles.length < 10) {
    return { vwap: 0, deviation: 0, position: 'NEUTRAL', institutional: false, signal: 'UNKNOWN', band: null };
  }

  let cumTP  = 0;
  let cumVol = 0;
  let cumTP2 = 0; // Standart sapma için

  for (const [, , high, low, close, volume] of candles) {
    const tp = (high + low + close) / 3;
    cumTP    += tp * volume;
    cumVol   += volume;
    cumTP2   += tp * tp * volume;
  }

  const vwap = cumVol > 0 ? cumTP / cumVol : candles[candles.length - 1][4];
  const vwapVariance = cumVol > 0 ? (cumTP2 / cumVol) - vwap * vwap : 0;
  const vwapStd = Math.sqrt(Math.max(0, vwapVariance));

  const price    = candles[candles.length - 1][4];
  const deviation = vwap > 0 ? ((price - vwap) / vwap) * 100 : 0;

  // VWAP bantları (kurumsal destek/direnç)
  const band1Upper = vwap + vwapStd;
  const band1Lower = vwap - vwapStd;
  const band2Upper = vwap + 2 * vwapStd;
  const band2Lower = vwap - 2 * vwapStd;

  let position;
  if (price > band2Upper)       position = 'EXTREME_ABOVE';
  else if (price > band1Upper)  position = 'ABOVE_VWAP';
  else if (price > vwap)        position = 'SLIGHT_ABOVE';
  else if (price > band1Lower)  position = 'SLIGHT_BELOW';
  else if (price > band2Lower)  position = 'BELOW_VWAP';
  else                          position = 'EXTREME_BELOW';

  const institutional = Math.abs(deviation) < 0.8; // VWAP yakınında → kurumsal bölge

  let signal;
  if (deviation > 5)       signal = 'EXTREME_OVERBOUGHT_VWAP';
  else if (deviation > 2)  signal = 'OVERBOUGHT_VWAP';
  else if (deviation < -5) signal = 'EXTREME_OVERSOLD_VWAP';
  else if (deviation < -2) signal = 'OVERSOLD_VWAP';
  else                     signal = 'NEAR_VWAP';

  return {
    vwap:         +vwap.toFixed(6),
    deviation:    +deviation.toFixed(2),
    position,
    institutional,
    signal,
    band: {
      upper1: +band1Upper.toFixed(6),
      lower1: +band1Lower.toFixed(6),
      upper2: +band2Upper.toFixed(6),
      lower2: +band2Lower.toFixed(6),
    },
    interpretation: _vwapInterpretation(position, institutional),
  };
}

function _vwapInterpretation(position, institutional) {
  if (institutional) return '🏦 Fiyat VWAP yakınında — kurumsal referans bölgede';
  if (position === 'EXTREME_ABOVE') return '⚠️ VWAP\'ın çok üstünde — ortalamaya dönüş riski';
  if (position === 'ABOVE_VWAP')   return '🟢 VWAP üstünde — boğa kontrolünde';
  if (position === 'EXTREME_BELOW') return '⚠️ VWAP\'ın çok altında — oversold, toparlanma riski';
  if (position === 'BELOW_VWAP')   return '🔴 VWAP altında — ayı kontrolünde';
  return '⚖️ VWAP yakını — yön belirsiz';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BÖLÜM 3 — Open Interest Değişim Analizi
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * OI Değişim Matrisi:
 * OI↑ + Fiyat↑ = Boğa Birikimi (yeni LONG girişi)
 * OI↑ + Fiyat↓ = Ayı Birikimi  (yeni SHORT girişi)
 * OI↓ + Fiyat↑ = Short Squeeze (short kapanması)
 * OI↓ + Fiyat↓ = Long Tasfiyesi (long kapanması)
 */
function analyzeOIChange(futuresData, currentPrice, prevPrice) {
  const oi     = parseFloat(futuresData?.openInterest      || 0);
  const prevOI = parseFloat(futuresData?.prevOpenInterest  || oi);

  if (!oi || !prevOI || oi === prevOI) {
    return { signal: 'UNKNOWN', description: 'OI verisi yok veya değişmedi', strength: 0, oiChange: 0, trend: 'FLAT' };
  }

  const oiChangePct = ((oi - prevOI) / prevOI) * 100;
  const oiUp   = oiChangePct > 0.5;
  const oiDown = oiChangePct < -0.5;
  const priceUp  = currentPrice > (prevPrice || currentPrice);

  let signal, description, strength, bullishBias;

  if (oiUp && priceUp) {
    signal       = 'BULLISH_BUILDUP';
    description  = `🟢 OI↑%${oiChangePct.toFixed(2)} + Fiyat↑ — Yeni LONG girişi (güçlü boğa)`;
    strength     = Math.min(100, Math.abs(oiChangePct) * 6);
    bullishBias  = true;
  } else if (oiUp && !priceUp) {
    signal       = 'BEARISH_BUILDUP';
    description  = `🔴 OI↑%${oiChangePct.toFixed(2)} + Fiyat↓ — Yeni SHORT girişi (güçlü ayı)`;
    strength     = Math.min(100, Math.abs(oiChangePct) * 6);
    bullishBias  = false;
  } else if (oiDown && priceUp) {
    signal       = 'SHORT_SQUEEZE';
    description  = `⚡ OI↓%${Math.abs(oiChangePct).toFixed(2)} + Fiyat↑ — Short squeeze / short kapanması`;
    strength     = Math.min(100, Math.abs(oiChangePct) * 4);
    bullishBias  = true;
  } else if (oiDown && !priceUp) {
    signal       = 'LONG_LIQUIDATION';
    description  = `⚡ OI↓%${Math.abs(oiChangePct).toFixed(2)} + Fiyat↓ — Long tasfiyesi`;
    strength     = Math.min(100, Math.abs(oiChangePct) * 5);
    bullishBias  = false;
  } else {
    signal       = 'NEUTRAL';
    description  = `⚖️ OI değişimi küçük (%${oiChangePct.toFixed(2)}) — kararlı pozisyonlama`;
    strength     = 20;
    bullishBias  = null;
  }

  return {
    signal,
    description,
    strength:    Math.round(strength),
    oiChange:    +oiChangePct.toFixed(2),
    trend:       oiUp ? 'INCREASING' : oiDown ? 'DECREASING' : 'FLAT',
    bullishBias,
    oi:          +oi.toFixed(0),
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BÖLÜM 4 — Funding Rate Analizi
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Funding rate'i yorumlar ve contrarian sinyal üretir
 * Eşikler: 8 saatlik döngüye göre kalibre edilmiş (Binance perps)
 */
function analyzeFundingRate(fundingRate) {
  if (fundingRate === null || fundingRate === undefined || fundingRate === '') {
    return { signal: 'UNKNOWN', crowded: false, extreme: false, risk: 'UNKNOWN', description: 'Funding verisi yok', rate: null, contrarian: null };
  }

  const fr    = parseFloat(fundingRate);
  const frPct = fr * 100;

  // Eşikler (8 saatlik)
  const EXTREME_LONG  =  0.008;  // > 0.8% — aşırı long kalabalığı
  const HIGH_LONG     =  0.003;  // > 0.3%
  const EXTREME_SHORT = -0.005;  // < -0.5% — aşırı short kalabalığı
  const HIGH_SHORT    = -0.002;  // < -0.2%

  let signal, crowded, extreme, risk, description, contrarian;

  if (fr >= EXTREME_LONG) {
    signal      = 'EXTREME_LONG_CROWDED';
    crowded     = true;
    extreme     = true;
    risk        = 'HIGH';
    description = `⚠️ Aşırı LONG kalabalığı (${frPct.toFixed(4)}%) — Fiyat baskı altında, SHORT contrarian`;
    contrarian  = 'SHORT_BIAS';
  } else if (fr >= HIGH_LONG) {
    signal      = 'LONG_CROWDED';
    crowded     = true;
    extreme     = false;
    risk        = 'MODERATE';
    description = `⚠️ LONG kalabalığı (${frPct.toFixed(4)}%) — Long girişine dikkat`;
    contrarian  = 'CAUTION_LONG';
  } else if (fr <= EXTREME_SHORT) {
    signal      = 'EXTREME_SHORT_CROWDED';
    crowded     = true;
    extreme     = true;
    risk        = 'HIGH';
    description = `⚠️ Aşırı SHORT kalabalığı (${frPct.toFixed(4)}%) — Short squeeze riski, LONG contrarian`;
    contrarian  = 'LONG_BIAS';
  } else if (fr <= HIGH_SHORT) {
    signal      = 'SHORT_CROWDED';
    crowded     = true;
    extreme     = false;
    risk        = 'MODERATE';
    description = `⚠️ SHORT kalabalığı (${frPct.toFixed(4)}%) — Short squeeze dikkat`;
    contrarian  = 'CAUTION_SHORT';
  } else {
    signal      = 'NEUTRAL';
    crowded     = false;
    extreme     = false;
    risk        = 'LOW';
    description = `✅ Nötr funding (${frPct.toFixed(4)}%) — Sağlıklı pozisyonlama`;
    contrarian  = null;
  }

  return { signal, crowded, extreme, risk, description, rate: +frPct.toFixed(4), contrarian };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BÖLÜM 5 — Taker Buy/Sell Ratio
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Agresif emir akışı yönünü yorumlar
 * takerBuyRatio = takerBuyVolume / takerSellVolume
 */
function analyzeTakerRatio(takerBuyRatio) {
  if (!takerBuyRatio) {
    return { signal: 'UNKNOWN', pressure: 50, ratio: null, description: 'Taker verisi yok' };
  }

  const ratio       = parseFloat(takerBuyRatio);
  const buyPressure = Math.round((ratio / (1 + ratio)) * 100);

  let signal;
  if      (ratio > 1.5)  signal = 'STRONG_BUY_PRESSURE';
  else if (ratio > 1.1)  signal = 'BUY_PRESSURE';
  else if (ratio < 0.65) signal = 'STRONG_SELL_PRESSURE';
  else if (ratio < 0.9)  signal = 'SELL_PRESSURE';
  else                   signal = 'BALANCED';

  const description =
    ratio > 1.1  ? `📈 Agresif alım baskısı (${ratio.toFixed(2)}x) — piyasa emirleri alım yönünde` :
    ratio < 0.9  ? `📉 Agresif satım baskısı (${ratio.toFixed(2)}x) — piyasa emirleri satım yönünde` :
                   `⚖️ Dengeli taker akışı (${ratio.toFixed(2)}x)`;

  return { signal, pressure: buyPressure, ratio: +ratio.toFixed(3), description };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BÖLÜM 6 — Long/Short Ratio Analizi
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function analyzeLSRatio(longShortRatio) {
  if (!longShortRatio) {
    return { signal: 'UNKNOWN', ratio: null, description: 'L/S verisi yok', contrarian: null };
  }

  const ls  = parseFloat(longShortRatio);
  const pct = +(ls / (1 + ls) * 100).toFixed(1); // Long oranı %

  let signal, contrarian, description;

  if (ls > 2.5) {
    signal      = 'EXTREME_LONG_HEAVY';
    contrarian  = 'SHORT_BIAS';
    description = `⚠️ L/S: ${ls.toFixed(2)} — Aşırı long kalabalığı (%${pct}), contrarian short`;
  } else if (ls > 1.5) {
    signal      = 'LONG_HEAVY';
    contrarian  = 'CAUTION_LONG';
    description = `🟡 L/S: ${ls.toFixed(2)} — Long ağırlıklı (%${pct})`;
  } else if (ls < 0.5) {
    signal      = 'EXTREME_SHORT_HEAVY';
    contrarian  = 'LONG_BIAS';
    description = `⚠️ L/S: ${ls.toFixed(2)} — Aşırı short kalabalığı (%${pct}), contrarian long`;
  } else if (ls < 0.8) {
    signal      = 'SHORT_HEAVY';
    contrarian  = 'CAUTION_SHORT';
    description = `🟡 L/S: ${ls.toFixed(2)} — Short ağırlıklı (%${pct})`;
  } else {
    signal      = 'BALANCED';
    contrarian  = null;
    description = `✅ L/S: ${ls.toFixed(2)} — Dengeli (%${pct} long)`;
  }

  return { signal, ratio: +ls.toFixed(2), longPct: pct, description, contrarian };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BÖLÜM 7 — Ağırlıklı Order Flow Skoru
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Tüm order flow bileşenlerini birleştirerek 0-100 arası bir skor üretir
 * @param {string} direction 'LONG' | 'SHORT'
 */
function scoreOrderFlow(cvd, vwap, oi, funding, taker, lsRatio, direction) {
  let score = 0;
  const signals    = [];
  const penalties  = [];

  const isLong  = direction === 'LONG';
  const isShort = direction === 'SHORT';

  // ── CVD (25 puan) ──────────────────────────────────────────────────────────
  if (isLong && cvd.trend === 'BULLISH') {
    score += 15;
    signals.push('CVD boğa');
  } else if (isShort && cvd.trend === 'BEARISH') {
    score += 15;
    signals.push('CVD ayı');
  }
  if (isLong && cvd.divType === 'BULLISH_DIVERGENCE') {
    score += 10;
    signals.push('Bullish CVD diverjansı');
  } else if (isShort && cvd.divType === 'BEARISH_DIVERGENCE') {
    score += 10;
    signals.push('Bearish CVD diverjansı');
  }
  if (cvd.divergence && !signals.some(s => s.includes('Diverjans'))) {
    penalties.push('Ters CVD diverjansı');
    score -= 8;
  }

  // ── VWAP (20 puan) ─────────────────────────────────────────────────────────
  if (isLong && ['ABOVE_VWAP', 'SLIGHT_ABOVE'].includes(vwap.position)) {
    score += 15;
    signals.push('VWAP üstünde');
  } else if (isShort && ['BELOW_VWAP', 'SLIGHT_BELOW'].includes(vwap.position)) {
    score += 15;
    signals.push('VWAP altında');
  }
  if (vwap.institutional) {
    score += 5;
    signals.push('VWAP kurumsal bölge');
  }
  // Extreme VWAP sapması — karşı yönde olunca ceza
  if (isLong && vwap.position === 'EXTREME_ABOVE')  { score -= 5; penalties.push('VWAP aşırı uzağında'); }
  if (isShort && vwap.position === 'EXTREME_BELOW') { score -= 5; penalties.push('VWAP aşırı uzağında'); }

  // ── OI (25 puan) ──────────────────────────────────────────────────────────
  const bullishOI = ['BULLISH_BUILDUP', 'SHORT_SQUEEZE'];
  const bearishOI = ['BEARISH_BUILDUP', 'LONG_LIQUIDATION'];
  if (isLong && bullishOI.includes(oi.signal)) {
    score += Math.min(25, oi.strength * 0.25);
    signals.push(oi.signal);
  } else if (isShort && bearishOI.includes(oi.signal)) {
    score += Math.min(25, oi.strength * 0.25);
    signals.push(oi.signal);
  }

  // ── Funding Rate (15 puan) ────────────────────────────────────────────────
  if (!funding.crowded) {
    score += 8;
    signals.push('Nötr funding');
  }
  if (isShort && funding.contrarian === 'SHORT_BIAS') {
    score += 15;
    signals.push('Contrarian short (aşırı long)');
  } else if (isLong && funding.contrarian === 'LONG_BIAS') {
    score += 15;
    signals.push('Contrarian long (aşırı short)');
  }
  if (funding.extreme) {
    penalties.push('Extreme funding — risk yüksek');
    score -= 10;
  }

  // ── Taker (10 puan) ──────────────────────────────────────────────────────
  if (isLong && taker.signal?.includes('BUY')) {
    score += 10;
    signals.push(`Alım baskısı (${taker.ratio}x)`);
  } else if (isShort && taker.signal?.includes('SELL')) {
    score += 10;
    signals.push(`Satım baskısı (${taker.ratio}x)`);
  }

  // ── L/S Ratio (5 puan bonus) ──────────────────────────────────────────────
  if (isShort && lsRatio.contrarian === 'SHORT_BIAS') {
    score += 5;
    signals.push('L/S contrarian short');
  } else if (isLong && lsRatio.contrarian === 'LONG_BIAS') {
    score += 5;
    signals.push('L/S contrarian long');
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score:    finalScore,
    signals,
    penalties,
    aligned:  finalScore >= 35,
    strong:   finalScore >= 60,
    grade:    finalScore >= 75 ? 'A' : finalScore >= 55 ? 'B' : finalScore >= 35 ? 'C' : 'D',
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BÖLÜM 8 — Ana Analiz Fonksiyonu
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Kapsamlı order flow analizi — tüm bileşenler bir arada
 * @param {Array}  candles     [[ts, o, h, l, c, v], ...]
 * @param {Object} futuresData { fundingRate, openInterest, prevOpenInterest, takerBuyRatio, longShortRatio }
 * @param {string} direction   'LONG' | 'SHORT' | 'NEUTRAL'
 * @param {number} prevPrice   Önceki mum kapanış fiyatı
 */
function analyzeOrderFlow(candles, futuresData = {}, direction = 'NEUTRAL', prevPrice = null) {
  const currentPrice = candles?.[candles.length - 1]?.[4] || 0;
  const _prevPrice   = prevPrice || candles?.[candles.length - 2]?.[4] || currentPrice;

  const cvd     = analyzeCVD(candles);
  const vwap    = analyzeVWAP(candles);
  const oi      = analyzeOIChange(futuresData, currentPrice, _prevPrice);
  const funding = analyzeFundingRate(futuresData?.fundingRate);
  const taker   = analyzeTakerRatio(futuresData?.takerBuyRatio);
  const lsRatio = analyzeLSRatio(futuresData?.longShortRatio);

  const flowScore = scoreOrderFlow(cvd, vwap, oi, funding, taker, lsRatio, direction);

  // Özet: Boğa ve ayı sinyal listesi
  const bullishSignals = [
    cvd.trend === 'BULLISH'                     ? 'CVD boğa'           : null,
    vwap.position?.includes('ABOVE')            ? 'VWAP üstü'         : null,
    oi.bullishBias                              ? oi.signal            : null,
    taker.signal?.includes('BUY')               ? 'Agresif alım'      : null,
    funding.contrarian === 'LONG_BIAS'          ? 'Contrarian long'   : null,
    lsRatio.contrarian === 'LONG_BIAS'          ? 'L/S contrarian'    : null,
  ].filter(Boolean);

  const bearishSignals = [
    cvd.trend === 'BEARISH'                     ? 'CVD ayı'            : null,
    vwap.position?.includes('BELOW')            ? 'VWAP altı'         : null,
    oi.bullishBias === false                    ? oi.signal            : null,
    taker.signal?.includes('SELL')              ? 'Agresif satım'     : null,
    funding.contrarian === 'SHORT_BIAS'         ? 'Contrarian short'  : null,
    lsRatio.contrarian === 'SHORT_BIAS'         ? 'L/S contrarian'    : null,
  ].filter(Boolean);

  return {
    cvd,
    vwap,
    oi,
    funding,
    taker,
    lsRatio,
    flowScore,
    summary: {
      bullish: bullishSignals,
      bearish: bearishSignals,
      dominant: bullishSignals.length > bearishSignals.length ? 'BULLISH'
                : bearishSignals.length > bullishSignals.length ? 'BEARISH'
                : 'NEUTRAL',
    },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dışa Aktar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export {
  analyzeOrderFlow,
  analyzeCVD,
  analyzeVWAP,
  analyzeOIChange,
  analyzeFundingRate,
  analyzeTakerRatio,
  analyzeLSRatio,
  scoreOrderFlow,
};
