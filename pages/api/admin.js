// pages/api/admin.js — DEEP TRADE SCAN :: ADMIN COMMAND API v4.1
// env vars as functions — always fresh in serverless
const sbUrl  = () => process.env.NEXT_PUBLIC_SUPABASE_URL  || process.env.SUPABASE_URL || '';
const sbSvc  = () => process.env.SUPABASE_SERVICE_KEY || '';
const ADMIN_EMAIL  = () => process.env.ADMIN_EMAIL || 'furkan@deeptradescan.com';
const TG_BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_ID   = () => process.env.TELEGRAM_ADMIN_CHAT_ID;

/* ─── HELPERS ─────────────────────────────────────────────────────────── */
const db = async (path, method = 'GET', body) => {
  const url = sbUrl(); const svc = sbSvc();
  if (!url || !svc) return { ok: false, status: 500, data: { error: 'Supabase env eksik' } };
  try {
    const r = await fetch(`${url}/rest/v1${path}`, {
      method,
      headers: {
        'Content-Type':  'application/json',
        'apikey':        svc,
        'Authorization': `Bearer ${svc}`,
        'Prefer':        'return=representation',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const t = await r.text();
    try { return { ok: r.ok, status: r.status, data: JSON.parse(t) }; }
    catch { return { ok: false, status: r.status, data: { raw: t } }; }
  } catch(e) { return { ok: false, status: 503, data: { error: e.message } }; }
};

/* Upsert: INSERT with ON CONFLICT DO UPDATE */
const dbUpsert = (path, body, onConflict) =>
  db(path, 'POST', body, {
    'Prefer': `resolution=merge-duplicates,return=representation`,
    ...(onConflict ? { 'x-upsert-on-conflict': onConflict } : {}),
  });

const authAdmin = async (path, method = 'GET', body) => {
  const url = sbUrl(); const svc = sbSvc();
  if (!url || !svc) return { ok: false, data: null };
  try {
    const r = await fetch(`${url}/auth/v1/admin${path}`, {
      method,
      headers: {
        'Content-Type':  'application/json',
        'apikey':        svc,
        'Authorization': `Bearer ${svc}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const t = await r.text();
    try { return { ok: r.ok, data: JSON.parse(t) }; }
    catch { return { ok: false, data: null }; }
  } catch(e) { return { ok: false, data: null }; }
};

const getUser = async (token) => {
  if (!token) return null;
  const url = sbUrl(); const svc = sbSvc();
  if (!url || !svc) return null;
  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { 'apikey': svc, 'Authorization': `Bearer ${token}` }
    });
    const d = await r.json();
    return d?.email ? d : null;
  } catch { return null; }
};

const verifyAdmin = async (token) => {
  const user = await getUser(token);
  if (!user) return null;
  // Check hardcoded admin email first (always works)
  if (user.email === ADMIN_EMAIL()) return user;
  // Check admins table (optional — table might not exist)
  try {
    const { data } = await db(`/admins?email=eq.${encodeURIComponent(user.email)}&select=email`);
    if (Array.isArray(data) && data.length > 0) return user;
  } catch { /* admins table might not exist — ignore */ }
  return null;
};

/* ─── TELEGRAM NOTIFICATIONS ─────────────────────────────────────────── */
async function sendTelegram(text, chatId = TG_CHAT_ID()) {
  if (!TG_BOT_TOKEN() || !chatId) return { ok: false, reason: 'no_config' };
  try {
    const r = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    const d = await r.json();
    return d;
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

function planEmoji(plan) {
  return plan === 'elite' ? '💎' : plan === 'pro' ? '⭐' : '🆓';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ─── MEMBERSHIP EXPIRY ────────────────────────────────────────────────── */
function addMonths(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };

/* ══════════════════════════════════════════════════════════════════════ */
export default async function handler(req, res) {
  // ALWAYS respond with JSON — never HTML error pages
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });

  try {
  const token  = req.headers.authorization?.replace('Bearer ', '');
  const action = req.query.action;

  /* ── PUBLIC: Yeni kayıt bildirimi (auth.js'den çağrılır) ─────────── */
  if (action === 'notify-register') {
    const secret = req.headers['x-internal-secret'];
    if (secret !== (process.env.INTERNAL_SECRET || 'dts_internal_2025')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { email, name } = req.body || {};
    await sendTelegram(
      `🆕 <b>YENİ KAYIT</b>\n\n` +
      `👤 İsim: ${name || 'Belirtilmedi'}\n` +
      `📧 Email: <code>${email}</code>\n` +
      `⏰ Tarih: ${formatDate(new Date())}\n\n` +
      `💬 <b>PRO/ELITE için @DeepTradeScanner'a yazabilirler</b>\n` +
      `🌐 <a href="https://deeptradescan.com">deeptradescan.com</a>`
    );
    return res.status(200).json({ ok: true });
  }

  /* ── ADMIN VERIFY ─────────────────────────────────────────────────── */
  const admin = await verifyAdmin(token);
  if (!admin) return res.status(403).json({ error: 'Yetkisiz erişim' });

  /* ── STATS ────────────────────────────────────────────────────────── */
  if (action === 'stats') {
    // Query only guaranteed-to-exist columns
    const [profRes, authRes, ticketRes] = await Promise.all([
      db('/profiles?select=plan,banned'),
      authAdmin('/users?page=1&per_page=1000').catch(() => ({ data: { users: [] } })),
      db('/support_messages?status=eq.open&is_from_admin=eq.false&select=id,conversation_id').catch(() => ({ data: [] })),
    ]);

    const profiles  = Array.isArray(profRes.data) ? profRes.data : [];
    const authUsers = authRes.data?.users || [];
    const tickets   = Array.isArray(ticketRes.data) ? ticketRes.data : [];
    const uniqueConvs = new Set(tickets.map(t => t.conversation_id)).size;

    // plan_expires_at is optional — skip expire check if column not available
    const expiredPro   = 0;
    const expiredElite = 0;

    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const yesterday  = new Date(Date.now() - 86400000);
    const todaySignups   = profiles.filter(p => p.created_at && new Date(p.created_at) >= todayStart).length;
    const activeUsers24h = authUsers.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= yesterday).length;
    const proCount   = profiles.filter(p => p.plan === 'pro'   && !p.banned).length;
    const eliteCount = profiles.filter(p => p.plan === 'elite' && !p.banned).length;
    const paidCount  = proCount + eliteCount;
    const convRate   = authUsers.length > 0 ? ((paidCount / authUsers.length) * 100).toFixed(1) : '0.0';

    return res.status(200).json({
      totalUsers:   authUsers.length,
      profileCount: profiles.length,
      freeUsers:    profiles.filter(p => (p.plan || 'free') === 'free' && !p.banned).length,
      proUsers:     proCount,
      eliteUsers:   eliteCount,
      bannedUsers:  profiles.filter(p => p.banned).length,
      expiredPro,
      expiredElite,
      openTickets:  uniqueConvs,
      todaySignups,
      activeUsers24h,
      conversionRate: parseFloat(convRate),
      estMRR:       proCount * 100 + eliteCount * 500,
    });
  }

  /* ── USERS ─ çift kaynak: Auth API + Profiles fallback ──────────── */
  if (action === 'users') {
    // 1) Profiles tablosunu çek (her zaman çalışır)
    const profRes = await db('/profiles?select=*&order=created_at.desc&limit=1000');
    const profiles = Array.isArray(profRes.data) ? profRes.data : [];

    // 2) Auth admin users (opsiyonel - başarısız olsa da devam et)
    let authUsers = [];
    try {
      const authRes = await authAdmin('/users?page=1&per_page=1000');
      authUsers = authRes.data?.users || [];
    } catch(e) { /* sessiz geç */ }

    // 3) Auth map oluştur
    const authMap = {};
    authUsers.forEach(u => { authMap[u.id] = u; });

    // 4) Profiles'ı base olarak kullan, auth bilgisini merge et
    const profileMap = {};
    profiles.forEach(p => { profileMap[p.id] = p; });

    // Auth'da olup profile'da olmayanları da ekle
    const allIds = new Set([
      ...profiles.map(p => p.id),
      ...authUsers.map(u => u.id)
    ]);

    const merged = Array.from(allIds).map(id => {
      const p = profileMap[id] || {};
      const u = authMap[id] || {};
      return {
        id:                 id,
        email:              p.email || u.email || '—',
        full_name:          p.full_name || u.user_metadata?.full_name || '',
        plan:               p.plan || 'free',
        daily_analyses:     p.daily_analyses || 0,
        last_analysis_date: p.last_analysis_date || null,
        banned:             p.banned || false,
        plan_expires_at:    p.plan_expires_at || null,
        plan_set_at:        p.plan_set_at || null,
        created_at:         p.created_at || u.created_at || null,
        last_sign_in_at:    u.last_sign_in_at || null,
        provider:           u.app_metadata?.provider || 'email',
        confirmed:          !!u.email_confirmed_at,
      };
    }).filter(u => u.email && u.email !== '—'); // email'siz kayıtları filtrele

    // 5) Profili olmayan auth kullanıcıları için profil oluştur (arka plan)
    const missingProfiles = authUsers.filter(u => !profileMap[u.id] && u.email);
    if (missingProfiles.length > 0) {
      Promise.all(missingProfiles.slice(0, 50).map(u =>
        db('/profiles', 'POST', {
          id: u.id, email: u.email,
          full_name: u.user_metadata?.full_name || '',
          plan: 'free', daily_analyses: 0, banned: false,
        })
      )).catch(() => {});
    }

    // En son kayıt önce
    merged.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    return res.status(200).json({
      users:   merged,
      total:   merged.length,
      debug: {
        authCount:    authUsers.length,
        profileCount: profiles.length,
        mergedCount:  merged.length,
      }
    });
  }

  /* ── SET PLAN (aylık üyelik yönetimi) ────────────────────────────── */
  if (action === 'set-plan') {
    const { userId, plan, months, userEmail, userName } = req.body || {};

    // Validate inputs
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId gerekli' });
    if (!['free','pro','elite'].includes(plan))  return res.status(400).json({ error: 'Geçersiz plan: ' + plan });

    const url = sbUrl();
    const svc = sbSvc();
    if (!url || !svc) return res.status(500).json({ error: 'Supabase env vars eksik — SUPABASE_SERVICE_KEY kontrol et' });

    const expiresAt = (months && months > 0) ? addMonths(parseInt(months)) : null;

    // ── STEP 1: Check if profile exists ──────────────────────────────
    let profileExists = false;
    try {
      const chkRes = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id`, {
        headers: { 'apikey': svc, 'Authorization': `Bearer ${svc}` }
      });
      const chkText = await chkRes.text();
      // Detect non-JSON (paused project, wrong URL, etc.)
      if (chkText.trim().startsWith('<') || chkText.trim().startsWith('Internal')) {
        return res.status(503).json({ error: `Supabase bağlantı hatası — proje duraklatılmış olabilir. URL: ${url.slice(0, 40)}` });
      }
      let chkData; try { chkData = JSON.parse(chkText); } catch(pe) {
        return res.status(503).json({ error: `Supabase yanıtı geçersiz: ${chkText.slice(0, 100)}` });
      }
      profileExists = Array.isArray(chkData) && chkData.length > 0;
      // Detect Supabase error response (e.g. invalid API key, wrong column)
      if (!Array.isArray(chkData) && chkData?.code) {
        return res.status(500).json({ error: `Supabase hata kodu ${chkData.code}: ${chkData.message}` });
      }
    } catch(e) {
      return res.status(500).json({ error: 'Profil sorgusu ağ hatası: ' + e.message });
    }

    // ── STEP 2: Upsert profile with ONLY guaranteed columns ──────────
    // NOTE: 'banned' column may not exist if schema wasn't fully applied
    const coreBody = { plan, daily_analyses: 0 };

    try {
      if (!profileExists) {
        // INSERT new profile
        const insRes = await fetch(`${url}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': svc,
            'Authorization': `Bearer ${svc}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ id: userId, email: userEmail || '', full_name: userName || '', plan, daily_analyses: 0 }),
        });
        if (!insRes.ok) {
          const errText = await insRes.text();
          return res.status(500).json({ error: 'Profil oluşturulamadı (' + insRes.status + '): ' + errText.slice(0, 200) });
        }
      } else {
        // UPDATE existing profile
        const updRes = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': svc,
            'Authorization': `Bearer ${svc}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(coreBody),
        });
        if (!updRes.ok) {
          const errText = await updRes.text();
          return res.status(500).json({ error: 'Plan güncellenemedi (' + updRes.status + '): ' + errText.slice(0, 200) });
        }
      }
    } catch(e) {
      return res.status(500).json({ error: 'DB yazma hatası: ' + e.message });
    }

    // ── STEP 3: Try to update optional columns (plan_set_at, plan_expires_at)
    // Fire-and-forget: failure here does NOT fail the whole operation
    try {
      await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': svc,
          'Authorization': `Bearer ${svc}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ plan_set_at: new Date().toISOString(), plan_expires_at: expiresAt }),
      });
    } catch(e) { /* optional columns not available — not a failure */ }

    // ── STEP 4: Telegram notification (non-blocking) ──────────────────
    const durationText = months && months > 0
      ? `${months} aylık (${formatDate(expiresAt)} kadar)`
      : 'Süresiz';
    sendTelegram(
      `${planEmoji(plan)} <b>ÜYELİK GÜNCELLENDİ</b>\n\n` +
      `👤 Kullanıcı: <code>${userEmail || userId}</code>\n` +
      `📛 İsim: ${userName || '—'}\n` +
      `📋 Yeni Plan: <b>${plan.toUpperCase()}</b>\n` +
      `📅 Süre: ${durationText}\n` +
      `🛡 Admin: ${admin.email}\n` +
      `⏰ Tarih: ${formatDate(new Date())}`
    ).catch(() => {});

    return res.status(200).json({ success: true, plan, expires_at: expiresAt, userId });
  }

  /* ── BAN (site'den tamamen engelle) ──────────────────────────────── */
  if (action === 'ban-user') {
    const { userId, banned, userEmail, reason } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId gerekli' });

    const { data: existing } = await db(`/profiles?id=eq.${userId}&select=id`);
    // ban_reason and banned_at are safe columns; 'banned' may not exist → try separately
    const banBody = { ban_reason: reason || null, banned_at: banned ? new Date().toISOString() : null };
    if (!Array.isArray(existing) || existing.length === 0)
      await db('/profiles', 'POST', { id: userId, ...banBody });
    else
      await db(`/profiles?id=eq.${userId}`, 'PATCH', banBody);
    // Try to update 'banned' column — silently skip if column doesn't exist
    await db(`/profiles?id=eq.${userId}`, 'PATCH', { banned: !!banned }).catch(() => {});

    // Supabase auth ban (girişi engelle)
    await authAdmin(`/users/${userId}`, 'PUT', {
      ban_duration: banned ? '876000h' : 'none'
    });

    // Telegram bildirimi
    await sendTelegram(
      `${banned ? '🚫' : '✅'} <b>KULLANICI ${banned ? 'BANLANDI' : 'BAN KALDIRILDI'}</b>\n\n` +
      `📧 Email: <code>${userEmail || userId}</code>\n` +
      `📝 Sebep: ${reason || 'Belirtilmedi'}\n` +
      `🛡 Admin: ${admin.email}\n` +
      `⏰ Tarih: ${formatDate(new Date())}`
    );

    return res.status(200).json({ success: true });
  }

  /* ── DELETE ──────────────────────────────────────────────────────── */
  if (action === 'delete-user') {
    const { userId, userEmail } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId gerekli' });

    await db(`/profiles?id=eq.${userId}`, 'DELETE');
    await authAdmin(`/users/${userId}`, 'DELETE');

    await sendTelegram(
      `🗑 <b>KULLANICI SİLİNDİ</b>\n\n` +
      `📧 Email: <code>${userEmail || userId}</code>\n` +
      `🛡 Admin: ${admin.email}\n` +
      `⏰ Tarih: ${formatDate(new Date())}`
    );

    return res.status(200).json({ success: true });
  }

  /* ── RESET LIMIT ─────────────────────────────────────────────────── */
  if (action === 'reset-limit') {
    const { userId } = req.body || {};
    await db(`/profiles?id=eq.${userId}`, 'PATCH', {
      daily_analyses: 0, last_analysis_date: null
    });
    return res.status(200).json({ success: true });
  }

  /* ── EXPIRE CHECK & AUTO-DOWNGRADE ───────────────────────────────── */
  if (action === 'expire-check') {
    const { data: expiredProfiles } = await db(
      `/profiles?plan=not.eq.free&plan_expires_at=lt.${new Date().toISOString()}&banned=eq.false&select=*`
    );
    const expired = Array.isArray(expiredProfiles) ? expiredProfiles : [];
    let downgraded = 0;
    for (const p of expired) {
      await db(`/profiles?id=eq.${p.id}`, 'PATCH', {
        plan: 'free',
        plan_expires_at: null,
        daily_analyses: 0,
      });
      downgraded++;
      await sendTelegram(
        `⚠️ <b>ÜYELİK SÜRESİ DOLDU</b>\n\n` +
        `📧 Email: <code>${p.email}</code>\n` +
        `📋 Eski Plan: ${(p.plan || 'free').toUpperCase()} → FREE\n` +
        `📅 Bitiş: ${formatDate(p.plan_expires_at)}`
      );
    }
    return res.status(200).json({ success: true, downgraded });
  }

  /* ── SEND TELEGRAM to user (custom message) ──────────────────────── */
  if (action === 'send-telegram') {
    const { message, targetChatId } = req.body || {};
    if (!message?.trim()) return res.status(400).json({ error: 'Mesaj gerekli' });
    const result = await sendTelegram(message, targetChatId || TG_CHAT_ID());
    return res.status(200).json({ success: result.ok, result });
  }

  /* ── SUPPORT LIST ────────────────────────────────────────────────── */
  if (action === 'support-list') {
    const { data } = await db('/support_messages?order=created_at.desc&limit=500');
    const msgs = Array.isArray(data) ? data : [];

    const convMap = {};
    for (const m of msgs) {
      const cid = m.conversation_id || m.id;
      if (!convMap[cid]) convMap[cid] = { ...m, conversation_id: cid, messageCount: 0 };
      convMap[cid].messageCount++;
      if (!m.is_from_admin) {
        convMap[cid].lastUserMessage = m.message;
        convMap[cid].lastUserTime = m.created_at;
      }
    }
    const conversations = Object.values(convMap)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.status(200).json({ messages: conversations });
  }

  /* ── SUPPORT MESSAGES ────────────────────────────────────────────── */
  if (action === 'support-messages') {
    const { conversation_id } = req.query;
    if (!conversation_id) return res.status(400).json({ error: 'conversation_id gerekli' });
    const { data } = await db(
      `/support_messages?conversation_id=eq.${conversation_id}&order=created_at.asc&limit=200`
    );
    return res.status(200).json({ messages: Array.isArray(data) ? data : [] });
  }

  /* ── SUPPORT REPLY ───────────────────────────────────────────────── */
  if (action === 'support-reply') {
    const { conversation_id, reply, user_id, user_email } = req.body || {};
    if (!reply?.trim() || !conversation_id)
      return res.status(400).json({ error: 'Eksik parametre' });

    await db(
      `/support_messages?conversation_id=eq.${conversation_id}&is_from_admin=eq.false&status=eq.open`,
      'PATCH', { status: 'replied', replied_at: new Date().toISOString() }
    );

    const { data, ok } = await db('/support_messages', 'POST', {
      user_id: user_id || null,
      user_email: user_email || null,
      message: reply.trim(),
      status: 'admin_reply',
      is_from_admin: true,
      conversation_id,
    });

    if (!ok) return res.status(500).json({ error: 'Cevap gönderilemedi' });
    return res.status(200).json({ success: true, message: Array.isArray(data) ? data[0] : data });
  }

  /* ── SUPPORT CLOSE ───────────────────────────────────────────────── */
  if (action === 'support-close') {
    const { conversation_id } = req.body || {};
    await db(`/support_messages?conversation_id=eq.${conversation_id}`, 'PATCH', { status: 'closed' });
    return res.status(200).json({ success: true });
  }

  /* ── BROADCAST ───────────────────────────────────────────────────── */
  if (action === 'broadcast') {
    const { message, targetPlan } = req.body || {};
    if (!message?.trim()) return res.status(400).json({ error: 'Mesaj gerekli' });

    let query = '/profiles?select=id,email';
    if (targetPlan && targetPlan !== 'all') query += `&plan=eq.${targetPlan}`;

    const { data: profiles } = await db(query);
    let sent = 0;
    if (Array.isArray(profiles)) {
      for (const u of profiles) {
        const convId = `bc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await db('/support_messages', 'POST', {
          user_id: u.id, user_email: u.email,
          message: message.trim(), status: 'broadcast',
          is_from_admin: true, conversation_id: convId,
        });
        sent++;
      }
    }

    // Telegram log
    await sendTelegram(
      `📢 <b>BROADCAST GÖNDERİLDİ</b>\n\n` +
      `👥 Hedef: ${targetPlan ? targetPlan.toUpperCase() : 'TÜMÜ'}\n` +
      `📊 Alıcı: ${sent} kullanıcı\n` +
      `💬 Mesaj: ${message.slice(0, 100)}${message.length > 100 ? '...' : ''}\n` +
      `🛡 Admin: ${admin.email}`
    );

    return res.status(200).json({ success: true, sent });
  }

  /* ── ANALYSIS LOG ────────────────────────────────────────────────── */
  if (action === 'analysis-log') {
    const { data } = await db('/profiles?select=*&order=daily_analyses.desc&limit=100');
    return res.status(200).json({ log: Array.isArray(data) ? data : [] });
  }

  /* ── ACTIVITY STATS (7-day signup trend) ─────────────────────────── */
  if (action === 'activity-stats') {
    const profRes = await db('/profiles?select=created_at&order=created_at.desc&limit=2000');
    const profiles = Array.isArray(profRes.data) ? profRes.data : [];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      const next = new Date(d.getTime() + 86400000);
      const label = d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
      const signups = profiles.filter(p => {
        const pd = new Date(p.created_at); return pd >= d && pd < next;
      }).length;
      days.push({ label, signups, date: d.toISOString().split('T')[0] });
    }
    return res.status(200).json({ days });
  }

  /* ── COIN STATS (most analyzed coins) ───────────────────────────── */
  if (action === 'coin-stats') {
    // Try user_analyses table first
    try {
      const { data, ok } = await db('/user_analyses?select=coin&limit=1000');
      if (ok && Array.isArray(data) && data.length > 0) {
        const coinMap = {};
        data.forEach(r => r.coin && (coinMap[r.coin] = (coinMap[r.coin] || 0) + 1));
        const coins = Object.entries(coinMap)
          .sort((a, b) => b[1] - a[1]).slice(0, 10)
          .map(([coin, count]) => ({ coin, count }));
        return res.status(200).json({ coins, source: 'user_analyses' });
      }
    } catch {}
    // Fallback: top users by daily_analyses
    const { data: profiles } = await db('/profiles?select=email,plan,daily_analyses&order=daily_analyses.desc&limit=20');
    return res.status(200).json({ coins: [], topUsers: Array.isArray(profiles) ? profiles : [], source: 'profiles' });
  }

  /* ── USER EXPORT (CSV data) ──────────────────────────────────────── */
  if (action === 'user-export') {
    const profRes = await db('/profiles?select=*&order=created_at.desc&limit=5000');
    const profiles = Array.isArray(profRes.data) ? profRes.data : [];
    return res.status(200).json({ users: profiles, total: profiles.length });
  }

  /* ── TEST TELEGRAM ───────────────────────────────────────────────── */
  if (action === 'test-telegram') {
    const result = await sendTelegram(
      `✅ <b>DEEP TRADE SCAN — Telegram Bağlantısı Başarılı</b>\n\n` +
      `Admin: ${admin.email}\n` +
      `Zaman: ${formatDate(new Date())}\n` +
      `Bot: Aktif ✓`
    );
    return res.status(200).json({ success: result.ok, result });
  }

  /* ── DEBUG: profiles direkt çek ─────────────────────────────────── */
  if (action === 'debug-users') {
    const url = sbUrl(); const svc = sbSvc();
    const profRes = await db('/profiles?select=*&order=created_at.desc&limit=200');
    let authUsers = [];
    try {
      const authRes = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=200`, {
        headers: { 'apikey': svc, 'Authorization': `Bearer ${svc}` }
      });
      const authData = await authRes.json();
      authUsers = authData?.users || [];
    } catch(e) {}

    return res.status(200).json({
      profiles: Array.isArray(profRes.data) ? profRes.data : [],
      profilesRaw: profRes,
      authUsersCount: authUsers.length,
      authUsers: authUsers.slice(0, 5),
      sbUrl: url ? url.substring(0, 30) + '...' : 'MISSING',
      svcKeyExists: !!svc,
    });
  }

  return res.status(400).json({ error: 'Geçersiz action' });
  } catch (err) {
    console.error('[admin.js] unhandled error:', err);
    return res.status(500).json({ error: 'Sunucu hatası: ' + (err.message || 'bilinmeyen hata') });
  }
}
