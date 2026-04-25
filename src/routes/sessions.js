// src/routes/sessions.js
// ─────────────────────────────────────────────
// GET  /api/sessions       → list active sessions
// GET  /api/sessions/:room → detail for one session
//
// Protected by SESSIONS_SECRET env var.
// Only expose in development or internal networks.
// ─────────────────────────────────────────────

import { Router } from 'express'
import { getSessions, getSession } from '../services/vocalbridge.js'

const router = Router()

// Simple bearer-token guard
function requireSecret(req, res, next) {
  const secret = process.env.SESSIONS_SECRET
  if (!secret) {
    // If no secret configured, block in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Sessions endpoint disabled in production without SESSIONS_SECRET' })
    }
    return next()
  }
  const auth = req.headers.authorization || ''
  if (auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

// GET /api/sessions
router.get('/', requireSecret, (req, res) => {
  const sessions = getSessions()
  res.json({
    count: sessions.length,
    sessions,
  })
})

// GET /api/sessions/:room
router.get('/:room', requireSecret, (req, res) => {
  const session = getSession(req.params.room)
  if (!session) {
    return res.status(404).json({ error: 'Session not found' })
  }
  res.json(session)
})

export default router
