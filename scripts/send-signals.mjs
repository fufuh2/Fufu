/**
 * DEEP TRADE SCAN — Telegram Signal Cron v10.2
 * Render/Railway Cron: her 15 dakikada 1 coin analiz eder
 *
 * Tier 1 (Prime Sinyal)   : valid + score≥65 + LONG/SHORT
 * Tier 2 (Kurumsal Setup) : score≥52 + winRate≥58 + rawDir + pillar≥2
 * Tier 3 (İzleme Listesi) : score≥40 + pillar≥1 + rawDir + !CHAOS
 */

const BASE_URL = process.env.APP_BASE_URL
  || process.env.NEXTAUTH_URL
  || 'https://deeptradescan.com';

const SECRET = process.env.CRON_SECRET || 'deeptradescan-cron-2024';

// 25-coin rotasyon listesi — her slot farklı coin
const ALL_COINS = [
  'BTC', 'ETH', 'SOL', 'XRP', 'BNB',
  'AVAX', 'DOGE', 'LINK', 'ADA', 'DOT',
  'INJ', 'NEAR', 'APT', 'SUI', 'FET',
  'RENDER', 'TAO', 'PEPE', 'WIF', 'TIA',
  'AR', 'STX', 'KAS', 'AAVE', 'RUNE',
];

// 15-dakikalık slota göre coin seç
const slot = Math.floor(Date.now() / (15 * 60 * 1000));
const coin = ALL_COINS[slot % ALL_COINS.length];
const url  = `${BASE_URL}/api/telegram-bot?key=${SECRET}&coin=${coin}`;

const ts = new Date().toISOString();
console.log(`\n[${ts}] ═══════════════════════════════════`);
console.log(`[${ts}] 🚀 DEEP TRADE SCAN — Sinyal Motoru v10.1`);
console.log(`[${ts}] Slot: ${slot} | Coin: ${coin} | ${BASE_URL}`);
console.log(`[${ts}] ═══════════════════════════════════\n`);

const controller = new AbortController();
const timeout    = setTimeout(() => controller.abort(), 75000);

try {
  const res = await fetch(url, { signal: controller.signal });
  clearTimeout(timeout);

  if (res.status === 401 || res.status === 403) {
    const txt = await res.text();
    console.error(`[HATA] ❌ Auth hatası HTTP ${res.status}: ${txt}`);
    console.error('[ÇÖZÜM] Render Dashboard → CRON_SECRET değerini kontrol et.');
    process.exit(0);
  }

  if (res.status >= 500) {
    const txt = await res.text();
    console.warn(`[UYARI] ⚠️ Sunucu hatası HTTP ${res.status}`);
    console.warn(`[DETAY] ${txt.slice(0, 300)}`);
    console.warn('[ÇÖZÜM] TELEGRAM_BOT_TOKEN Render\'da tanımlı mı?');
    process.exit(0);
  }

  const data = await res.json();

  if (data.error) {
    console.error(`[HATA] ❌ API hatası: ${data.error}`);
    process.exit(0);
  }

  const sent       = data.sent;
  const tier       = data.tier || 0;
  const direction  = data.direction || '—';
  const rawDir     = data.rawDirection || '—';
  const score      = data.score || 0;
  const winRate    = data.winRate || 0;
  const pillar     = data.pillarCount || 0;
  const skipReason = data.skipReason || '';

  if (sent) {
    const tierLabel =
      tier === 1 ? '🔱 PRIME SİNYAL' :
      tier === 2 ? '📡 KURUMSAL KURULUM' :
                   '👁 İZLEME LİSTESİ';
    const regime = data.regime || '—';
    console.log(`[✅ GÖNDERİLDİ] ${coin} — ${tierLabel}`);
    console.log(`[📊 DETAY] Yön: ${direction} | Ham Yön: ${rawDir} | Skor: ${score}/100 | WR: %${winRate} | Pillar: ${pillar} | Rejim: ${regime}`);
  } else {
    const regime = data.regime || '—';
    console.log(`[⏭️  ATLANDI] ${coin}`);
    console.log(`[📊 DETAY] Yön: ${direction} | Ham Yön: ${rawDir} | Skor: ${score}/100 | WR: %${winRate} | Pillar: ${pillar} | Rejim: ${regime}`);
    if (skipReason) console.log(`[🔍 NEDEN] ${skipReason}`);
  }

} catch (e) {
  clearTimeout(timeout);
  if (e.name === 'AbortError') {
    console.warn(`[UYARI] ⏱️ Zaman aşımı (75s) — ${coin} atlandı.`);
    process.exit(0);
  }
  console.error(`[HATA] ❌ ${e.message}`);
  process.exit(0);
}

process.exit(0);
