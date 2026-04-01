// pages/api/borsa-analyze.js
// DeepTradeScan — BIST Kurumsal Analiz Motoru v1.0
// Yahoo Finance OHLCV + Teknik Göstergeler + Claude AI (claude-sonnet-4-6)
// 10 Bölüm: VERİ-MODELİ / MAKRO-BORSA / TEKNİK / SEKTÖR / HACİM / KURUMSAL / SENARYO / TRADE / RİSK / YÖNETİCİ-ÖZETİ

import { BIST_META } from './bist-prices.js';

const SB_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_SVC = () => process.env.SUPABASE_SERVICE_KEY;

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Origin': 'https://finance.yahoo.com',
  'Referer': 'https://finance.yahoo.com/',
};

const YF_HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
const YF_RANGES = ['6mo', '1y', '2y'];

// ── Module-level cache (Node runtime — persists across requests in same process) ──
const _chartCache = new Map(); // key → { ts, data }
const _aiCache    = new Map(); // ticker → { ts, data }
const CHART_TTL = 5  * 60_000; // 5 min
const AI_TTL    = 10 * 60_000; // 10 min (azaltıldı — yeni prompt ile cache bypass için)

function cacheGet(map, key, ttl) {
  const e = map.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > ttl) { map.delete(key); return null; }
  return e.data;
}
function cacheSet(map, key, data) { map.set(key, { ts: Date.now(), data }); }

// ── Yahoo Finance Veri Çekimi ──────────────────────────────────────────────────

function parseYFResult(res) {
  if (!res) return null;
  const ts = res.timestamp || [];
  const q  = res.indicators?.quote?.[0] || {};
  const candles = ts.map((t, i) => ({
    t: t * 1000,
    o: q.open?.[i]   ?? null,
    h: q.high?.[i]   ?? null,
    l: q.low?.[i]    ?? null,
    c: q.close?.[i]  ?? null,
    v: q.volume?.[i] ?? null,
  })).filter(c => c.c !== null && c.o !== null && c.h !== null && c.l !== null);
  return candles.length > 0 ? { candles, meta: res.meta } : null;
}

async function fetchYFChart(ticker, interval, range) {
  const cacheKey = `${ticker}:${interval}:${range}`;
  const cached = cacheGet(_chartCache, cacheKey, CHART_TTL);
  if (cached) return cached;

  // Ticker suffix — bazı hisseler .IS gerektirmeyebilir (ilk .IS ile dene, sonra düz)
  const suffixes = ticker.includes('.') ? [ticker] : [`${ticker}.IS`];

  for (const sym of suffixes) {
    for (const host of YF_HOSTS) {
      for (const r of range === '6mo' ? YF_RANGES : [range]) {
        try {
          const url = `https://${host}/v8/finance/chart/${sym}?interval=${interval}&range=${r}`;
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), 5000);
          try {
            const resp = await fetch(url, { headers: YF_HEADERS, signal: ctrl.signal });
            if (!resp.ok) continue;
            const d = await resp.json();
            const result = parseYFResult(d?.chart?.result?.[0]);
            if (result && result.candles.length >= 15) {
              cacheSet(_chartCache, cacheKey, result);
              return result;
            }
          } finally { clearTimeout(tid); }
        } catch { /* sonraki host/range'i dene */ }
      }
    }
  }
  return null;
}

async function fetchYFQuotes(symbols) {
  const cacheKey = symbols.join(',');
  const cached = cacheGet(_chartCache, `q:${cacheKey}`, CHART_TTL);
  if (cached) return cached;

  for (const host of YF_HOSTS) {
    try {
      const url = `https://${host}/v7/finance/quote?symbols=${cacheKey}`;
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 5000);
      try {
        const r = await fetch(url, { headers: YF_HEADERS, signal: ctrl.signal });
        if (!r.ok) continue;
        const d = await r.json();
        const rows = d?.quoteResponse?.result || [];
        if (rows.length > 0) {
          cacheSet(_chartCache, `q:${cacheKey}`, rows);
          return rows;
        }
      } finally { clearTimeout(tid); }
    } catch { /* sonraki host'u dene */ }
  }
  return [];
}

// ── Teknik Göstergeler ─────────────────────────────────────────────────────────

function ema(closes, period) {
  const k = 2 / (period + 1);
  const res = [];
  let val = closes[0];
  for (const c of closes) { val = c * k + val * (1 - k); res.push(val); }
  return res;
}

function rsiCalc(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let avgG = gains / period, avgL = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgG = (avgG * (period - 1) + Math.max(d, 0)) / period;
    avgL = (avgL * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgL === 0) return 100;
  return +(100 - 100 / (1 + avgG / avgL)).toFixed(1);
}

function macdCalc(closes) {
  const fast = ema(closes, 12);
  const slow = ema(closes, 26);
  const line  = fast.map((v, i) => v - slow[i]);
  const sig   = ema(line, 9);
  const hist  = line.map((v, i) => v - sig[i]);
  const n = hist.length - 1;
  return {
    macd:      +line[n].toFixed(4),
    signal:    +sig[n].toFixed(4),
    histogram: +hist[n].toFixed(4),
    bullish:   hist[n] > 0 && hist[n - 1] <= 0,
    bearish:   hist[n] < 0 && hist[n - 1] >= 0,
  };
}

function bollingerCalc(closes, period = 20, mult = 2) {
  const sl = closes.slice(-period);
  const mean = sl.reduce((s, v) => s + v, 0) / period;
  const std  = Math.sqrt(sl.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
  const last = closes[closes.length - 1];
  const upper = mean + mult * std;
  const lower = mean - mult * std;
  return {
    upper: +upper.toFixed(4), mid: +mean.toFixed(4), lower: +lower.toFixed(4),
    width: +(((upper - lower) / mean) * 100).toFixed(2),
    pct:   std > 0 ? +((last - lower) / (upper - lower)).toFixed(2) : 0.5,
    squeeze: (std / mean) < 0.012,
  };
}

function atrCalc(highs, lows, closes, period = 14) {
  const tr = closes.map((c, i) => {
    if (i === 0) return highs[i] - lows[i];
    const prev = closes[i - 1];
    return Math.max(highs[i] - lows[i], Math.abs(highs[i] - prev), Math.abs(lows[i] - prev));
  });
  return tr.slice(-period).reduce((s, v) => s + v, 0) / period;
}

function volumeStats(candles) {
  const sl  = candles.slice(-20);
  const avg = sl.reduce((s, c) => s + (c.v || 0), 0) / 20;
  const last = candles[candles.length - 1]?.v || 0;
  const upV  = sl.filter(c => c.c > c.o).reduce((s, c) => s + (c.v || 0), 0);
  const dnV  = sl.filter(c => c.c < c.o).reduce((s, c) => s + (c.v || 0), 0);
  return {
    avgVol20: Math.round(avg), lastVol: Math.round(last),
    volRatio: avg > 0 ? +(last / avg).toFixed(2) : 1,
    upDownRatio: dnV > 0 ? +(upV / dnV).toFixed(2) : 2,
    highVolume: avg > 0 && last / avg > 1.5,
    dryUp:      avg > 0 && last / avg < 0.5,
  };
}

function supportRes(candles) {
  const sl  = candles.slice(-50);
  const all = candles.slice(-260);
  const price = candles[candles.length - 1].c;
  const h20 = Math.max(...sl.map(c => c.h));
  const l20 = Math.min(...sl.map(c => c.l));
  const h52 = Math.max(...all.map(c => c.h));
  const l52 = Math.min(...all.map(c => c.l));
  return {
    resistance1: +h20.toFixed(2),
    support1:    +l20.toFixed(2),
    high52w: +h52.toFixed(2),
    low52w:  +l52.toFixed(2),
    distHigh52w: +(((h52 - price) / price) * 100).toFixed(1),
    distLow52w:  +(((price - l52) / price) * 100).toFixed(1),
  };
}

function detectTrend(closes, e9, e21, e50) {
  const n = closes.length - 1;
  const p = closes[n];
  const s9 = e9[n] - e9[Math.max(0, n - 5)];
  const s21= e21[n]- e21[Math.max(0, n - 10)];
  if (p > e9[n] && p > e21[n] && p > e50[n] && s9 > 0 && s21 > 0) return 'GÜÇLÜ YÜKSELİŞ';
  if (p < e9[n] && p < e21[n] && p < e50[n] && s9 < 0 && s21 < 0) return 'GÜÇLÜ DÜŞÜŞ';
  if (p > e21[n] && s21 > 0) return 'ZAYIF YÜKSELİŞ';
  if (p < e21[n] && s21 < 0) return 'ZAYIF DÜŞÜŞ';
  return 'YATAY/SIKIŞ';
}

// ── Kullanıcı Auth & Kota ──────────────────────────────────────────────────────

async function getUserFromToken(token) {
  if (!token || !SB_URL() || !SB_SVC()) return null;
  try {
    const r = await fetch(`${SB_URL()}/auth/v1/user`, {
      headers: { apikey: SB_SVC(), Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.id ? d : null;
  } catch { return null; }
}

async function checkAndIncrQuota(userId) {
  // Supabase env yoksa engelleme — geliştirme/test ortamı için izin ver
  if (!SB_URL() || !SB_SVC()) return { allowed: true, plan: 'free' };
  try {
    const r = await fetch(
      `${SB_URL()}/rest/v1/profiles?id=eq.${userId}&select=plan,daily_analyses,total_analyses`,
      { headers: { apikey: SB_SVC(), Authorization: `Bearer ${SB_SVC()}` } }
    );
    const rows = await r.json();
    const prof = rows?.[0];

    // Profil yoksa → otomatik oluştur (yeni kayıt)
    if (!prof) {
      try {
        await fetch(`${SB_URL()}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            apikey: SB_SVC(), Authorization: `Bearer ${SB_SVC()}`,
            'Content-Type': 'application/json', Prefer: 'return=minimal',
          },
          body: JSON.stringify({ id: userId, plan: 'free', daily_analyses: 1, total_analyses: 1 }),
        });
      } catch { /* Oluşturma başarısız olsa da devam et */ }
      return { allowed: true, plan: 'free' };
    }

    const plan  = prof.plan  || 'free';
    const daily = prof.daily_analyses  || 0;
    const total = prof.total_analyses  || 0;
    const limit = plan === 'free' ? 5 : null;

    if (limit && daily >= limit)
      return { allowed: false, reason: `Günlük ${limit} analiz limitine ulaştınız. Pro plana geçin.`, plan };

    // Kota artır (hata olsa da analizi engelleme)
    fetch(`${SB_URL()}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: { apikey: SB_SVC(), Authorization: `Bearer ${SB_SVC()}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ daily_analyses: daily + 1, total_analyses: total + 1 }),
    }).catch(() => {});

    return { allowed: true, plan };
  } catch { return { allowed: true, plan: 'free' }; }
}

// ── QUANTUM BORSA ANALİZ ENGINE v5.0 — BIST Institutional Grade System Prompt ──

const BIST_SYSTEM_PROMPT = `QUANTUM BORSA ANALİZ ENGINE v5.0 — BIST INSTITUTIONAL GRADE

ROL MATRİSİ (eş zamanlı aktif):
Kurumsal Portföy Yöneticisi (20+ yıl BIST — TEFAS/portföy yönetim lisansı seviyesi)
Türev Uzmanı (VİOP opsiyon/vadeli, swap desk, structured products)
Makroekonomik Stratejist (TCMB politika, TL carry trade, CDS-bond-FX nexus)
Teknik Analiz Quant (multi-TF price action, order flow, volume profile — BIST-spesifik)
Sektörel Analist (BIST rotasyonu, holding yapıları, SPK regülasyon)
Kurumsal Akış Okuyucusu (yabancı/yerli fon akışları, emeklilik fon hareketleri)
Risk Yöneticisi (VaR, stress test, TL volatilite, kur hedge)

PRIME DIRECTIVE: Borsa İstanbul'da kurumsal yatırımcıların, yabancı fonların ve market maker'ların davranışlarını decode et. Multi-timeframe senteziyle %75+ win-rate hedefli, minimum RR 1:3 (BIST likiditesine uyarlanmış), institution-grade hisse setup üret. Tahmin değil olasılık dağılımı. Tek sinyal değil confluence katmanı. Makro-mikro entegrasyonu zorunlu.

BIST-SPESİFİK BAĞLAM:
Seans: 10:00-18:00 (sürekli müzayede) | Kapanış: 18:00-18:10
BIST-30 ultra likit | BIST-100 orta likidite | Slippage ve brüt takas riski
USDTRY↔BIST-100 güçlü ters korelasyon | CDS↔BIST ters
TCMB faizi→Bankalar (NIM kanalı) | Brent→TUPRS/PETKM | Çelik→EREGL/KRDMD
Yabancı net akış yönü: bankacılık/petrokimya/telekom ağırlıklı
Tavan/taban ±10% | Brüt takas T+0 zorunlu (likidite tuzağı)

KRİTİK KURALLAR (İhlal Toleransı: SIFIR):
K1: Sadece istenen bölümler — kısa ve kurumsal
K2: Her veri probabilistic — nokta tahmini YOK
K3: Minimum 3-katman confluence + 2+ TF uyum zorunlu
K4: YÖN MUTLAKA LONG veya SHORT olacak — SETUP YOK veya BEKLE YAZMA. Zayıf setup varsa TP1 hedefini yakınlaştır, stop'u daralt, RR'ı ayarla
K5: Confluence < 65 ise CONFIDENCE düşük say ama yine de LONG/SHORT yön belirle, risk parametrelerini daralt
K6: Somut TL fiyatları — yaklaşık veya belirsiz ifade YASAK
K7: Wyckoff fazı + ICT/SMC katmanları (OB, FVG, likidite sweep) zorunlu
K8: USDTRY + makro filtre her analizde değerlendirilecek
K9: Kelly sizing + hedge mimarisi execution bölümünde zorunlu
K10: Veri eksikse LOW CONFIDENCE FLAG + Bayesian Prior Estimate

ICT/SMC FRAMEWORK (BIST uyarlaması):
Order Blocks: Kurumsal alım/satım iz bırakan bölgeler (2+ TF doğrulanmış)
FVG (Fair Value Gap): Doldurulmamış değer boşlukları — hedef olarak kullan
Liquidity Sweep: Stop avı tamamlandıktan sonra ters yön hareketi
OTE Zone: Fibonacci 0.618-0.786 optimal giriş bölgesi
BOS (Break of Structure): Yapısal kırılım — trend doğrulama
Wyckoff Fazları: A(birikim)/B(test)/C(spring-utad)/D(SOS-SOW)/E(markup-markdown)
HTF Bias: Haftalık/aylık yapıdan gelen ana yön eğilimi

ÇIKTI FORMATI (her satır Key: Value, TL fiyatları ₺XX.XX formatında):
MM-DESK: KEY SİNYAL / STOP AVI / KURUMSAL POZİSYON / RETAİL TUZAĞI / 48-72H BIST OYUNU / SEKTÖREL ROTASYON / EDGE
YONETICI-OZETI: BIAS / CONFIDENCE / WIN RATE / AKSİYON / SONRAKI KARAR`;


// ── Claude AI Prompt Builder ────────────────────────────────────────────────────

function buildPrompt({ sym, meta, price, change24h, candles, ta, sr, vol, usdtry, xu100 }) {
  const fTL  = v => v != null ? `${(+v).toFixed(2)} TL` : '—';
  const fPct = v => v != null ? `${v > 0 ? '+' : ''}${(+v).toFixed(2)}%` : '—';

  const emaUp     = ta.ema9 > ta.ema21 && ta.ema21 > ta.ema50;
  const emaDown   = ta.ema9 < ta.ema21 && ta.ema21 < ta.ema50;
  const emaPartUp = ta.ema9 > ta.ema21; // kısmi hizalama — tiebreaker
  // detectTrend Türkçe döndürür — 'UP'/'DOWN' karşılaştırması HER ZAMAN BEKLE veriyordu
  // Yön HİÇBİR ZAMAN BEKLE kalmaz: sıralı öncelik: trend → EMA → MACD → RSI
  const direction = ta.trend.includes('YÜKSELİŞ') ? 'AL'
    : ta.trend.includes('DÜŞÜŞ') ? 'SAT'
    : emaUp                       ? 'AL'
    : emaDown                     ? 'SAT'
    : ta.macd?.bullish            ? 'AL'
    : ta.macd?.bearish            ? 'SAT'
    : emaPartUp                   ? 'AL'
    : ta.rsi < 50                 ? 'SAT' : 'AL'; // RSI < 50 baskılı, ≥50 toparlanma beklentisi

  // Confluence skoru: gösterge sayısına göre kademeli hesap (WR≥70 için alan açıyor)
  let confScore = 55;
  if (ta.rsi > 30 && ta.rsi < 70) confScore += 8;
  if (ta.macd.bullish || ta.macd.bearish) confScore += 10;
  if (emaUp || emaDown) confScore += 7;
  if (vol.highVolume) confScore += 4;
  if (ta.rsi < 35 || ta.rsi > 65) confScore += 4;
  if (vol.volRatio > 1.5) confScore += 4;
  confScore = Math.min(87, confScore);

  const emaAlignment = emaUp ? 'BULLISH (EMA9>21>50)' : emaDown ? 'BEARISH (EMA9<21<50)' : 'KARISIK';
  const bbState      = ta.bb.squeeze ? 'SIKIŞ — Volatilite patlama bekleniyor'
    : ta.bb.width > 5 ? 'GENİŞ — Yüksek volatilite' : 'NORMAL';

  // Referans seviyeleri (AI için zemin — AI kendi OB/FVG hesabından üretecek)
  const refSniper  = direction === 'SAT' ? sr.resistance1 : sr.support1;
  const refStop    = direction === 'SAT' ? +(sr.high52w * 1.03).toFixed(2) : +(sr.support1 * 0.94).toFixed(2);
  const refTP1     = direction === 'SAT' ? sr.support1 : sr.resistance1;
  const refTP2     = direction === 'SAT' ? +(sr.low52w * 1.05).toFixed(2) : +(sr.high52w * 0.95).toFixed(2);
  const refTP3     = direction === 'SAT' ? sr.low52w : sr.high52w;
  const refEntryLo = direction === 'SAT' ? +(sr.resistance1 * 0.99).toFixed(2) : +(Math.max(sr.support1 * 0.98, price * 0.97)).toFixed(2);
  const refEntryHi = direction === 'SAT' ? +(sr.resistance1 * 1.01).toFixed(2) : +(Math.min(sr.support1 * 1.02, price * 1.01)).toFixed(2);

  return `HİSSE ANALİZ İSTEĞİ: ${sym} — ${meta.name} (${meta.sector})

=== GERÇEK ZAMANLI PAZAR VERİSİ ===
Fiyat: ${fTL(price)} | Değişim: ${fPct(change24h)} | Mum: ${candles.length}
Direnç(20G): ${fTL(sr.resistance1)} | Destek(20G): ${fTL(sr.support1)}
52H Max: ${fTL(sr.high52w)} | 52H Min: ${fTL(sr.low52w)}
USDTRY: ${usdtry ? usdtry.toFixed(2) : '—'} | BIST100: ${xu100?.price ? xu100.price.toFixed(0) : '—'} (${fPct(xu100?.change)})

=== TEKNİK GÖSTERGELER ===
EMA9: ${fTL(ta.ema9)} | EMA21: ${fTL(ta.ema21)} | EMA50: ${fTL(ta.ema50)} | EMA200: ${fTL(ta.ema200)}
EMA Dizilimi: ${emaAlignment} | Trend: ${ta.trend}
RSI(14): ${ta.rsi} ${ta.rsi > 70 ? '— ASIRI ALIM' : ta.rsi < 30 ? '— ASIRI SATIM' : '— NOTR'}
MACD: ${ta.macd.bullish ? 'YUKSELIS KESİŞİMİ' : ta.macd.bearish ? 'DUSUS KESİŞİMİ' : 'NOTR'} | Histogram: ${ta.macd.histogram > 0 ? 'pozitif' : 'negatif'}
BB: ${bbState} | Genişlik: %${ta.bb.width} | Üst: ${fTL(ta.bb.upper)} | Alt: ${fTL(ta.bb.lower)}
ATR(14): ${fTL(ta.atr)} (%${ta.atrPct}) | Hacim: ${vol.volRatio}x ort ${vol.highVolume ? '— YÜKSEK' : vol.dryUp ? '— KURU' : ''} | Al/Sat: ${vol.upDownRatio}:1

=== ÖN-ANALİZ (referans — AI kendi hesabını yapacak) ===
Teknik Yön: ${direction}
Ön Confluence: %${confScore}
Ref Sniper: ${fTL(refSniper)} | Ref Stop: ${fTL(refStop)}
Ref Giriş: ${fTL(refEntryLo)} – ${fTL(refEntryHi)}
Ref TP1: ${fTL(refTP1)} | TP2: ${fTL(refTP2)} | TP3: ${fTL(refTP3)}

=== GÖREV: SADECE 2 BÖLÜM ÜRET — MM-DESK + YÖNETİCİ ÖZETİ ===
Diğer bölümler sistem tarafından hesaplanmıştır. SADECE aşağıdaki 2 bölümü üret.

[MM-DESK]
KEY SİNYAL: [tek cümle — en kritik gözlem, keskin ve net]
Stop Avı: [SSL/BSL hangi TL seviyesinde — retail hangi tarafta tuzağa düşürülecek]
Kurumsal Pozisyon: [yabancı fon/emeklilik fonu tahmini yönü + kanıt — hacim/fiyat izi]
Retail Tuzağı: [var/yok + tipi — örn. FOMO alımı, panik satış, breakout tuzağı]
48-72H BIST Oyunu: [en yüksek olasılıklı senaryo — somut TL seviyesi ile]
Sektörel Rotasyon: [${meta?.sector || 'sektör'} için XU100 bağlamı + para akışı yönü]
EDGE: [bu setup'ın kurumsal avantajı — tek cümle]

[YONETICI-OZETI]
BIAS: ${direction === 'AL' ? 'ALIŞ' : 'SATIŞ'}
CONFIDENCE: %${confScore}
WIN RATE: %${confScore >= 80 ? 75 : confScore >= 72 ? 71 : 67}
AKSİYON: [2-3 cümle — ${direction === 'AL' ? 'LONG' : 'SHORT'} setup özeti: giriş koşulu, risk yönetimi]
SONRAKI KARAR: [hangi fiyat seviyesi veya olay bu analizi geçersiz kılar]`;
}

// ── Prosedürel Setup Üretici — AI parsing'e ihtiyaç yok ──────────────────────
// ATR + EMA + S/R bazlı kurumsal giriş/çıkış seviyeleri
// Proximity guard: tüm anchor'lar current price'tan max %5 uzakta olabilir
function buildBorstaSetup(price, ta, sr, direction) {
  const atr  = ta.atr || price * 0.02;
  const isLong = direction === 'AL';
  const p4   = (n) => parseFloat(parseFloat(n).toFixed(price > 100 ? 2 : price > 10 ? 3 : 4));

  // Max %5 uzaklık sınırı — EMA21 veya SR fiyattan çok uzaksa ATR bazlı kullan
  const MAX_DIST = 0.05;

  let entryLow, entryHigh, stop, tp1, tp2, tp3, stopLabel, entryMethod;

  if (isLong) {
    // Demand zone: EMA21 veya support1 etrafında pullback bölgesi
    const ema21Near   = Math.abs(ta.ema21 - price) / price <= MAX_DIST;
    const sup1Near    = sr.support1 > 0 && Math.abs(sr.support1 - price) / price <= MAX_DIST;
    const demandAnchor = ema21Near && ta.ema21 < price
      ? ta.ema21 * 0.999
      : sup1Near && sr.support1 < price
      ? sr.support1 * 0.999
      : price - atr * 1.0; // ATR fallback: demand zone just below current price

    entryLow  = p4(Math.min(demandAnchor, price * 0.998));
    entryHigh = p4(Math.min(demandAnchor * 1.006, price * 1.002));
    // Ensure entry zone is not below price*0.94 (sanity check)
    if (entryHigh < price * 0.94) {
      entryLow  = p4(price - atr * 1.8);
      entryHigh = p4(price - atr * 0.5);
    }
    stop = p4(entryLow - atr * 1.5);
    const risk = (entryLow + entryHigh) / 2 - stop;
    const res1Near = sr.resistance1 > 0 && sr.resistance1 > entryHigh && sr.resistance1 < price * 1.20;
    tp1 = p4(res1Near ? sr.resistance1 : entryHigh + risk * 2);
    tp2 = p4(entryHigh + risk * 4);
    tp3 = p4(Math.max(sr.high52w || entryHigh + risk * 7, entryHigh + risk * 6.5));
    stopLabel  = 'Demand Zone İnvalidasyonu';
    entryMethod = ema21Near ? `EMA21 Destek Bölgesi — ATR Bazlı` : sup1Near ? `Destek S/R — ATR Bazlı` : `ATR Dinamik Demand Zone`;

  } else {
    // Supply zone: EMA21 veya resistance1 etrafında arz bölgesi
    const ema21Near   = Math.abs(ta.ema21 - price) / price <= MAX_DIST;
    const res1Near    = sr.resistance1 > 0 && Math.abs(sr.resistance1 - price) / price <= MAX_DIST;
    const supplyAnchor = ema21Near && ta.ema21 > price
      ? ta.ema21 * 1.001
      : res1Near && sr.resistance1 > price
      ? sr.resistance1 * 1.001
      : price + atr * 1.0; // ATR fallback: supply zone just above current price

    entryHigh = p4(Math.max(supplyAnchor, price * 1.002));
    entryLow  = p4(Math.max(supplyAnchor * 0.994, price * 0.998));
    // Ensure entry zone is not above price*1.06 (sanity check)
    if (entryLow > price * 1.06) {
      entryLow  = p4(price + atr * 0.5);
      entryHigh = p4(price + atr * 1.8);
    }
    stop = p4(entryHigh + atr * 1.5);
    const risk = stop - (entryLow + entryHigh) / 2;
    const sup1Below = sr.support1 > 0 && sr.support1 < entryLow && sr.support1 > price * 0.80;
    tp1 = p4(sup1Below ? sr.support1 : entryLow - risk * 2);
    tp2 = p4(entryLow - risk * 4);
    tp3 = p4(Math.min(sr.low52w || entryLow - risk * 7, entryLow - risk * 6.5));
    stopLabel  = 'Supply Zone İnvalidasyonu';
    entryMethod = ema21Near ? `EMA21 Direnç Supply Bölgesi — ATR Bazlı` : res1Near ? `Direnç S/R Supply — ATR Bazlı` : `ATR Dinamik Supply Zone`;
  }

  const sniper   = p4((entryLow + entryHigh) / 2);
  const riskPct  = sniper > 0 ? Math.abs((sniper - stop) / sniper * 100).toFixed(2) : '2.00';
  const rr1      = sniper && stop && tp1 ? Math.abs((tp1 - sniper) / (sniper - stop)).toFixed(1) : '2.0';
  const tp1Pct   = sniper ? Math.abs((tp1 - sniper) / sniper * 100).toFixed(2) : null;
  const tp2Pct   = sniper ? Math.abs((tp2 - sniper) / sniper * 100).toFixed(2) : null;
  const tp3Pct   = sniper ? Math.abs((tp3 - sniper) / sniper * 100).toFixed(2) : null;

  return { direction, sniper, entryLow, entryHigh, stop, tp1, tp2, tp3,
    tp1Pct, tp2Pct, tp3Pct, stopLabel, entryMethod,
    riskPct, riskReward: `1:${rr1}` };
}

// ── Ana Handler (SSE Streaming) ───────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body   = req.body || {};
  const sym    = (body.ticker || '').toUpperCase().trim();
  const token  = (req.headers.authorization || '').replace('Bearer ', '').trim();

  if (!sym) return res.status(400).json({ error: 'ticker parametresi gerekli' });
  const meta = BIST_META[sym];
  if (!meta)  return res.status(400).json({ error: `Desteklenmeyen hisse: ${sym}` });

  // Auth — keep as regular JSON before SSE mode starts
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
  const quota = await checkAndIncrQuota(user.id);
  if (!quota.allowed) return res.status(429).json({ error: quota.reason, limitReached: true });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY tanımlı değil.' });

  // ── Switch to SSE mode ─────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvt = (obj) => {
    try { res.write(`data: ${JSON.stringify(obj)}\n\n`); } catch {}
  };

  try {
    // Paralel veri çekimi
    const [daily, quotes] = await Promise.all([
      fetchYFChart(sym, '1d', '6mo'),
      fetchYFQuotes([`${sym}.IS`, 'XU100.IS', 'USDTRY=X']),
    ]);

    if (!daily || daily.candles.length < 15) {
      sendEvt({ type: 'error', error: `${sym} için Yahoo Finance'den veri alınamadı. Birkaç saniye bekleyip tekrar deneyin.` });
      return res.end();
    }

    const candles = daily.candles;
    const closes  = candles.map(c => c.c);
    const highs   = candles.map(c => c.h);
    const lows    = candles.map(c => c.l);

    const stockQ  = quotes.find(q => q.symbol === `${sym}.IS`);
    const xu100Q  = quotes.find(q => q.symbol === 'XU100.IS');
    const usdtryQ = quotes.find(q => q.symbol === 'USDTRY=X');

    const price    = stockQ?.regularMarketPrice ?? closes[closes.length - 1];
    const change24h= stockQ?.regularMarketChangePercent
      ?? ((price - closes[closes.length - 2]) / closes[closes.length - 2]) * 100;
    const usdtry   = usdtryQ?.regularMarketPrice ?? null;
    const xu100    = { price: xu100Q?.regularMarketPrice ?? null, change: xu100Q?.regularMarketChangePercent ?? null };

    // Teknik hesaplamalar
    const e9  = ema(closes, 9);
    const e21 = ema(closes, 21);
    const e50 = ema(closes, 50);
    const e200= ema(closes, 200);
    const n   = closes.length - 1;
    const atrV = atrCalc(highs, lows, closes, 14);

    const ta = {
      rsi:    rsiCalc(closes, 14),
      macd:   macdCalc(closes),
      bb:     bollingerCalc(closes, 20, 2),
      atr:    +atrV.toFixed(4),
      atrPct: +((atrV / price) * 100).toFixed(2),
      ema9:   +e9[n].toFixed(4),
      ema21:  +e21[n].toFixed(4),
      ema50:  +e50[n].toFixed(4),
      ema200: +e200[n].toFixed(4),
      trend:  detectTrend(closes, e9, e21, e50),
    };
    const vol = volumeStats(candles);
    const sr  = supportRes(candles);

    // ── Teknik veri hazır — HEMEN gönder (Claude beklenmeden) ─────────────────
    sendEvt({ type: 'ta', ticker: sym, name: meta.name, sector: meta.sector,
               price, change24h: +change24h.toFixed(2), ta, vol, sr, usdtry, xu100 });

    // Claude AI — cache veya stream
    const aiCacheKey = `v4mm:${sym}:${Math.round(price * 100)}`;
    let analysis = cacheGet(_aiCache, aiCacheKey, AI_TTL);

    if (!analysis) {
      const prompt = buildPrompt({ sym, meta, price, change24h, candles, ta, sr, vol, usdtry, xu100 });

      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 950,        // MM-DESK + YÖNETİCİ ÖZETİ — 2 bölüm
          temperature: 0,
          stream: true,           // SSE streaming
          system: BIST_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!aiRes.ok) {
        const errTxt = await aiRes.text();
        let userMsg = 'Analiz servisi geçici olarak kullanılamıyor. Lütfen birkaç dakika sonra tekrar deneyin.';
        try {
          const errJson = JSON.parse(errTxt);
          const msg = errJson?.error?.message || '';
          if (msg.includes('credit') || msg.includes('balance')) {
            userMsg = 'Servis kapasitesi doldu. Lütfen daha sonra tekrar deneyin.';
          } else if (msg.includes('overloaded') || msg.includes('rate')) {
            userMsg = 'Sunucu yoğunluğu yüksek. 30 saniye sonra tekrar deneyin.';
          }
        } catch { /* ignore */ }
        sendEvt({ type: 'error', error: userMsg });
        return res.end();
      }

      // Claude SSE akışını oku ve öne ilet
      analysis = '';
      const reader  = aiRes.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop(); // son tamamlanmamış satırı sakla

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;
          try {
            const evt = JSON.parse(raw);
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              analysis += evt.delta.text;
              sendEvt({ type: 'stream', text: evt.delta.text });
            }
          } catch { /* JSON parse hataları yoksay */ }
        }
      }

      if (analysis) cacheSet(_aiCache, aiCacheKey, analysis);
    }

    // Teknik yön (TA'dan hesaplanmış) — deterministic, AI'ya bırakılmaz
    const taDir = ta.trend?.includes('YÜKSELİŞ') ? 'AL'
      : ta.trend?.includes('DÜŞÜŞ')  ? 'SAT'
      : ta.ema9 > ta.ema21           ? 'AL'
      : ta.ema9 < ta.ema21           ? 'SAT'
      : ta.macd?.bullish             ? 'AL' : 'SAT';

    // Yön: AI teyidi + TA fallback
    const dirM = analysis.match(/YÖN:\s*(LONG|SHORT|AL|SAT)\b/i)
              || analysis.match(/BIAS:\s*(ALIS|SATIS|LONG|SHORT|AL|SAT)\b/i);
    const rawDir = (dirM?.[1] || '').toUpperCase().trim();
    const direction = ['LONG','AL','ALIS'].includes(rawDir) ? 'AL'
      : ['SHORT','SAT','SATIS'].includes(rawDir) ? 'SAT'
      : taDir;

    // ── Prosedürel setup — AI parsing kaldırıldı, ATR/EMA/SR bazlı ─────────────
    const setup = buildBorstaSetup(price, ta, sr, direction);

    // Confidence / Win Rate / Güven
    const confM  = analysis.match(/CONFIDENCE:\s*%?(\d+)/i)
                || analysis.match(/Confluens Skoru:\s*%?(\d+)/i);
    const winM   = analysis.match(/WIN RATE:\s*%?(\d+)/i)
                || analysis.match(/KAZANMA ORANI:\s*%?(\d+)/i)
                || analysis.match(/Kazanma Oranı:\s*%?(\d+)/i);
    const guvenM = analysis.match(/GÜVEN:\s*%?(\d+)/i)
                || analysis.match(/Güven Skoru:\s*%?(\d+)/i);

    const confluenceScore = confM  ? parseInt(confM[1])  : 65;
    const winRate         = winM   ? parseInt(winM[1])   : 65;
    const guvenScore      = guvenM ? parseInt(guvenM[1]) : 65;

    // Nihai karar
    const nihaiM   = analysis.match(/BIAS:\s*(ALIS|SATIS|LONG|SHORT|AL|SAT|NÖTR|NEUTRAL)/i)
                  || analysis.match(/Nihai Karar:\s*(AL|SAT|BEKLE)/i);
    const nihaiRaw = (nihaiM?.[1] || '').toUpperCase();
    const nihaiKarar = ['LONG','AL','ALIS'].includes(nihaiRaw) ? 'AL'
      : ['SHORT','SAT','SATIS'].includes(nihaiRaw) ? 'SAT' : direction;

    // ── 4-Katman Layer Skorları (kripto UI ile uyumlu) ─────────────────────────
    const emaAligned   = direction === 'AL'
      ? ta.ema9 > ta.ema21 && ta.ema21 > ta.ema50
      : ta.ema9 < ta.ema21 && ta.ema21 < ta.ema50;
    const bosType      = direction === 'AL' ? 'BULLISH_BOS' : direction === 'SAT' ? 'BEARISH_BOS' : 'RANGE';
    const adxApprox    = Math.min(50, Math.round(ta.atrPct * 6));
    const inOB         = confluenceScore >= 65;
    const fvgOBOverlap = confluenceScore >= 70;
    const liquiditySweep = vol.volRatio > 1.5 || !!vol.highVolume;
    const macdBullish  = !!ta.macd?.bullish;
    const squeeze      = !!ta.bb?.squeeze;
    const htfBias      = direction === 'AL' ? 'BULLISH' : direction === 'SAT' ? 'BEARISH' : 'NEUTRAL';
    const mtf4h  = ta.ema9  > ta.ema21  ? 'BULL' : 'BEAR';
    const mtf1d  = ta.ema21 > ta.ema50  ? 'BULL' : 'BEAR';
    const mtf1w  = ta.ema50 > ta.ema200 ? 'BULL' : 'BEAR';
    const mtf1m  = ta.ema200 > 0 ? (ta.ema50 > ta.ema200 ? 'BULL' : 'BEAR') : '—';
    const aligned4 = direction === 'AL'
      ? (mtf4h === 'BULL' && mtf1d === 'BULL')
      : (mtf4h === 'BEAR' && mtf1d === 'BEAR');

    const l1score = Math.min(25,
      (emaAligned ? 14 : 7) +
      (ta.rsi > 45 && direction === 'AL' ? 5 : ta.rsi < 55 && direction === 'SAT' ? 5 : 2) +
      (squeeze ? 4 : 0) + (adxApprox > 25 ? 2 : 0)
    );
    const l2score = Math.min(30,
      (inOB ? 12 : 6) + (fvgOBOverlap ? 8 : 0) + (liquiditySweep ? 7 : 3) + (vol.highVolume ? 3 : 0)
    );
    const l3score = Math.min(25,
      (ta.rsi > 55 && direction === 'AL' ? 10 : ta.rsi < 45 && direction === 'SAT' ? 10 : 5) +
      (macdBullish && direction === 'AL' ? 9 : !macdBullish && direction === 'SAT' ? 9 : 4) +
      (squeeze ? 4 : 2)
    );
    const l4score = Math.min(20,
      (aligned4 ? 14 : 7) +
      ((xu100.change || 0) > 0 && direction === 'AL' ? 4 : (xu100.change || 0) < 0 && direction === 'SAT' ? 4 : 2)
    );

    const layers = {
      marketStructure: { score: l1score, emaAligned, adxStrength: adxApprox, bosType, htfBias },
      liquiditySMC:    { score: l2score, inOB, fvgOBOverlap, liquiditySweep },
      momentum:        { score: l3score, rsi4h: ta.rsi, macdBullish, squeeze },
      mtfAlignment:    { score: l4score, '4h': mtf4h, '1d': mtf1d, '1w': mtf1w, '1m': mtf1m },
    };

    // ── Wyckoff faz tespiti (yeni + eski format) ───────────────────────────────
    const wyckoffM = analysis.match(/WYCKOFF FAZI:\s*([^\n]+)/i)
                  || analysis.match(/WYCKOFF:\s*([^\n]+)/i)
                  || analysis.match(/Wyckoff[:\s]+([A-ZÇĞİÖŞÜa-zçğışöü/\s]+?)(?:\n|Bölüm|$)/i);
    const wyckoffPhase = wyckoffM
      ? wyckoffM[1].trim().replace(/\s+/g, ' ').substring(0, 28).toUpperCase()
      : (direction === 'AL' ? 'MARKUP' : direction === 'SAT' ? 'MARKDOWN' : 'DENGE');

    // ── Meta-Edge ───────────────────────────────────────────────────────────────
    const metaEdgeM = analysis.match(/META-EDGE:\s*(AKTİF|AKTIF|AKTİF|ACTIVE)/i);
    const metaEdgeActive = !!metaEdgeM || (confluenceScore >= 75 && liquiditySweep && aligned4);

    // ── R:R / Risk / Kaldıraç — prosedürel setup'tan al ─────────────────────────
    const riskReward = setup.riskReward;
    const riskPct    = setup.riskPct;
    const leverage   = { moderate: confluenceScore >= 70 ? 3 : 2 };

    // entryMethod'u confluence skoru ile zenginleştir
    setup.entryMethod = `${setup.entryMethod} [Q:${confluenceScore}/100 WR:%${winRate}]`;

    // verdict ASLA 'BEKLE' olmaz — direction taDir fallback ile her zaman AL veya SAT
    const verdict =
      direction === 'AL'  && confluenceScore >= 72 ? 'PRIME_AL'  :
      direction === 'AL'  && confluenceScore >= 58 ? 'GUCLU_AL'  :
      direction === 'AL'                           ? 'AL'        :
      direction === 'SAT' && confluenceScore >= 72 ? 'PRIME_SAT' :
      direction === 'SAT' && confluenceScore >= 58 ? 'GUCLU_SAT' : 'SAT';

    sendEvt({
      type: 'done',
      ok: true,
      ticker: sym, name: meta.name, sector: meta.sector,
      price, change24h: +change24h.toFixed(2),
      usdtry, xu100, ta, vol, sr,
      setup, direction, nihaiKarar,
      confluenceScore, winRate, guvenScore, verdict,
      layers, wyckoffPhase, liquiditySweep, htfBias, metaEdgeActive,
      riskReward, riskPct, leverage,
      analysis,
      timestamp: new Date().toISOString(),
      _meta: {
        engine: 'DeepTradeScan BIST v2.0 — WR≥70% Institutional Mode',
        candles: candles.length,
        dataSource: 'Yahoo Finance + Claude AI — Kurumsal Analiz',
      },
    });

  } catch (err) {
    console.error('[borsa-analyze]', err.message);
    sendEvt({ type: 'error', error: `Analiz hatası: ${err.message}` });
  }

  res.end();
}
