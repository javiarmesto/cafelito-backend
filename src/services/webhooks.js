// src/services/webhooks.js
// ─────────────────────────────────────────────
// VocalBridge webhook events — verificación de
// firma HMAC + almacenamiento in-memory (ring
// buffer). Swap a Redis/DB para producción.
// ─────────────────────────────────────────────

import crypto from 'node:crypto'

const MAX_EVENTS = 100

// Ring buffer de eventos recibidos (el más reciente primero)
const events = []
let nextId = 1

/**
 * Verify an HMAC-SHA256 webhook signature.
 * Accepts both raw hex digests and the "sha256=<hex>" format.
 *
 * @param {Buffer|string} rawBody  - Raw request body as received
 * @param {string} signature      - Signature header value
 * @param {string} secret         - Shared webhook secret
 * @returns {boolean}
 */
export function verifySignature(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) return false

  const provided = signature.startsWith('sha256=')
    ? signature.slice('sha256='.length)
    : signature

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  const providedBuf = Buffer.from(provided, 'hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  if (providedBuf.length !== expectedBuf.length) return false

  return crypto.timingSafeEqual(providedBuf, expectedBuf)
}

/**
 * Normalize and store an incoming webhook event.
 * Event shape varies by type, so common fields are extracted defensively.
 *
 * @param {object} payload - Parsed webhook body
 * @returns {object} The stored event record
 */
export function recordEvent(payload = {}) {
  const record = {
    id:          nextId++,
    received_at: new Date().toISOString(),
    type:        payload.type || payload.event || 'unknown',
    session_id:  payload.session_id || payload.room_name || payload.data?.session_id || null,
    payload,
  }

  events.unshift(record)
  if (events.length > MAX_EVENTS) events.pop()

  return record
}

/**
 * Return stored events, most recent first.
 * @param {number} [limit]
 * @returns {Array}
 */
export function getEvents(limit = MAX_EVENTS) {
  return events.slice(0, limit)
}

/** Clear all stored events (used by tests). */
export function clearEvents() {
  events.length = 0
  nextId = 1
}
