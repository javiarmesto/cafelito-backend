// src/routes/token.js
// ─────────────────────────────────────────────
// POST /api/voice-token
// Returns a LiveKit access token for the
// Cafelito VocalBridge agent.
// ─────────────────────────────────────────────

import { Router } from 'express'
import { getToken } from '../services/vocalbridge.js'

const router = Router()

/**
 * POST /api/voice-token
 *
 * Body (optional JSON):
 *   { "participant_name": "Juan" }
 *
 * Response:
 *   {
 *     "livekit_url": "wss://...",
 *     "token": "eyJ...",
 *     "room_name": "room-abc123",
 *     "participant_identity": "api-client-xyz",
 *     "expires_in": 3600
 *   }
 */
router.post('/', async (req, res) => {
  try {
    const participantName = req.body?.participant_name?.trim() || 'Cliente'

    // Basic validation — no special chars, max 50 chars
    if (participantName.length > 50 || /[<>&"']/.test(participantName)) {
      return res.status(400).json({ error: 'Invalid participant_name' })
    }

    const tokenData = await getToken(participantName)
    return res.json(tokenData)

  } catch (err) {
    console.error('[token] Error:', err.message)

    if (err.message.includes('VOCAL_BRIDGE_API_KEY')) {
      return res.status(500).json({ error: 'Server misconfiguration: missing API key' })
    }

    if (err.message.includes('VocalBridge API error')) {
      return res.status(502).json({ error: 'VocalBridge upstream error', detail: err.message })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
