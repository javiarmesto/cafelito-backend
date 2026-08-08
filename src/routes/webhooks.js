// src/routes/webhooks.js
// ─────────────────────────────────────────────
// POST /api/webhooks/vocalbridge        → recibe eventos VocalBridge
// GET  /api/webhooks/vocalbridge/events → últimos eventos (debug, protegido)
//
// Si VOCAL_BRIDGE_WEBHOOK_SECRET está configurado, se verifica la
// firma HMAC-SHA256 del body (headers X-VocalBridge-Signature o
// X-Signature). Sin secret, se aceptan todos los eventos — solo
// recomendable en desarrollo.
// ─────────────────────────────────────────────

import { Router } from 'express'
import { verifySignature, recordEvent, getEvents } from '../services/webhooks.js'
import { recordSessionEvent } from '../services/vocalbridge.js'
import { requireSecret } from '../middleware/requireSecret.js'

const router = Router()

// POST /api/webhooks/vocalbridge
router.post('/vocalbridge', (req, res) => {
  const secret = process.env.VOCAL_BRIDGE_WEBHOOK_SECRET

  if (secret) {
    const signature =
      req.get('x-vocalbridge-signature') || req.get('x-signature') || ''
    if (!verifySignature(req.rawBody, signature, secret)) {
      console.error('[webhooks] Invalid signature — event rejected')
      return res.status(401).json({ error: 'Invalid signature' })
    }
  }

  const event = recordEvent(req.body)
  console.log(`[webhooks] Event #${event.id} received: ${event.type}${event.session_id ? ` (session ${event.session_id})` : ''}`)

  // Vincular con la sesión trackeada si existe
  if (event.session_id) {
    recordSessionEvent(event.session_id, event.type)
  }

  res.status(202).json({ received: true, id: event.id })
})

// GET /api/webhooks/vocalbridge/events?limit=20
router.get('/vocalbridge/events', requireSecret, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100)
  const events = getEvents(limit)
  res.json({ count: events.length, events })
})

export default router
