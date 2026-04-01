export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  res.status(200).json({
    status: 'ok',
    service: 'deeptradescan',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
