// test/webhooks.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import crypto from 'node:crypto'
import { verifySignature, recordEvent, getEvents, clearEvents } from '../src/services/webhooks.js'

const SECRET = 'test-secret'

function sign(body, secret = SECRET) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

describe('verifySignature', () => {
  const body = Buffer.from(JSON.stringify({ type: 'transcript.completed' }))

  it('accepts a valid hex signature', () => {
    expect(verifySignature(body, sign(body), SECRET)).toBe(true)
  })

  it('accepts the sha256= prefixed format', () => {
    expect(verifySignature(body, `sha256=${sign(body)}`, SECRET)).toBe(true)
  })

  it('rejects a signature made with another secret', () => {
    expect(verifySignature(body, sign(body, 'wrong'), SECRET)).toBe(false)
  })

  it('rejects a tampered body', () => {
    const tampered = Buffer.from(JSON.stringify({ type: 'other' }))
    expect(verifySignature(tampered, sign(body), SECRET)).toBe(false)
  })

  it('rejects missing signature, body or secret', () => {
    expect(verifySignature(body, '', SECRET)).toBe(false)
    expect(verifySignature(null, sign(body), SECRET)).toBe(false)
    expect(verifySignature(body, sign(body), '')).toBe(false)
  })

  it('rejects malformed (non-hex / wrong length) signatures without throwing', () => {
    expect(verifySignature(body, 'not-hex', SECRET)).toBe(false)
    expect(verifySignature(body, 'abcd', SECRET)).toBe(false)
  })
})

describe('event store', () => {
  beforeEach(() => clearEvents())

  it('normalizes type and session_id from varying payload shapes', () => {
    expect(recordEvent({ type: 'call.ended', session_id: 's-1' })).toMatchObject({ type: 'call.ended', session_id: 's-1' })
    expect(recordEvent({ event: 'tool.called', room_name: 'room-9' })).toMatchObject({ type: 'tool.called', session_id: 'room-9' })
    expect(recordEvent({ data: { session_id: 's-3' } })).toMatchObject({ type: 'unknown', session_id: 's-3' })
    expect(recordEvent({})).toMatchObject({ type: 'unknown', session_id: null })
  })

  it('returns events most recent first and honors limit', () => {
    recordEvent({ type: 'a' })
    recordEvent({ type: 'b' })
    recordEvent({ type: 'c' })
    const events = getEvents(2)
    expect(events).toHaveLength(2)
    expect(events[0].type).toBe('c')
    expect(events[1].type).toBe('b')
  })

  it('caps the buffer at 100 events', () => {
    for (let i = 0; i < 120; i++) recordEvent({ type: `e${i}` })
    const events = getEvents()
    expect(events).toHaveLength(100)
    expect(events[0].type).toBe('e119')
    expect(events[99].type).toBe('e20')
  })
})
