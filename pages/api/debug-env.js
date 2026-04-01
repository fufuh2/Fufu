// Debug endpoint — production'da sadece admin secret ile erişilebilir
export default function handler(req, res) {
  const secret = req.headers['x-internal-secret'] || req.query.secret;
  const expected = process.env.INTERNAL_SECRET;

  if (!expected || secret !== expected) {
    return res.status(404).json({ error: 'Not found.' });
  }

  res.json({
    HAS_SB_URL:      !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    HAS_SB_ANON:     !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    HAS_SB_SVC:      !!process.env.SUPABASE_SERVICE_KEY,
    HAS_TG_TOKEN:    !!process.env.TELEGRAM_BOT_TOKEN,
    HAS_TG_CHANNEL:  !!process.env.TELEGRAM_CHANNEL,
    HAS_CRON_SECRET: !!process.env.CRON_SECRET,
    NODE_ENV:        process.env.NODE_ENV,
  });
}
