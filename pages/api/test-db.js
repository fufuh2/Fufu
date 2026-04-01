// pages/api/test-db.js — Supabase bağlantı ve tablo testi (protected)
const SB_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_SVC = () => process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  const secret = req.headers['x-internal-secret'] || req.query.secret;
  const expected = process.env.INTERNAL_SECRET;
  if (!expected || secret !== expected) return res.status(404).json({ error: 'Not found.' });
  if (req.method === 'OPTIONS') return res.status(200).end();

  const results = {};

  // 1. Env vars
  results.env = {
    SB_URL: SB_URL() ? SB_URL().slice(0, 40) + '...' : 'MISSING',
    SB_SVC: SB_SVC() ? 'SET (len=' + SB_SVC().length + ')' : 'MISSING',
  };

  if (!SB_URL() || !SB_SVC()) {
    return res.status(200).json({ ok: false, results, error: 'Env vars eksik' });
  }

  // 2. Test user_analyses table read
  try {
    const r = await fetch(`${SB_URL()}/rest/v1/user_analyses?limit=1`, {
      headers: { apikey: SB_SVC(), Authorization: `Bearer ${SB_SVC()}` }
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    results.table_read = {
      status: r.status,
      ok: r.ok,
      isArray: Array.isArray(data),
      sample: Array.isArray(data) ? `${data.length} kayıt` : (typeof data === 'object' ? JSON.stringify(data).slice(0, 200) : String(data).slice(0, 200)),
    };
  } catch (e) {
    results.table_read = { error: e.message };
  }

  // 3. Test profiles table read
  try {
    const r = await fetch(`${SB_URL()}/rest/v1/profiles?limit=1`, {
      headers: { apikey: SB_SVC(), Authorization: `Bearer ${SB_SVC()}` }
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    results.profiles_read = {
      status: r.status,
      ok: r.ok,
      isArray: Array.isArray(data),
      sample: Array.isArray(data) ? `${data.length} kayıt` : String(data).slice(0, 200),
    };
  } catch (e) {
    results.profiles_read = { error: e.message };
  }

  // 4. Test insert into user_analyses (then delete it)
  try {
    const testRow = {
      user_id: '00000000-0000-0000-0000-000000000000',
      coin: 'TEST',
      direction: 'LONG',
      entry_mid: 1.0,
      stop: 0.9,
      tp1: 1.1,
      tp2: 1.2,
      tp3: 1.3,
      result: 'OPEN',
      result_r: 0,
    };
    const r = await fetch(`${SB_URL()}/rest/v1/user_analyses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SB_SVC(),
        Authorization: `Bearer ${SB_SVC()}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(testRow),
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    results.table_insert = {
      status: r.status,
      ok: r.ok,
      response: Array.isArray(data)
        ? `Başarılı — ID: ${data[0]?.id}`
        : (typeof data === 'object' ? JSON.stringify(data).slice(0, 300) : String(data).slice(0, 300)),
    };

    // Clean up test row
    if (r.ok && Array.isArray(data) && data[0]?.id) {
      await fetch(`${SB_URL()}/rest/v1/user_analyses?id=eq.${data[0].id}`, {
        method: 'DELETE',
        headers: { apikey: SB_SVC(), Authorization: `Bearer ${SB_SVC()}` },
      }).catch(() => {});
      results.table_insert.cleaned = true;
    }
  } catch (e) {
    results.table_insert = { error: e.message };
  }

  const allOk = results.table_read?.ok && results.profiles_read?.ok && results.table_insert?.ok;
  return res.status(200).json({ ok: allOk, results });
}
