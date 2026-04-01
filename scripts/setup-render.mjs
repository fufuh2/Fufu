/**
 * DEEP TRADE SCAN — Render Auto-Setup Script
 *
 * Bu script Render API kullanarak tüm env vars ve cron komutunu otomatik ayarlar.
 *
 * Kullanım:
 *   RENDER_API_KEY=rnd_xxxx node scripts/setup-render.mjs
 *
 * Render API Key nasıl alınır:
 *   dashboard.render.com → Account Settings → API Keys → Create API Key
 */

const API_KEY    = process.env.RENDER_API_KEY;
const BASE       = 'https://api.render.com/v1';

if (!API_KEY) {
  console.error('❌ RENDER_API_KEY eksik!');
  console.error('   dashboard.render.com → Account Settings → API Keys → Create API Key');
  console.error('   Sonra: RENDER_API_KEY=rnd_xxx node scripts/setup-render.mjs');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type':  'application/json',
  'Accept':        'application/json',
};

// ── Render API Helpers ────────────────────────────────────────────────────────

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Render API ${method} ${path} → ${r.status}: ${err.slice(0, 200)}`);
  }
  return await r.json();
}

async function listServices() {
  const data = await api('GET', '/services?limit=20');
  return data.map(d => d.service);
}

async function updateEnvVars(serviceId, envVars) {
  // Render API: PUT /services/{id}/env-vars (replaces all)
  // Use PATCH to add/update specific ones
  const updates = envVars.map(({ key, value }) => ({ key, value }));
  return await api('PUT', `/services/${serviceId}/env-vars`, updates);
}

async function getEnvVars(serviceId) {
  const data = await api('GET', `/services/${serviceId}/env-vars`);
  return data.map(e => e.envVar);
}

async function mergeEnvVars(serviceId, newVars) {
  // Fetch existing, merge new values (overwrite matching keys, keep others)
  const existing = await getEnvVars(serviceId);
  const merged   = [...existing];

  for (const { key, value } of newVars) {
    const idx = merged.findIndex(e => e.key === key);
    if (idx >= 0) {
      merged[idx] = { key, value };
    } else {
      merged.push({ key, value });
    }
  }

  return await updateEnvVars(serviceId, merged);
}

async function deploySevice(serviceId) {
  return await api('POST', `/services/${serviceId}/deploys`, { clearCache: 'do_not_clear' });
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('\n🔱 DEEP TRADE SCAN — Render Auto-Setup\n');
console.log('Servisler yükleniyor...');

const services = await listServices();

if (!services || services.length === 0) {
  console.error('❌ Hiç servis bulunamadı. API Key doğru mu?');
  process.exit(1);
}

console.log(`✅ ${services.length} servis bulundu:\n`);
services.forEach(s => console.log(`   • ${s.name} [${s.type}] → ${s.id}`));
console.log('');

// Servisleri bul
const webService  = services.find(s => s.type === 'web_service');
const cronService = services.find(s => s.name?.includes('telegram-cron') || s.name?.includes('cron'));

if (!webService) {
  console.error('❌ Web servisi bulunamadı (type=web_service).');
  process.exit(1);
}

console.log(`📌 Web Servisi : ${webService.name} (${webService.id})`);
console.log(`📌 Cron Servisi: ${cronService?.name || '⚠️ BULUNAMADI'} (${cronService?.id || '—'})`);
console.log('');

// ── Web Servisi Env Vars ──────────────────────────────────────────────────────

const WEB_ENV_VARS = [
  { key: 'NODE_ENV',              value: 'production' },
  { key: 'NEXT_TELEMETRY_DISABLED', value: '1' },
  { key: 'APP_BASE_URL',          value: 'https://deeptradescan.com' },
  { key: 'CRON_SECRET',           value: 'deeptradescan-cron-2024' },
  { key: 'TELEGRAM_CHANNEL',      value: '@deeptradescan' },
  { key: 'TELEGRAM_BOT_TOKEN',    value: '8771447810:AAE-iAiW0Je0YiIZLKneJTbhyAnQUDii6ec' },
];

// ── Cron Servisi Env Vars ─────────────────────────────────────────────────────

const CRON_ENV_VARS = [
  { key: 'APP_BASE_URL', value: 'https://deeptradescan.com' },
  { key: 'CRON_SECRET',  value: 'deeptradescan-cron-2024' },
];

// ── Apply ─────────────────────────────────────────────────────────────────────

try {
  process.stdout.write(`⚙️  Web servisine ${WEB_ENV_VARS.length} env var ekleniyor... `);
  await mergeEnvVars(webService.id, WEB_ENV_VARS);
  console.log('✅');

  // Deploy web service to apply changes
  process.stdout.write('🚀 Web servisi yeniden deploy ediliyor... ');
  await deploySevice(webService.id);
  console.log('✅');
} catch (e) {
  console.error(`\n❌ Web servisi hatası: ${e.message}`);
}

if (cronService) {
  try {
    process.stdout.write(`⚙️  Cron servisine ${CRON_ENV_VARS.length} env var ekleniyor... `);
    await mergeEnvVars(cronService.id, CRON_ENV_VARS);
    console.log('✅');
  } catch (e) {
    console.error(`\n❌ Cron env var hatası: ${e.message}`);
  }
} else {
  console.warn('⚠️  Cron servisi bulunamadı — env vars atlandı.');
}

console.log('\n════════════════════════════════════════');
console.log('✅ TAMAMLANDI');
console.log('════════════════════════════════════════');
console.log('');
console.log('Sonraki adımlar:');
console.log('1. Render Dashboard → deeptradescan-telegram-cron → Settings');
console.log('   Command: node scripts/send-signals.mjs  ← bunu elle değiştir');
console.log('2. Bot\'u @deeptradescan kanalına admin olarak ekle');
console.log('3. 15 dakika bekle — ilk sinyal gelecek');
console.log('');
