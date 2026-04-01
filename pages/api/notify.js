// pages/api/notify.js — Telegram upgrade notification
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, plan, email, coin } = req.body || {};
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChat = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHANNEL;

  if (!token || !adminChat) {
    return res.status(200).json({ ok: true }); // silently succeed if not configured
  }

  let text = '';
  if (type === 'upgrade') {
    text = `🚀 *UPGRADE TALEBİ*\n\n👤 Kullanıcı: \`${email || 'anonim'}\`\n💎 Seçilen Plan: *${(plan || '').toUpperCase()}*\n\n📩 @DeepTradeScanner`;
  } else if (type === 'limit') {
    text = `⚠️ *LİMİT DOLDU*\n\n👤 Kullanıcı: \`${email || 'anonim'}\`\n📊 Son Analiz: ${coin || '—'}\n\n💬 Upgrade için @DeepTradeScanner ile iletişime geç.`;
  } else {
    return res.status(400).json({ error: 'Invalid type' });
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: adminChat, text, parse_mode: 'Markdown' }),
    });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(200).json({ ok: true }); // non-blocking
  }
}
