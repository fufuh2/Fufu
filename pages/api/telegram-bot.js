/**
 * DEEP TRADE SCAN — Telegram + Twitter Signal Bot v12.0
 * 3-Tier Professional Signal System
 *
 * TIER 1 — PRIME SİNYAL   : valid=true  + score ≥ 65  + LONG/SHORT
 * TIER 2 — KURUMSAL KURULUM: score ≥ 52  + winRate ≥ 58 + rawDir LONG/SHORT + pillar ≥ 2
 * TIER 3 — İZLEME         : score ≥ 40  + pillar ≥ 1  + rawDir + regime != CHAOS
 *
 * Runtime: Node.js (Pages API — no edge config, full timeout support)
 * Çağrı:   GET /api/telegram-bot?key=SECRET&coin=BTC
 *          GET /api/telegram-bot?key=SECRET  (bulk: MAJOR + 3 rotating alts)
 *          GET /api/telegram-bot?status=1    (diagnostics)
 *
 * Twitter API v2 (OAuth 1.0a — resmi, stabil, cookie gerekmez):
 *   TWITTER_API_KEY        → developer.x.com → App → Keys & Tokens → API Key
 *   TWITTER_API_SECRET     → developer.x.com → App → Keys & Tokens → API Key Secret
 *   TWITTER_ACCESS_TOKEN   → developer.x.com → App → Keys & Tokens → Access Token
 *   TWITTER_ACCESS_SECRET  → developer.x.com → App → Keys & Tokens → Access Token Secret
 */

const SITE = 'deeptradescan.com';
const TAGS = '#crypto #bitcoin #btc #ethereum #eth #blockchain #cryptonews #cryptotrading #trading #defi #binance #altcoin #cryptomarket #bitcoinnews #investing';

const MAJOR = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP'];
const ALTS  = [
  'ADA', 'AVAX', 'DOT', 'LINK', 'DOGE', 'SHIB', 'PEPE', 'WIF', 'BONK', 'FLOKI',
  'ARB', 'OP', 'MATIC', 'INJ', 'SUI', 'NEAR', 'TON', 'APT', 'TIA', 'SEI',
  'AAVE', 'CRV', 'GMX', 'PENDLE', 'LDO', 'RUNE', 'FET', 'RENDER', 'TAO', 'WLD',
  'HBAR', 'KAS', 'STX', 'ATOM', 'LTC', 'ICP', 'ORDI', 'JTO', 'PYTH', 'STRK',
];

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtPrice(n) {
  const num = parseFloat(n);
  if (!num || isNaN(num)) return 'N/A';
  if (num >= 10000) return num.toFixed(2);
  if (num >= 100)   return num.toFixed(3);
  if (num >= 1)     return num.toFixed(4);
  return num.toFixed(6);
}

function fmtPct(n) {
  const num = parseFloat(n);
  if (isNaN(num)) return '';
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
}

function confBar(n) {
  const val = Math.min(Math.max(Math.round(n / 10), 0), 10);
  return '█'.repeat(val) + '░'.repeat(10 - val);
}

function gradeEmoji(grade) {
  if (!grade) return '⚪';
  if (grade.startsWith('S')) return '💎';
  if (grade.startsWith('A')) return '🟢';
  if (grade.startsWith('B')) return '🟡';
  return '🔴';
}

function tfEmoji(tf) {
  return tf === 'BULL' ? '🟢' : tf === 'BEAR' ? '🔴' : '⚪';
}

// ── TIER 1: Prime Signal ──────────────────────────────────────────────────────

function buildSignalMessage(coin, data) {
  const q   = data.quantum  || {};
  const s   = data.setup    || {};
  const lev = data.leverage || {};
  const mkt = data.market   || {};

  const dir   = q.direction || 'NEUTRAL';
  const score = q.score || 0;
  const grade = q.grade || '—';
  const wr    = q.winRate || 0;
  const price = mkt.price || s.entryMid || 0;
  const ch24  = mkt.change24h;

  const isLong   = dir === 'LONG';
  const dirEmoji = isLong ? '🟢' : '🔴';
  const arrow    = isLong ? '▲' : '▼';

  const entry = (s.entryLow && s.entryHigh)
    ? `$${fmtPrice(s.entryLow)} – $${fmtPrice(s.entryHigh)}`
    : `$${fmtPrice(s.entryMid || price)}`;

  const tps = [s.tp1, s.tp2, s.tp3].filter(Boolean).map(t => `$${fmtPrice(t)}`).join(' › ');
  const lev3 = (lev.conservative && lev.moderate && lev.aggressive)
    ? `${lev.conservative}x/${lev.moderate}x/${lev.aggressive}x`
    : null;

  return [
    `${dirEmoji} <b>${coin}/USDT ${arrow} ${dir}</b>  ${gradeEmoji(grade)} <b>${grade}</b>`,
    `<b>$${fmtPrice(price)}</b>${ch24 !== undefined ? `  <i>${fmtPct(ch24)}</i>` : ''}`,
    `┌ 📍 <b>${entry}</b>`,
    `├ 🛡 <b>$${fmtPrice(s.stop)}</b>  R:R ${s.rr || '—'}`,
    `└ 🎯 <b>${tps || '—'}</b>`,
    `🏆 Skor <b>${score}</b>  WR <b>${wr}%</b>${lev3 ? `  💼 ${lev3}` : ''}`,
    `🔗 <a href="https://${SITE}">deeptradescan.com</a>`,
    `\n${TAGS}`,
  ].join('\n');
}

// ── TIER 2: Setup Alert ───────────────────────────────────────────────────────

function buildAlertMessage(coin, data) {
  const q   = data.quantum || {};
  const s   = data.setup   || {};
  const mkt = data.market  || {};
  const lyr = data.layers  || {};

  const rawDir  = q.rawDirection || 'NEUTRAL';
  const score   = q.score   || 0;
  const winRate = q.winRate || 0;
  const price   = mkt.price || s.entryMid || 0;
  const ch24    = mkt.change24h;
  const mtf     = lyr.mtfAlignment || {};

  const isLong   = rawDir === 'LONG';
  const dirEmoji = isLong ? '🟡' : '🟠';
  const arrow    = isLong ? '▲' : '▼';
  const tfCount  = isLong ? (mtf.bullCount || 0) : (mtf.bearCount || 0);

  const entry = (s.entryLow && s.entryHigh)
    ? `$${fmtPrice(s.entryLow)} – $${fmtPrice(s.entryHigh)}`
    : s.entryMid ? `$${fmtPrice(s.entryMid)}` : '—';

  const tps = [s.tp1, s.tp2].filter(Boolean).map(t => `$${fmtPrice(t)}`).join(' › ');

  return [
    `${dirEmoji} <b>${coin}/USDT ${arrow} ${rawDir}</b>  📡 Setup`,
    `<b>$${fmtPrice(price)}</b>${ch24 !== undefined ? `  <i>${fmtPct(ch24)}</i>` : ''}`,
    `📍 <b>${entry}</b>  🛡 <b>${s.stop ? `$${fmtPrice(s.stop)}` : '—'}</b>  🎯 <b>${tps || '—'}</b>`,
    `📊 Skor <b>${score}</b>  WR <b>${winRate}%</b>  MTF <b>${tfCount}/4</b>`,
    `🔗 <a href="https://${SITE}">deeptradescan.com</a>`,
    `\n${TAGS}`,
  ].join('\n');
}

// ── Tier Detection ────────────────────────────────────────────────────────────
// Tier 1 — PRIME SİNYAL   : valid=true  + score≥65 + LONG/SHORT
// Tier 2 — KURUMSAL KURULUM: score≥52   + winRate≥58 + rawDir + pillar≥2
// Tier 3 — İZLEME         : score≥40   + pillar≥1  + rawDir + regime!=CHAOS

function detectTier(data, previewMode, testMode) {
  const q   = data.quantum || {};
  const pil = (data.layers || {}).pillarAnalysis || {};
  const ms  = data.microstructure || {};

  const score   = q.score || 0;
  const dir     = q.direction    || 'NEUTRAL';
  const rawDir  = q.rawDirection || 'NEUTRAL';
  const valid   = q.valid === true;
  const winRate = q.winRate || 0;
  const pillarCount    = pil.count ?? 0;
  const regimeBlocked  = pil.regimeBlocked === true;

  // Rejim bilgisi (varsa)
  const regimeLabel = _extractRegimeLabel(ms.volatilityRegime);
  const isChaos     = regimeLabel === 'CHAOS';

  const base = !previewMode && !testMode;

  // Tier 1: Onaylı kurumsal sinyal
  const tier1 = base && valid && score >= 65 && (dir === 'LONG' || dir === 'SHORT');

  // Tier 2: Oluşmakta olan kurulum (rawDirection kullanır)
  const tier2 = base && !tier1
    && score >= 52
    && winRate >= 58
    && (rawDir === 'LONG' || rawDir === 'SHORT')
    && pillarCount >= 2
    && !regimeBlocked;

  // Tier 3: İzleme listesi — kaos dışı, düşük eşik
  const tier3 = base && !tier1 && !tier2
    && score >= 40
    && pillarCount >= 1
    && (rawDir === 'LONG' || rawDir === 'SHORT')
    && !isChaos
    && !regimeBlocked;

  return {
    tier1, tier2, tier3,
    tier:         tier1 ? 1 : tier2 ? 2 : tier3 ? 3 : 0,
    dir, rawDir, score, valid, winRate, pillarCount,
    regimeLabel,
  };
}

function _extractRegimeLabel(volRegime) {
  if (!volRegime) return 'UNKNOWN';
  if (typeof volRegime === 'string') return volRegime;
  if (volRegime.regime) return volRegime.regime;
  return 'UNKNOWN';
}

// ── TIER 3: Watch Alert ───────────────────────────────────────────────────────

function buildWatchMessage(coin, data) {
  const q  = data.quantum       || {};
  const s  = data.setup         || {};
  const mkt = data.market       || {};
  const ms  = data.microstructure || {};

  const rawDir  = q.rawDirection || 'NEUTRAL';
  const score   = q.score   || 0;
  const winRate = q.winRate || 0;
  const price   = mkt.price || s.entryMid || 0;
  const ch24    = mkt.change24h;

  const isLong      = rawDir === 'LONG';
  const arrow       = isLong ? '▲' : '▼';
  const regimeLabel = _extractRegimeLabel(ms.volatilityRegime);
  const regimeIcon  = { STRONG_TREND: '🔥', QUIET_TREND: '📊', RANGE: '📦', CHAOS: '⚠️' }[regimeLabel] || '👁';

  const entry = (s.entryLow && s.entryHigh)
    ? `$${fmtPrice(s.entryLow)} – $${fmtPrice(s.entryHigh)}`
    : s.entryMid ? `~$${fmtPrice(s.entryMid)}` : '—';

  return [
    `⚪ <b>${coin}/USDT ${arrow} ${rawDir}</b>  ${regimeIcon} İzleme`,
    `<b>$${fmtPrice(price)}</b>${ch24 !== undefined ? `  <i>${fmtPct(ch24)}</i>` : ''}  📍 <b>${entry}</b>${s.stop ? `  🛡 <b>$${fmtPrice(s.stop)}</b>` : ''}${s.tp1 ? `  🎯 <b>$${fmtPrice(s.tp1)}</b>` : ''}`,
    `📊 Skor <b>${score}</b>  WR <b>${winRate}%</b>`,
    `🔗 <a href="https://${SITE}">deeptradescan.com</a>`,
    `\n${TAGS}`,
  ].join('\n');
}

// ── API Helpers ───────────────────────────────────────────────────────────────

async function fetchAnalysis(coin, origin) {
  const ctrl = new AbortController();
  const t    = setTimeout(() => ctrl.abort(), 60000); // 60s per coin
  try {
    const r = await fetch(`${origin}/api/analyze`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin':       origin,
        'User-Agent':   'DeepTradeScan-Bot/10.1',
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

async function sendTelegram(token, chatId, text) {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(`Telegram ${r.status}: ${err.description || 'bilinmeyen hata'}`);
  }
  return await r.json();
}

// ── Twitter (Cookie Auth — API key gereksiz) ──────────────────────────────────
// ── Twitter API v2 — OAuth 1.0a (resmi, stabil) ─────────────────────────────
const crypto = require('crypto');

function oauthSign(method, url, params, consumerSecret, tokenSecret) {
  const base = Object.keys(params).sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
  const sigBase = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(base)}`;
  const sigKey  = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  return crypto.createHmac('sha1', sigKey).update(sigBase).digest('base64');
}

function buildOAuthHeader(method, url, body, creds) {
  const oauthParams = {
    oauth_consumer_key:     creds.apiKey,
    oauth_nonce:            crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
    oauth_token:            creds.accessToken,
    oauth_version:          '1.0',
  };
  const sig = oauthSign(method, url, oauthParams, creds.apiSecret, creds.accessSecret);
  oauthParams.oauth_signature = sig;
  const header = Object.keys(oauthParams).sort()
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(', ');
  return `OAuth ${header}`;
}

async function sendTweet(text, creds) {
  if (!creds.apiKey || !creds.accessToken) return { ok: false, reason: 'no_twitter_creds' };

  const url = 'https://api.twitter.com/2/tweets';
  const body = JSON.stringify({ text });
  const auth = buildOAuthHeader('POST', url, body, creds);

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': auth,
      'Content-Type':  'application/json',
    },
    body,
  });

  const json = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = json.detail || json.title || json.errors?.[0]?.message || JSON.stringify(json);
    throw new Error(`Twitter ${r.status}: ${msg}`);
  }
  return { ok: true, id: json.data?.id };
}

// ── Tweet Message Builders ────────────────────────────────────────────────────

function buildTweetSignal(coin, data) {
  const q   = data.quantum  || {};
  const s   = data.setup    || {};
  const lev = data.leverage || {};
  const mkt = data.market   || {};

  const dir   = q.direction || 'NEUTRAL';
  const score = q.score || 0;
  const grade = q.grade || '';
  const wr    = q.winRate || 0;
  const price = mkt.price || s.entryMid || 0;
  const isLong = dir === 'LONG';

  const entry = (s.entryLow && s.entryHigh)
    ? `$${fmtPrice(s.entryLow)}–$${fmtPrice(s.entryHigh)}`
    : `$${fmtPrice(s.entryMid || price)}`;
  const tps  = [s.tp1, s.tp2, s.tp3].filter(Boolean).map(t => `$${fmtPrice(t)}`).join('›');
  const lev3 = (lev.conservative && lev.moderate && lev.aggressive)
    ? `${lev.conservative}x/${lev.moderate}x/${lev.aggressive}x` : null;

  return [
    `${isLong ? '🟢' : '🔴'} $${coin} ${isLong ? '▲' : '▼'} ${dir} ${gradeEmoji(grade)}${grade} | ${score}/100 · WR ${wr}%`,
    `📍 ${entry}`,
    `🛡 $${fmtPrice(s.stop)}${s.rr ? ` (R:R ${s.rr})` : ''}  🎯 ${tps || '—'}`,
    lev3 ? `💼 ${lev3}` : null,
    `deeptradescan.com  #${coin} #Crypto #SmartMoney #ICT`,
  ].filter(Boolean).join('\n');
}

function buildTweetAlert(coin, data) {
  const q   = data.quantum || {};
  const s   = data.setup   || {};
  const mkt = data.market  || {};

  const rawDir  = q.rawDirection || 'NEUTRAL';
  const score   = q.score   || 0;
  const winRate = q.winRate || 0;
  const price   = mkt.price || s.entryMid || 0;
  const isLong  = rawDir === 'LONG';

  const entry = (s.entryLow && s.entryHigh)
    ? `$${fmtPrice(s.entryLow)}–$${fmtPrice(s.entryHigh)}`
    : s.entryMid ? `$${fmtPrice(s.entryMid)}` : '—';
  const tps = [s.tp1, s.tp2].filter(Boolean).map(t => `$${fmtPrice(t)}`).join('›');

  return [
    `${isLong ? '🟡' : '🟠'} $${coin} ${isLong ? '▲' : '▼'} ${rawDir} 📡 Setup`,
    `📍 ${entry}  🛡 ${s.stop ? `$${fmtPrice(s.stop)}` : '—'}  🎯 ${tps || '—'}`,
    `Score ${score} · WR ${winRate}%`,
    `deeptradescan.com  #${coin} #Crypto #Setup`,
  ].join('\n');
}

function buildTweetWatch(coin, data) {
  const q   = data.quantum || {};
  const s   = data.setup   || {};
  const rawDir  = q.rawDirection || 'NEUTRAL';
  const score   = q.score   || 0;
  const isLong  = rawDir === 'LONG';

  const entry = s.entryMid ? `$${fmtPrice(s.entryMid)}` : '—';
  const tp1   = s.tp1 ? `$${fmtPrice(s.tp1)}` : '—';

  return [
    `👁 $${coin} ${isLong ? '▲' : '▼'} ${rawDir} İzleme`,
    `📍 ${entry}  🎯 ${tp1}  Score ${score}`,
    `deeptradescan.com  #${coin} #Crypto`,
  ].join('\n');
}

// ── Rotating Alt Picker ───────────────────────────────────────────────────────

function getRotatingAlts() {
  const slot = Math.floor(Date.now() / (15 * 60 * 1000));
  const day  = Math.floor(Date.now() / 86400000);
  const s    = [...ALTS];
  for (let i = s.length - 1; i > 0; i--) {
    const j = ((day * 2654435761 + i * 40503) >>> 0) % (i + 1);
    [s[i], s[j]] = [s[j], s[i]];
  }
  const start = (slot * 3) % s.length;
  return [s[start % s.length], s[(start + 1) % s.length], s[(start + 2) % s.length]];
}

// ── Main Handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const secret   = process.env.CRON_SECRET       || 'deeptradescan-cron-2024';
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId   = process.env.TELEGRAM_CHANNEL  || '@deeptradescan';
  const origin   = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://deeptradescan.com';

  // Twitter API v2 — OAuth 1.0a credentials
  const twCreds = {
    apiKey:       process.env.TWITTER_API_KEY,
    apiSecret:    process.env.TWITTER_API_SECRET,
    accessToken:  process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  };
  const hasTwitter = !!(twCreds.apiKey && twCreds.apiSecret && twCreds.accessToken && twCreds.accessSecret);

  // ── Diagnostics ──
  if (req.query.status === '1') {
    return res.status(200).json({
      ok:             true,
      bot_token_set:  !!botToken,
      bot_token_hint: botToken ? `${botToken.slice(0, 10)}...` : 'EKSİK!',
      chat_id:        chatId,
      origin,
      cron_secret_set: !!process.env.CRON_SECRET,
      twitter_set:    hasTwitter,
      twitter_keys:   { api_key: !!twCreds.apiKey, api_secret: !!twCreds.apiSecret, access_token: !!twCreds.accessToken, access_secret: !!twCreds.accessSecret },
      twitter_guide:  'developer.x.com → App oluştur → Keys & Tokens → 4 değeri env vars olarak ekle',
      tier_system:    'T1: valid+score≥65 | T2: score≥52+winRate≥58+pillar≥2 | T3: score≥40+pillar≥1+!CHAOS',
      setup_guide:    'TELEGRAM_BOT_TOKEN + TWITTER_API_KEY + TWITTER_API_SECRET + TWITTER_ACCESS_TOKEN + TWITTER_ACCESS_SECRET env vars set edilmeli',
    });
  }

  // ── Auth ──
  const isRenderCron = req.headers['x-render-cron'] === '1';
  const hasKey       = req.query.key === secret;
  if (!isRenderCron && !hasKey) {
    return res.status(401).json({ error: 'Yetkisiz. ?key=CRON_SECRET ekle.' });
  }

  // ── Token check ──
  if (!botToken) {
    return res.status(500).json({
      error:   'TELEGRAM_BOT_TOKEN tanımlı değil!',
      action:  'Render Dashboard → deeptradescan servis → Environment → TELEGRAM_BOT_TOKEN ekle',
      value:   'BotFather\'dan aldığın token: 8771447810:AAE-...',
    });
  }

  const previewMode = req.query.preview === '1';
  const testMode    = req.query.test    === '1';

  // ── Single coin ──
  if (req.query.coin) {
    const coin = req.query.coin.toUpperCase().trim();
    try {
      const data = await fetchAnalysis(coin, origin);
      if (data.error) throw new Error(data.error);

      const ti = detectTier(data, previewMode, testMode);
      let msg       = null;
      let tweetText = null;
      let sent      = false;

      if (ti.tier1) {
        msg       = buildSignalMessage(coin, data);
        tweetText = buildTweetSignal(coin, data);
        await sendTelegram(botToken, chatId, msg);
        sent = true;
      } else if (ti.tier2) {
        msg       = buildAlertMessage(coin, data);
        tweetText = buildTweetAlert(coin, data);
        await sendTelegram(botToken, chatId, msg);
        sent = true;
      } else if (ti.tier3) {
        msg       = buildWatchMessage(coin, data);
        tweetText = buildTweetWatch(coin, data);
        await sendTelegram(botToken, chatId, msg);
        sent = true;
      }

      let tweetResult = null;
      if (sent && tweetText && hasTwitter) {
        tweetResult = await sendTweet(tweetText, twCreds).catch(e => ({ ok: false, error: e.message }));
      }

      return res.status(200).json({
        success:      true,
        coin,
        sent,
        tier:         ti.tier,
        direction:    ti.dir,
        rawDirection: ti.rawDir,
        score:        ti.score,
        valid:        ti.valid,
        winRate:      ti.winRate,
        pillarCount:  ti.pillarCount,
        regime:       ti.regimeLabel,
        tweet:        tweetResult,
        skipReason:   !sent ? (
          ti.score < 40  ? `score ${ti.score} < 40 (tier3 eşiği)` :
          ti.score < 52  ? `score ${ti.score} < 52 (tier2 eşiği)` :
          ti.winRate < 58 ? `winRate ${ti.winRate} < 58` :
          `rawDir=${ti.rawDir} pillar=${ti.pillarCount} regime=${ti.regimeLabel}`
        ) : undefined,
        preview: (previewMode || testMode) ? (msg || '—') : undefined,
      });
    } catch (e) {
      return res.status(500).json({ error: e.message, coin });
    }
  }

  // ── Bulk mode (MAJOR + 3 rotating alts) ──
  const coins   = testMode ? ['BTC', 'ETH'] : [...MAJOR, ...getRotatingAlts()];
  const sent    = [];
  const skipped = [];
  const errors  = [];
  const results = [];

  for (let i = 0; i < coins.length; i++) {
    const coin = coins[i];
    try {
      if (i > 0) await new Promise(r => setTimeout(r, 3000));
      const data = await fetchAnalysis(coin, origin);
      if (data.error) throw new Error(data.error);

      const ti        = detectTier(data, previewMode, testMode);
      let msg         = null;
      let tweetText   = null;
      let wasSent     = false;

      if (ti.tier1) {
        msg       = buildSignalMessage(coin, data);
        tweetText = buildTweetSignal(coin, data);
        await sendTelegram(botToken, chatId, msg);
        wasSent = true;
        await new Promise(r => setTimeout(r, 2000));
      } else if (ti.tier2) {
        msg       = buildAlertMessage(coin, data);
        tweetText = buildTweetAlert(coin, data);
        await sendTelegram(botToken, chatId, msg);
        wasSent = true;
        await new Promise(r => setTimeout(r, 2000));
      } else if (ti.tier3) {
        msg       = buildWatchMessage(coin, data);
        tweetText = buildTweetWatch(coin, data);
        await sendTelegram(botToken, chatId, msg);
        wasSent = true;
        await new Promise(r => setTimeout(r, 2000));
      }

      if (wasSent && tweetText && hasTwitter) {
        const twRes = await sendTweet(tweetText, twCreds).catch(e => ({ ok: false, error: e.message }));
        if (!twRes.ok) console.error(`[Twitter] ${coin} tweet hatası:`, twRes.error || twRes.reason);
      }

      if (wasSent) {
        sent.push({ coin, tier: ti.tier, direction: ti.tier1 ? ti.dir : ti.rawDir, regime: ti.regimeLabel });
      } else {
        skipped.push({ coin, score: ti.score, winRate: ti.winRate, rawDir: ti.rawDir, pillar: ti.pillarCount, regime: ti.regimeLabel });
      }

      results.push({ coin, tier: ti.tier, direction: ti.dir, rawDirection: ti.rawDir, score: ti.score, valid: ti.valid, winRate: ti.winRate, pillarCount: ti.pillarCount, regime: ti.regimeLabel, sent: wasSent });
    } catch (e) {
      errors.push({ coin, error: e.message });
    }
  }

  return res.status(200).json({
    success:     true,
    timestamp:   new Date().toISOString(),
    total_sent:  sent.length,
    sent_coins:  sent,
    skipped,
    errors,
    results,
  });
}
