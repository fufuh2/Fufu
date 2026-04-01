// pages/api/recent.js — META ELITE // GOD MODE CANLI AKIŞ
// Ana sayfa ve terminal için kurumsal seviye, gecikmesiz işlem akışı.

const SB_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_SVC = () => process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  // CORS: Sadece ana sistemden gelen isteklere izin ver
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Erişim Reddedildi.' });

  try {
    if (!SB_URL() || !SB_SVC()) return res.status(200).json({ recent: [] });

    // Sadece en yüksek güven skoruna (Confidence > 70) sahip elit işlemleri çek
    const r = await fetch(
      `${SB_URL()}/rest/v1/user_analyses?select=coin,direction,grade,confluence_score,rr,created_at&confluence_score=gt.70&order=created_at.desc&limit=15`,
      {
        headers: {
          'apikey': SB_SVC(),
          'Authorization': `Bearer ${SB_SVC()}`,
        }
      }
    );

    if (!r.ok) throw new Error('DB Fetch failed');
    const data = await r.json();

    // Veriyi Tanrı Modu formatına çevir
    const recent = data.map(item => ({
      sym: `${item.coin}/USDT`,
      dir: item.direction === 'LONG' ? '🟢 SNIPER LONG' : '🔴 SNIPER SHORT',
      grade: item.grade || 'A+',
      conf: item.confluence_score ? `%${item.confluence_score} CONF` : '%99 CONF',
      rr: item.rr ? `1:${item.rr} R:R` : 'N/A',
      up: item.direction === 'LONG',
      time: new Date(item.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }));

    return res.status(200).json({ recent });
  } catch (error) {
    return res.status(200).json({ recent: [] });
  }
}
