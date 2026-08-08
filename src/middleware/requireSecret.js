// src/middleware/requireSecret.js
// ─────────────────────────────────────────────
// Bearer-token guard con SESSIONS_SECRET.
// Sin secret configurado: abierto en desarrollo,
// bloqueado en producción.
// ─────────────────────────────────────────────

export function requireSecret(req, res, next) {
  const secret = process.env.SESSIONS_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Endpoint disabled in production without SESSIONS_SECRET' })
    }
    return next()
  }
  const auth = req.headers.authorization || ''
  if (auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}
