// src/server.js
// ─────────────────────────────────────────────
// Cafelito VocalBridge Backend
// Express server — token endpoint + session monitor
// ─────────────────────────────────────────────

import 'dotenv/config'
import express          from 'express'
import cors             from 'cors'
import { rateLimit }    from 'express-rate-limit'
import tokenRouter      from './routes/token.js'
import sessionsRouter   from './routes/sessions.js'

const app  = express()
const PORT = process.env.PORT || 3001
const ENV  = process.env.NODE_ENV || 'development'

// ── CORS ──────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server (no origin) or whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  methods: ['GET', 'POST'],
}))

// ── Body parser ───────────────────────────────
app.use(express.json({ limit: '8kb' }))

// ── Rate limiting ─────────────────────────────
// Token endpoint: max 20 tokens/minute per IP
// (each token is good for 1 hour, so this is generous)
const tokenLimiter = rateLimit({
  windowMs:         60 * 1000,  // 1 minute
  max:              20,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: 'Too many token requests, slow down' },
})

// ── Routes ────────────────────────────────────
app.use('/api/voice-token', tokenLimiter, tokenRouter)
app.use('/api/sessions',    sessionsRouter)

// ── Health check ──────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:  'ok',
    service: 'cafelito-backend',
    env:     ENV,
    time:    new Date().toISOString(),
    config: {
      vocalbridge_url:    process.env.VOCAL_BRIDGE_TOKEN_URL || 'https://vocalbridgeai.com/api/v1/token',
      api_key_set:        !!process.env.VOCAL_BRIDGE_API_KEY,
      allowed_origins:    allowedOrigins,
    },
  })
})

// ── 404 ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` })
})

// ── Error handler ─────────────────────────────
app.use((err, req, res, _next) => {
  if (err.message?.startsWith('CORS')) {
    return res.status(403).json({ error: err.message })
  }
  console.error('[server] Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// ── Start ─────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n☕ Cafelito backend running`)
  console.log(`   → http://localhost:${PORT}`)
  console.log(`   → ENV:       ${ENV}`)
  console.log(`   → API key:   ${process.env.VOCAL_BRIDGE_API_KEY ? '✓ set' : '✗ MISSING'}`)
  console.log(`   → Origins:   ${allowedOrigins.join(', ') || '(none — set ALLOWED_ORIGINS)'}`)
  console.log()
})
