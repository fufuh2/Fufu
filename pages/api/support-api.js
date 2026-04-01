// pages/api/support.js — DEEP TRADE SCAN :: SUPPORT API
// Institutional Grade Ticketing & Polling System

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_KEY;
const INTERNAL_SEC = process.env.INTERNAL_SECRET || 'dts_internal_2025';

/* ─── Supabase DB Helper ───────────────────────────────────────── */
const db = async (path, method = 'GET', body) => {
  if (!SB_URL || !SVC) return { ok: false, status: 500, data: { error: 'Missing DB Config' } };
  
  try {
    const r = await fetch(`${SB_URL}/rest/v1${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SVC,
        'Authorization': `Bearer ${SVC}`,
        'Prefer': 'return=representation',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const t = await r.text();
    try { 
      return { ok: r.ok, status: r.status, data: JSON.parse(t) }; 
    } catch { 
      return { ok: false, status: r.status, data: [] }; 
    }
  } catch (error) {
    console.error('[SUPPORT API] DB Fetch Error:', error.message);
    return { ok: false, status: 503, data: { error: 'Veritabanı bağlantı hatası.' } };
  }
};

/* ─── User Fetcher ─────────────────────────────────────────────── */
const getUser = async (token) => {
  if (!token) return null;
  try {
    const r = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { 'apikey': SVC, 'Authorization': `Bearer ${token}` }
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.id ? d : null;
  } catch { return null; }
};

/* ─── Admin Notification Hook ──────────────────────────────────── */
async function notifyAdminNewTicket(email, message) {
  try {
    const origin = process.env.NEXTAUTH_URL || 'https://deeptradescan.com';
    await fetch(`${origin}/api/admin?action=notify-support`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': INTERNAL_SEC },
      body: JSON.stringify({ email, message: message.substring(0, 100) + '...' }),
    });
  } catch {}
}

/* ─── MAIN HANDLER ─────────────────────────────────────────────── */
export default async function handler(req, res) {
  // CORS & Preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  const { action } = req.query;

  // ── 1. MESAJ GÖNDER (Sadece POST) ───────────────────────────────
  if (action === 'send') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { message, email, conversation_id } = req.body || {};
    if (!message?.trim()) return res.status(400).json({ error: 'Mesaj alanı boş bırakılamaz.' });

    let userId = null;
    let userEmail = email || null;

    if (token && token !== 'undefined' && token !== 'null') {
      const user = await getUser(token);
      if (user) { 
        userId = user.id; 
        userEmail = user.email || userEmail; 
      }
    }

    const payload = {
      user_id: userId,
      user_email: userEmail || 'Ziyaretçi',
      message: message.trim(),
      status: 'open',
      is_from_admin: false,
    };

    if (conversation_id) payload.conversation_id = conversation_id;

    const { data, ok } = await db('/support_messages', 'POST', payload);
    if (!ok) return res.status(500).json({ error: 'Mesaj iletilemedi. Lütfen daha sonra tekrar deneyin.', detail: data });

    const msg = Array.isArray(data) ? data[0] : data;
    const newConvId = conversation_id || msg?.id;

    // Eğer bu yepyeni bir konuşmaysa (conversation_id yoksa), ilk mesajın ID'sini konuşma ID'si yap
    if (!conversation_id && msg?.id) {
      await db(`/support_messages?id=eq.${msg.id}`, 'PATCH', { conversation_id: msg.id });
      // Yeni ticket açıldığında admin'e sessizce bildir
      notifyAdminNewTicket(userEmail || 'Ziyaretçi', message.trim());
    }

    return res.status(200).json({
      success: true,
      id: msg?.id,
      conversation_id: newConvId,
    });
  }

  // ── 2. KONUŞMA GEÇMİŞİNİ GETİR (Sadece GET) ──────────────────────
  if (action === 'get') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { conversation_id } = req.query;
    if (!conversation_id) return res.status(400).json({ error: 'conversation_id gerekli' });

    const { data, ok } = await db(
      `/support_messages?conversation_id=eq.${conversation_id}&order=created_at.asc&limit=100`
    );
    
    if (!ok) return res.status(500).json({ error: 'Geçmiş yüklenemedi' });
    return res.status(200).json({ messages: Array.isArray(data) ? data : [] });
  }

  // ── 3. CANLI POLLING / YENİ MESAJ KONTROLÜ (Sadece GET) ──────────
  if (action === 'poll') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { conversation_id, since } = req.query;
    if (!conversation_id) return res.status(400).json({ error: 'conversation_id gerekli' });

    let path = `/support_messages?conversation_id=eq.${conversation_id}&order=created_at.asc`;
    if (since) path += `&created_at=gt.${since}`;

    const { data, ok } = await db(path);
    if (!ok) return res.status(500).json({ messages: [] });
    
    return res.status(200).json({ messages: Array.isArray(data) ? data : [] });
  }

  return res.status(400).json({ error: 'Geçersiz action parametresi.' });
}
