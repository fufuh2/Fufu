// ═══════════════════════════════════════════════════════════════════════════
// CHARTOS APEX QUANTUM — Macro Calendar + Trend Break + Manipulation Engine
// lib/macro-calendar-engine.js
// ═══════════════════════════════════════════════════════════════════════════

// ─── MAKRO TAKVİM ANALİZİ ──────────────────────────────────────────────

const MACRO_EVENTS_STATIC = [
  // Bu liste periyodik olarak güncellenebilir veya API'den çekilebilir
  // Şimdilik statik liste + dinamik hesaplama
];

/**
 * Investing.com economic calendar API'den makro olayları çeker
 */
async function fetchMacroEvents() {
  try {
    const now = new Date();
    const next7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const fromStr = now.toISOString().split('T')[0];
    const toStr = next7d.toISOString().split('T')[0];

    // Alternatif: Finnhub calendar
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/economic?from=${fromStr}&to=${toStr}&token=free`,
      { signal: AbortSignal.timeout(8000) }
    ).catch(() => null);

    if (res?.ok) {
      const data = await res.json();
      if (data?.economicCalendar) {
        return data.economicCalendar
          .filter(e => e.impact >= 2) // medium + high
          .map(e => ({
            date: e.time?.split(' ')[0] || fromStr,
            time: e.time?.split(' ')[1] || '00:00',
            country: e.country || 'US',
            event: e.event || 'Unknown',
            impact: e.impact >= 3 ? 'HIGH' : 'MEDIUM',
            previous: String(e.prev ?? '—'),
            forecast: String(e.estimate ?? '—'),
            actual: String(e.actual ?? '—'),
            description: getEventDescription(e.event, e.country),
          }));
      }
    }
  } catch (err) {
    console.error('Macro calendar fetch error:', err.message);
  }
  return getStaticMacroEvents();
}

function getStaticMacroEvents() {
  const now = new Date();
  const events = [];

  // Her ay tekrar eden önemli ABD verileri
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // CPI genelde ayın 12-14'ü
  events.push({
    date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-12`,
    time: '15:30', country: 'US', event: 'CPI (Tüketici Fiyat Endeksi)',
    impact: 'HIGH', previous: '—', forecast: '—',
    description: 'ABD enflasyon verisi. Yüksek gelirse DXY↑ BTC↓, düşük gelirse DXY↓ BTC↑'
  });

  // FOMC genelde ayın 3. Çarşambası
  const thirdWed = getThirdWednesday(currentYear, currentMonth);
  events.push({
    date: thirdWed, time: '21:00', country: 'US', event: 'FOMC Faiz Kararı',
    impact: 'HIGH', previous: '—', forecast: '—',
    description: 'Fed faiz kararı. Şahin tonlama BTC↓, güvercin tonlama BTC↑'
  });

  // NFP her ayın ilk Cuması
  const firstFriday = getFirstFriday(currentYear, currentMonth);
  events.push({
    date: firstFriday, time: '15:30', country: 'US', event: 'NFP (Tarım Dışı İstihdam)',
    impact: 'HIGH', previous: '—', forecast: '—',
    description: 'ABD istihdam verisi. Güçlü veri karışık etki, zayıf veri risk-on potansiyeli'
  });

  return events;
}

function getThirdWednesday(year, month) {
  const d = new Date(year, month, 1);
  let count = 0;
  while (count < 3) {
    if (d.getDay() === 3) count++;
    if (count < 3) d.setDate(d.getDate() + 1);
  }
  return d.toISOString().split('T')[0];
}

function getFirstFriday(year, month) {
  const d = new Date(year, month, 1);
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function getEventDescription(event, country) {
  const e = (event || '').toLowerCase();
  if (e.includes('cpi') || e.includes('inflation')) return 'Enflasyon verisi — yüksek gelirse şahin beklenti, BTC↓';
  if (e.includes('fomc') || e.includes('interest rate') || e.includes('fed')) return 'Fed faiz kararı — piyasa yön değiştirebilir';
  if (e.includes('nonfarm') || e.includes('nfp') || e.includes('employment')) return 'İstihdam verisi — güçlü/zayıf veri karışık etki yaratabilir';
  if (e.includes('gdp')) return 'Büyüme verisi — risk iştahını doğrudan etkiler';
  if (e.includes('pmi')) return 'PMI verisi — ekonomik aktivite göstergesi';
  if (e.includes('retail')) return 'Perakende satışlar — tüketici harcama gücü göstergesi';
  return `${country} ekonomik veri açıklaması`;
}

/**
 * Makro takvim analizi: Yaklaşan olayları değerlendir
 */
function analyzeMacroCalendar(events) {
  const now = new Date();
  const next48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const next7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const upcoming48h = (events || []).filter(e => {
    const eventDate = new Date(e.date + 'T' + (e.time || '00:00') + ':00Z');
    return eventDate >= now && eventDate <= next48h;
  });

  const upcoming7d = (events || []).filter(e => {
    const eventDate = new Date(e.date + 'T' + (e.time || '00:00') + ':00Z');
    return eventDate >= now && eventDate <= next7d;
  });

  const highImpact48h = upcoming48h.filter(e => e.impact === 'HIGH');
  const highImpact7d = upcoming7d.filter(e => e.impact === 'HIGH');

  let riskLevel = 'LOW';
  let restriction = 'Normal işlem koşulları — tüm stratejiler aktif.';

  if (highImpact48h.length >= 2) {
    riskLevel = 'EXTREME';
    restriction = '⛔ YENİ POZİSYON AÇMA. Mevcut pozisyonlarda SL sıkılaştır. Veri sonrası 4H kapanışı bekle.';
  } else if (highImpact48h.length === 1) {
    riskLevel = 'HIGH';
    restriction = '⚠️ Veri öncesi yeni pozisyon açma. Mevcut SL\'yi sıkılaştır. Veri sonrası 4H kapanışı bekle.';
  } else if (highImpact7d.length > 0) {
    riskLevel = 'MODERATE';
    restriction = '🟡 Bu hafta yüksek etkili veri var. Pozisyon büyüklüğünü %50 küçült.';
  }

  // Saat hesapla
  const nextHighEvent = highImpact48h[0] || highImpact7d[0];
  let hoursUntilEvent = null;
  if (nextHighEvent) {
    const eventDate = new Date(nextHighEvent.date + 'T' + (nextHighEvent.time || '00:00') + ':00Z');
    hoursUntilEvent = Math.round((eventDate - now) / (60 * 60 * 1000));
  }

  return {
    events: upcoming7d,
    highImpactEvents: [...highImpact48h, ...highImpact7d.filter(e => !highImpact48h.includes(e))],
    riskLevel,
    tradingRestriction: restriction,
    hoursUntilNextHigh: hoursUntilEvent,
    isWeekend: [0, 6].includes(now.getUTCDay()),
    description: highImpact7d.length > 0
      ? highImpact7d.map(e => `${e.date} ${e.time} — ${e.country} ${e.event}`).join(' | ')
      : 'Yakın vadede yüksek etkili veri yok.',
  };
}

// ─── TREND BREAK DETECTION ──────────────────────────────────────────────

function r(n) { return Math.round(n * 100) / 100; }

/**
 * Multi-TF trend kırılım tespit sistemi
 * BOS, CHoCH, MSS, Death Cross, Golden Cross
 */
function detectTrendBreaks(candles, timeframe) {
  const breaks = [];
  if (!candles || candles.length < 30) return breaks;

  // Swing detection (5-bar pivot)
  const swingHighs = [];
  const swingLows = [];

  for (let i = 5; i < candles.length - 5; i++) {
    let isH = true, isL = true;
    for (let j = 1; j <= 5; j++) {
      if (candles[i].high <= candles[i-j].high || candles[i].high <= candles[i+j].high) isH = false;
      if (candles[i].low >= candles[i-j].low || candles[i].low >= candles[i+j].low) isL = false;
    }
    if (isH) swingHighs.push({ price: candles[i].high, idx: i });
    if (isL) swingLows.push({ price: candles[i].low, idx: i });
  }

  if (swingHighs.length < 2 || swingLows.length < 2) return breaks;

  const lastH = swingHighs.slice(-3);
  const lastL = swingLows.slice(-3);
  const currentPrice = candles[candles.length - 1].close;
  const lastCandle = candles[candles.length - 1];

  // ── BOS Detection: Son swing high/low kırıldı mı? ──
  if (lastH.length >= 2) {
    const prevHigh = lastH[lastH.length - 2].price;
    if (currentPrice > prevHigh) {
      breaks.push({
        timeframe, type: 'BOS', direction: 'BULLISH',
        price: prevHigh,
        confirmed: lastCandle.close > prevHigh,
        description: `${timeframe} Bullish BOS — $${Math.round(prevHigh)} swing high kırıldı. ${lastCandle.close > prevHigh ? 'Kapanışla teyit edildi.' : 'Henüz teyit bekleniyor, kapanış gerekli.'}`,
      });
    }
  }

  if (lastL.length >= 2) {
    const prevLow = lastL[lastL.length - 2].price;
    if (currentPrice < prevLow) {
      breaks.push({
        timeframe, type: 'BOS', direction: 'BEARISH',
        price: prevLow,
        confirmed: lastCandle.close < prevLow,
        description: `${timeframe} Bearish BOS — $${Math.round(prevLow)} swing low kırıldı. ${lastCandle.close < prevLow ? 'Kapanışla teyit edildi.' : 'Henüz teyit bekleniyor.'}`,
      });
    }
  }

  // ── CHoCH Detection: Trend yönü değişti mi? ──
  if (lastH.length >= 3 && lastL.length >= 3) {
    const h = lastH.slice(-3).map(s => s.price);
    const l = lastL.slice(-3).map(s => s.price);

    // Downtrend → Bullish CHoCH: LH/LL bozuldu → HH oluştu
    if (h[0] > h[1] && h[2] > h[1] && l[1] < l[0]) {
      breaks.push({
        timeframe, type: 'CHoCH', direction: 'BULLISH',
        price: h[1],
        confirmed: currentPrice > h[1],
        description: `${timeframe} Bullish CHoCH — Düşüş trendi bozuldu, ilk higher high $${Math.round(h[2])} oluştu. ${currentPrice > h[1] ? 'Teyit edildi.' : 'Henüz teyit bekleniyor.'}`,
      });
    }

    // Uptrend → Bearish CHoCH: HH/HL bozuldu → LL oluştu
    if (l[0] < l[1] && l[2] < l[1] && h[1] > h[0]) {
      breaks.push({
        timeframe, type: 'CHoCH', direction: 'BEARISH',
        price: l[1],
        confirmed: currentPrice < l[1],
        description: `${timeframe} Bearish CHoCH — Yükseliş trendi bozuldu, ilk lower low $${Math.round(l[2])} oluştu. ${currentPrice < l[1] ? 'Teyit edildi.' : 'Henüz teyit bekleniyor.'}`,
      });
    }
  }

  // ── MSS (Market Structure Shift) Detection ──
  // Son 10 mum içinde ani yapısal kırılım
  const recent10 = candles.slice(-10);
  if (recent10.length >= 10) {
    const recentHighs = recent10.map(c => c.high);
    const recentLows = recent10.map(c => c.low);
    const maxRecent = Math.max(...recentHighs.slice(0, 7));
    const minRecent = Math.min(...recentLows.slice(0, 7));

    if (currentPrice > maxRecent && recent10[0].close < recent10[0].open) {
      breaks.push({
        timeframe, type: 'MSS', direction: 'BULLISH',
        price: maxRecent,
        confirmed: true,
        description: `${timeframe} Bullish MSS — Son 10 barda yapısal kırılım, $${Math.round(maxRecent)} üstüne çıkıldı.`,
      });
    }
    if (currentPrice < minRecent && recent10[0].close > recent10[0].open) {
      breaks.push({
        timeframe, type: 'MSS', direction: 'BEARISH',
        price: minRecent,
        confirmed: true,
        description: `${timeframe} Bearish MSS — Son 10 barda yapısal kırılım, $${Math.round(minRecent)} altına inildi.`,
      });
    }
  }

  // ── Moving Average Cross Detection ──
  const closes = candles.map(c => c.close);
  if (closes.length >= 200) {
    const calcEMA = (data, period) => {
      const k = 2 / (period + 1);
      const ema = [data[0]];
      for (let i = 1; i < data.length; i++) ema.push(data[i] * k + ema[i-1] * (1-k));
      return ema;
    };

    const ema50 = calcEMA(closes, 50);
    const ema200 = calcEMA(closes, 200);
    const last = closes.length - 1;
    const prev = closes.length - 2;

    // Death Cross
    if (ema50[last] < ema200[last] && ema50[prev] >= ema200[prev]) {
      breaks.push({
        timeframe, type: 'DEATH_CROSS', direction: 'BEARISH',
        price: currentPrice,
        confirmed: true,
        description: `${timeframe} Death Cross — 50 EMA, 200 EMA'nın altına geçti. Uzun vadeli bearish sinyal.`,
      });
    }

    // Golden Cross
    if (ema50[last] > ema200[last] && ema50[prev] <= ema200[prev]) {
      breaks.push({
        timeframe, type: 'GOLDEN_CROSS', direction: 'BULLISH',
        price: currentPrice,
        confirmed: true,
        description: `${timeframe} Golden Cross — 50 EMA, 200 EMA'nın üstüne geçti. Uzun vadeli bullish sinyal.`,
      });
    }

    // EMA50 vs EMA200 ilişkisi (cross olmasa bile)
    const emaGap = ((ema50[last] - ema200[last]) / ema200[last]) * 100;
    breaks.push({
      timeframe, type: emaGap > 0 ? 'EMA_BULLISH' : 'EMA_BEARISH',
      direction: emaGap > 0 ? 'BULLISH' : 'BEARISH',
      price: currentPrice,
      confirmed: true,
      description: `${timeframe} EMA50 ${emaGap > 0 ? 'üstünde' : 'altında'} EMA200 (fark: ${emaGap.toFixed(2)}%). ${Math.abs(emaGap) < 1 ? 'Cross yakın olabilir!' : ''}`,
    });
  }

  return breaks;
}

// ─── INSTITUTIONAL ZONE DETECTION ──────────────────────────────────────

/**
 * Kurumsal bölge tespiti — multi-confluence zone mapping
 */
function detectInstitutionalZones(candles, currentPrice, timeframe) {
  if (!candles || candles.length < 20) return { demand: [], supply: [] };

  const demand = [];
  const supply = [];

  // Order Block detection
  for (let i = 2; i < Math.min(candles.length - 1, 80); i++) {
    const c = candles[i];
    const next = candles[i + 1];
    if (!next) continue;

    // Bullish OB: bearish bar → strong bullish move
    if (c.close < c.open && next.close > c.high * 1.003) {
      const mitigated = candles.slice(i + 1).some(x => x.low < c.low);
      if (!mitigated) {
        const distance = ((currentPrice - c.low) / currentPrice) * 100;
        if (distance > 0 && distance < 15) {
          demand.push({
            low: r(c.low), high: r(c.high), tf: timeframe,
            type: 'OB', freshness: mitigated ? 'MITIGATED' : 'VIRGIN',
            distance: r(distance),
            age: candles.length - i,
          });
        }
      }
    }

    // Bearish OB: bullish bar → strong bearish move
    if (c.close > c.open && next.close < c.low * 0.997) {
      const mitigated = candles.slice(i + 1).some(x => x.high > c.high);
      if (!mitigated) {
        const distance = ((c.high - currentPrice) / currentPrice) * 100;
        if (distance > 0 && distance < 15) {
          supply.push({
            low: r(c.low), high: r(c.high), tf: timeframe,
            type: 'OB', freshness: mitigated ? 'MITIGATED' : 'VIRGIN',
            distance: r(distance),
            age: candles.length - i,
          });
        }
      }
    }
  }

  // FVG detection
  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1], next = candles[i + 1];

    // Bullish FVG
    if (next.low > prev.high) {
      const filled = candles.slice(i + 1).some(x => x.low <= prev.high);
      if (!filled) {
        const mid = (prev.high + next.low) / 2;
        const distance = ((currentPrice - mid) / currentPrice) * 100;
        if (Math.abs(distance) < 15) {
          const zone = distance > 0 ? demand : supply;
          zone.push({
            low: r(prev.high), high: r(next.low), tf: timeframe,
            type: 'FVG', freshness: 'UNFILLED', distance: r(Math.abs(distance)),
            age: candles.length - i,
          });
        }
      }
    }

    // Bearish FVG
    if (next.high < prev.low) {
      const filled = candles.slice(i + 1).some(x => x.high >= prev.low);
      if (!filled) {
        const mid = (prev.low + next.high) / 2;
        const distance = ((mid - currentPrice) / currentPrice) * 100;
        if (Math.abs(distance) < 15) {
          const zone = distance > 0 ? supply : demand;
          zone.push({
            low: r(next.high), high: r(prev.low), tf: timeframe,
            type: 'FVG', freshness: 'UNFILLED', distance: r(Math.abs(distance)),
            age: candles.length - i,
          });
        }
      }
    }
  }

  // Sort by distance from current price
  demand.sort((a, b) => a.distance - b.distance);
  supply.sort((a, b) => a.distance - b.distance);

  return { demand: demand.slice(0, 5), supply: supply.slice(0, 5) };
}

/**
 * Bölge kalite skorlama — multi-confluence quality assessment
 */
function scoreZoneQuality(zone, allZones, fibLevels, currentPrice) {
  let score = 40; // Base score
  const sources = [zone.type];

  // Virgin bonus
  if (zone.freshness === 'VIRGIN' || zone.freshness === 'UNFILLED') score += 15;

  // Multi-TF confluence: aynı bölgede başka TF'den zone var mı?
  const mid = (zone.low + zone.high) / 2;
  const overlap = allZones.filter(z =>
    z !== zone && z.tf !== zone.tf &&
    Math.abs((z.low + z.high) / 2 - mid) / mid < 0.02
  );
  score += overlap.length * 12;
  overlap.forEach(z => { if (!sources.includes(z.type + ' (' + z.tf + ')')) sources.push(z.type + ' (' + z.tf + ')'); });

  // Fibonacci confluence
  if (fibLevels) {
    const fibKeys = ['fib_38.2', 'fib_50.0', 'fib_61.8', 'fib_78.6'];
    for (const key of fibKeys) {
      const fib = fibLevels[key];
      if (fib && Math.abs(mid - fib) / mid < 0.015) {
        score += 10;
        sources.push('Fib ' + key.replace('fib_', ''));
        break;
      }
    }
  }

  // Psychological level bonus
  const psych = [1000, 5000, 10000, 20000, 25000, 30000, 40000, 50000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000, 100000];
  if (psych.some(p => Math.abs(mid - p) / mid < 0.01)) {
    score += 8;
    sources.push('Psikolojik Seviye');
  }

  // Freshness decay (eskidikçe zayıflar)
  if (zone.age > 50) score -= 5;
  if (zone.age > 100) score -= 10;

  return {
    score: Math.min(100, Math.max(0, score)),
    grade: score >= 90 ? 'A++' : score >= 75 ? 'A' : score >= 60 ? 'B' : 'C',
    sources,
  };
}

// ─── MANIPULATION RISK ASSESSMENT ──────────────────────────────────────

/**
 * Stop hunt, FOMO trap, news manipulation, weekend risk tespiti
 */
function assessManipulationRisks(currentPrice, swingHighs, swingLows, isWeekend, nearMacroEvent) {
  const risks = [];

  // EQL stop hunt riski (alttaki stop-loss kümeleri)
  for (const low of (swingLows || []).slice(-5)) {
    const distance = ((currentPrice - low) / currentPrice) * 100;
    if (distance > 0 && distance < 5) {
      risks.push({
        type: 'STOP_HUNT_LOW',
        level: distance < 2 ? 'HIGH' : 'MEDIUM',
        priceLevel: low,
        description: `$${Math.round(low)} altında yoğun stop-loss kümesi. Sweep riski ${distance < 2 ? 'YÜKSEK' : 'ORTA'} — fiyat bu seviyeyi kısa süreli kırıp geri dönebilir.`,
      });
    }
  }

  // EQH stop hunt riski (üstteki short stop-loss'ları)
  for (const high of (swingHighs || []).slice(-5)) {
    const distance = ((high - currentPrice) / currentPrice) * 100;
    if (distance > 0 && distance < 5) {
      risks.push({
        type: 'STOP_HUNT_HIGH',
        level: distance < 2 ? 'HIGH' : 'MEDIUM',
        priceLevel: high,
        description: `$${Math.round(high)} üstünde short stop-loss kümesi. Squeeze potansiyeli ${distance < 2 ? 'YÜKSEK' : 'ORTA'}.`,
      });
    }
  }

  // Weekend manipulation
  if (isWeekend) {
    risks.push({
      type: 'WEEKEND_MANIPULATION',
      level: 'MEDIUM',
      priceLevel: currentPrice,
      description: 'Hafta sonu düşük hacim — sahte kırılım riski yüksek. Pazartesi teyidi olmadan kırılımlara güvenme.',
    });
  }

  // Macro event manipulation
  if (nearMacroEvent) {
    risks.push({
      type: 'NEWS_MANIPULATION',
      level: 'HIGH',
      priceLevel: currentPrice,
      description: 'Yaklaşan makro veri nedeniyle fiyat hareketleri aldatıcı olabilir. Judas Swing riski — ilk hareket genellikle YANLIŞ yöne olur.',
    });
  }

  return risks;
}

// ─── SESSION / KILLZONE DETECTION ──────────────────────────────────────

function detectSession() {
  const now = new Date();
  const utcH = now.getUTCHours();

  if (utcH >= 0 && utcH < 8) return { name: 'ASIA', killzone: utcH >= 0 && utcH <= 4, label: 'Asya Seansı', desc: 'Düşük hacim, sıkışma fazı' };
  if (utcH >= 7 && utcH < 12) return { name: 'LONDON', killzone: utcH >= 7 && utcH <= 10, label: 'Londra Seansı', desc: 'Yüksek hacim, trend başlangıcı' };
  if (utcH >= 12 && utcH < 16) return { name: 'NEW_YORK', killzone: utcH >= 13 && utcH <= 16, label: 'New York Seansı', desc: 'En yüksek hacim, büyük hareketler' };
  if (utcH >= 16 && utcH < 21) return { name: 'NY_AFTERNOON', killzone: false, label: 'NY Öğleden Sonra', desc: 'Azalan hacim, reversal riski' };
  return { name: 'OFF_HOURS', killzone: false, label: 'Kapalı Saat', desc: 'Düşük likidite, sahte kırılım riski' };
}

// ─── EXPORT ────────────────────────────────────────────────────────────

module.exports = {
  fetchMacroEvents,
  analyzeMacroCalendar,
  detectTrendBreaks,
  detectInstitutionalZones,
  scoreZoneQuality,
  assessManipulationRisks,
  detectSession,
};
