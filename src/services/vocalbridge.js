// src/services/vocalbridge.js
// ─────────────────────────────────────────────
// Wrapper around VocalBridge API v1
// Handles token generation and lightweight
// in-memory session tracking
// ─────────────────────────────────────────────

const TOKEN_URL = process.env.VOCAL_BRIDGE_TOKEN_URL || 'http://vocalbridgeai.com/api/v1/token'
const API_KEY   = process.env.VOCAL_BRIDGE_API_KEY

// Simple in-memory session store
// In production replace with Redis or DB
const sessions = new Map()

/**
 * Request a LiveKit access token from VocalBridge.
 *
 * @param {string} participantName - Display name for the participant
 * @returns {Promise<{livekit_url, token, room_name, participant_identity, expires_in}>}
 */
export async function getToken(participantName = 'Cliente') {
  if (!API_KEY) {
    throw new Error('VOCAL_BRIDGE_API_KEY is not set')
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'X-API-Key':    API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ participant_name: participantName }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`VocalBridge API error ${response.status}: ${body}`)
  }

  const data = await response.json()

  // Track session locally
  sessions.set(data.room_name, {
    room_name:            data.room_name,
    participant_identity: data.participant_identity,
    participant_name:     participantName,
    started_at:          new Date().toISOString(),
    expires_at:          new Date(Date.now() + data.expires_in * 1000).toISOString(),
  })

  // Auto-clean expired sessions after token lifetime
  setTimeout(() => sessions.delete(data.room_name), data.expires_in * 1000)

  return data
}

/**
 * Return all currently tracked sessions.
 * @returns {Array}
 */
export function getSessions() {
  return Array.from(sessions.values())
}

/**
 * Return one session by room name.
 * @param {string} roomName
 * @returns {object|undefined}
 */
export function getSession(roomName) {
  return sessions.get(roomName)
}
