// pages/api/auth.js — META ELITE AUTH & SECURITY ENGINE

// env vars her request'te taze okunuyor (Next.js build-time inlining bypass)
function cfg() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL  || process.env.SUPABASE_URL,
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    svc: process.env.SUPABASE_SERVICE_KEY,
  };
}

async function sbFetch(path, method, body, token) {
  const { url, anon, svc } = cfg();
  const key = (path.includes('/admin/') && svc) ? svc : anon;
  try {
    const r = await fetch(`${url}/auth/v1${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'apikey': key, 'Authorization': `Bearer ${token || key}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = { error: text }; }
    return { status: r.status, data };
  } catch (e) {
    return { status: 503, data: { error: 'Ağ Bağlantı Hatası: ' + e.message } };
  }
}

async function dbFetch(path, method, body) {
  const { url, svc } = cfg();
  try {
    const r = await fetch(`${url}/rest/v1${path}`, {
      method: method || 'GET',
      headers: { 'Content-Type': 'application/json', 'apikey': svc, 'Authorization': `Bearer ${svc}`, 'Prefer': 'return=representation' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    try { return { status: r.status, data: JSON.parse(text) }; } catch { return { status: r.status, data: [] }; }
  } catch (e) { return { status: 503, data: [] }; }
}

function eliteError(data) {
  const { url, anon } = cfg();
  const raw = data?.error_description || data?.msg || data?.message || data?.error || '';
  const r = raw.toLowerCase();
  if (!url || !anon) return 'Sunucu yapılandırma hatası: Supabase env vars eksik.';
  if (r.includes('network') || r.includes('bağlantı') || r.includes('fetch')) return `Supabase bağlantı hatası: ${raw}`;
  if (r.includes('invalid') || r.includes('credentials') || r.includes('password')) return 'Email veya şifre hatalı.';
  if (r.includes('email not confirmed') || r.includes('confirmed')) return 'Email adresinizi doğrulayın (gelen kutunuzu kontrol edin).';
  if (r.includes('already registered')) return 'Bu email zaten kayıtlı.';
  if (r.includes('user not found')) return 'Hesap bulunamadı. Önce kayıt olun.';
  if (raw) return `Hata: ${raw}`;
  return 'Erişim reddedildi. Lütfen tekrar deneyin.';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  // Allow GET for read-only actions (get-profile)
  const action = req.query.action || req.body?.action;
  if (req.method === 'GET') {
    if (action === 'get-profile') {
      const token = req.headers.authorization?.replace('Bearer ', '').trim();
      if (!token) return res.status(401).json({ error: 'Kimlik doğrulama başarısız.' });
      const { status, data: user } = await sbFetch('/user', 'GET', null, token);
      if (status >= 400 || !user?.id) return res.status(401).json({ error: 'Oturum süresi doldu.' });
      const { data: profiles } = await dbFetch(`/profiles?id=eq.${user.id}&select=*`);
      const profile = Array.isArray(profiles) ? profiles[0] : null;
      return res.status(200).json({
        profile: profile || { plan: 'free', daily_analyses: 0, full_name: user.user_metadata?.full_name || '' },
        email: user.email,
        full_name: user.user_metadata?.full_name || profile?.full_name || '',
      });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, anon } = cfg();
  if (!url || !anon) {
    return res.status(500).json({ error: 'Sunucu yapılandırma hatası: Supabase env vars eksik.' });
  }


  if (action === 'register') {
    const { email, password, full_name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Geçersiz parametreler.' });

    const { status, data } = await sbFetch('/signup', 'POST', { email: email.trim().toLowerCase(), password, data: { full_name: full_name || '' } });
    if (status >= 400) return res.status(400).json({ error: eliteError(data) });

    const userId = data?.user?.id || data?.id;
    if (userId) {
      await dbFetch('/profiles', 'POST', { id: userId, email: email.trim().toLowerCase(), full_name: full_name || '', plan: 'free', daily_analyses: 0 });
    }

    return res.status(200).json({ success: true, message: 'Kayıt başarılı. Ağa giriş yapabilirsiniz.', session: data.session });
  }

  if (action === 'login') {
    const { email, password } = req.body || {};
    const { status, data } = await sbFetch('/token?grant_type=password', 'POST', { email: email.trim().toLowerCase(), password });
    if (status >= 400) return res.status(400).json({ error: eliteError(data) });

    const userId = data?.user?.id;
    if (userId) {
      const { data: profiles } = await dbFetch(`/profiles?id=eq.${userId}&select=id,banned`);
      const profile = Array.isArray(profiles) ? profiles[0] : null;
      if (profile?.banned) return res.status(403).json({ error: '🚫 SİSTEM ERİŞİMİNİZ KALICI OLARAK ENGELLENDİ.' });
    }

    return res.status(200).json({ success: true, session: data, user: data.user });
  }

  if (action === 'check-analysis') {
    const token = req.headers.authorization?.replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'Kimlik doğrulama başarısız.' });

    const { status, data: user } = await sbFetch('/user', 'GET', null, token);
    if (status >= 400 || !user?.id) return res.status(401).json({ error: 'Oturum zaman aşımına uğradı.' });

    const { data: profiles } = await dbFetch(`/profiles?id=eq.${user.id}&select=*`);
    let profile = Array.isArray(profiles) ? profiles[0] : null;
    if (profile?.banned) return res.status(403).json({ error: '🚫 SİSTEM ERİŞİMİNİZ ENGELLENDİ.' });

    const today = new Date().toISOString().split('T')[0];
    const isNewDay = profile?.last_analysis_date !== today;
    const currentCount = isNewDay ? 0 : (profile?.daily_analyses || 0);

    const limits = { free: 5, pro: 999999, elite: 999999 };
    const limit = limits[profile?.plan] || 5;

    if (currentCount >= limit) {
      return res.status(429).json({ error: `Günlük sunucu limitine (${limit}) ulaştınız. Sınırsız Sniper işlemleri için META ELITE lisansınızı yükseltin.` });
    }

    await dbFetch(`/profiles?id=eq.${user.id}`, 'PATCH', { daily_analyses: currentCount + 1, last_analysis_date: today });
    return res.status(200).json({ allowed: true, plan: profile?.plan || 'free' });
  }

  if (action === 'get-profile') {
    const token = req.headers.authorization?.replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'Kimlik doğrulama başarısız.' });
    const { status, data: user } = await sbFetch('/user', 'GET', null, token);
    if (status >= 400 || !user?.id) return res.status(401).json({ error: 'Oturum süresi doldu.' });
    const { data: profiles } = await dbFetch(`/profiles?id=eq.${user.id}&select=*`);
    const profile = Array.isArray(profiles) ? profiles[0] : null;
    return res.status(200).json({
      profile: profile || { plan: 'free', daily_analyses: 0, full_name: user.user_metadata?.full_name || '' },
      email: user.email,
      full_name: user.user_metadata?.full_name || profile?.full_name || '',
    });
  }

  return res.status(400).json({ error: 'Geçersiz işlem protokolü.' });
}
