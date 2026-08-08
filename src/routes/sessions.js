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
import { requireSecret } from '../middleware/requireSecret.js'

const router = Router()

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
