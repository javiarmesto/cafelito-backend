# CLAUDE.md — cafelito-backend

## Contexto del proyecto

Backend Node.js/Express para el agente de voz **Cafelito**, construido sobre **VocalBridge AI**.
Expone un endpoint seguro de generación de tokens LiveKit que el frontend React consume.
La API key de VocalBridge **nunca sale del backend** — el frontend solo recibe tokens de corta duración (1h).

Proyecto desarrollado por **Javier Armesto** (VS Sistemas) como showcase demo de VocalBridge AI + Business Central MCP.

---

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 20+ · ESM (`"type": "module"`) |
| Framework | Express 4 |
| CORS | `cors` package — whitelist por `ALLOWED_ORIGINS` |
| Rate limiting | `express-rate-limit` — 20 req/min por IP en `/api/voice-token` |
| Upstream | VocalBridge API v1 (`http://vocalbridgeai.com/api/v1/token`) |
| Session store | In-memory `Map` con auto-limpieza (swap a Redis si necesitas multi-instancia) |

---

## Estructura

```
src/
├── server.js                  # Entry point — Express + middlewares + rutas
├── routes/
│   ├── token.js               # POST /api/voice-token
│   └── sessions.js            # GET  /api/sessions (debug, protegido)
└── services/
    └── vocalbridge.js         # Wrapper VocalBridge API v1 + session store
.env.example                   # Variables de entorno requeridas
```

---

## Endpoints

### `POST /api/voice-token`
Genera token LiveKit para el agente Cafelito.

```bash
curl -X POST http://localhost:3001/api/voice-token \
  -H "Content-Type: application/json" \
  -d '{"participant_name": "Test"}'
```

Respuesta esperada:
```json
{
  "livekit_url": "wss://...",
  "token": "eyJ...",
  "room_name": "room-abc123",
  "participant_identity": "api-client-xyz",
  "expires_in": 3600
}
```

### `GET /health`
Health check. Verifica que la API key está configurada.

### `GET /api/sessions`
Lista sesiones activas. Requiere `Authorization: Bearer <SESSIONS_SECRET>` en producción.

---

## Variables de entorno

```bash
VOCAL_BRIDGE_API_KEY=vb_...        # ← REQUERIDA. API key agente Cafelito (del dashboard VocalBridge)
VOCAL_BRIDGE_TOKEN_URL=http://vocalbridgeai.com/api/v1/token  # default OK
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
SESSIONS_SECRET=                   # opcional — protege /api/sessions en producción
```

---

## Comandos

```bash
npm run dev      # desarrollo con hot reload (node --watch)
npm start        # producción
```

Verificación rápida al arrancar:
```
☕ Cafelito backend running
   → http://localhost:3001
   → API key:   ✓ set
   → Origins:   http://localhost:5173
```

Si aparece `✗ MISSING` en API key → revisar `.env`.

---

## VocalBridge — referencia API

- **Token endpoint**: `POST http://vocalbridgeai.com/api/v1/token`
- **Headers**: `X-API-Key`, `Content-Type: application/json`
- **Body**: `{ "participant_name": "string" }`
- **Token lifetime**: 3600 segundos (1 hora)
- **Docs**: https://vocalbridgeai.com/docs/developer-guide

El agente se llama **Cafelito**, mode `openai_concierge`, con greeting en español andaluz.

---

## Claude Code plugin (VocalBridge)

Si tienes el plugin instalado en Claude Code:

```bash
/plugin marketplace add vocalbridgeai/vocal-bridge-marketplace
/plugin install vocal-bridge@vocal-bridge
/vocal-bridge:login vb_tu_api_key
/vocal-bridge:status
```

Comandos útiles durante desarrollo:
```bash
/vocal-bridge:logs                        # ver llamadas recientes
/vocal-bridge:logs <session_id>           # transcript de una sesión
/vocal-bridge:debug                       # stream eventos en tiempo real
/vocal-bridge:prompt show                 # ver system prompt actual
/vocal-bridge:config show                 # ver configuración del agente
```

---

## Tareas pendientes / posibles mejoras

- [ ] Persistencia de sesiones con Redis (para multi-instancia / producción)
- [ ] Webhook receiver para eventos VocalBridge (transcript completed, tool call, etc.)
- [ ] Autenticación de usuarios antes de generar token (si se añade login)
- [ ] Rate limit por usuario autenticado en vez de por IP
- [ ] Tests con Vitest

---

## Convenciones

- ESM puro — usar `import/export`, nunca `require()`
- Errores siempre con `console.error('[módulo] mensaje:', err.message)`
- Nunca loguear el valor de `VOCAL_BRIDGE_API_KEY`
- El `.env` nunca va a git — está en `.gitignore`
