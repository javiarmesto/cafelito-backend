# Cafelito Backend

Backend Node.js/Express para el agente de voz **Cafelito** sobre VocalBridge AI.

Expone un endpoint seguro de generación de tokens LiveKit que el widget frontend puede llamar sin exponer la API key.

---

## Estructura

```
cafelito-backend/
├── src/
│   ├── server.js              # Entry point — Express + middlewares
│   ├── routes/
│   │   ├── token.js           # POST /api/voice-token
│   │   └── sessions.js        # GET  /api/sessions (debug/monitor)
│   └── services/
│       └── vocalbridge.js     # Wrapper VocalBridge API v1
├── .env.example
├── package.json
└── README.md
```

---

## Setup rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar entorno
cp .env.example .env
# → editar .env con tu API key de VocalBridge

# 3. Arrancar en desarrollo (con hot reload)
npm run dev

# 4. Verificar
curl http://localhost:3001/health
```

---

## Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `VOCAL_BRIDGE_API_KEY` | ✅ | API key del agente Cafelito (desde el dashboard VocalBridge) |
| `VOCAL_BRIDGE_TOKEN_URL` | ❌ | URL del endpoint de tokens (default: `http://vocalbridgeai.com/api/v1/token`) |
| `PORT` | ❌ | Puerto del servidor (default: `3001`) |
| `NODE_ENV` | ❌ | `development` / `production` |
| `ALLOWED_ORIGINS` | ✅ | Orígenes CORS permitidos, separados por coma |
| `SESSIONS_SECRET` | ❌ | Bearer token para proteger `/api/sessions` en producción |

---

## Endpoints

### `POST /api/voice-token`

Genera un token LiveKit para conectar el widget al agente Cafelito.

**Request** (body opcional):
```json
{ "participant_name": "Juan" }
```

**Response**:
```json
{
  "livekit_url": "wss://tutor-j7bhwjbm.livekit.cloud",
  "token": "eyJhbGci...",
  "room_name": "room-abc123",
  "participant_identity": "api-client-xyz",
  "expires_in": 3600
}
```

**Rate limit**: 20 requests/minuto por IP.

---

### `GET /health`

Health check. Muestra configuración activa (sin exponer valores sensibles).

```json
{
  "status": "ok",
  "service": "cafelito-backend",
  "env": "development",
  "config": {
    "api_key_set": true,
    "allowed_origins": ["http://localhost:5173"]
  }
}
```

---

### `GET /api/sessions` _(debug)_

Lista las sesiones activas en memoria. Requiere `Authorization: Bearer <SESSIONS_SECRET>` en producción.

```json
{
  "count": 1,
  "sessions": [
    {
      "room_name": "room-abc123",
      "participant_name": "Juan",
      "started_at": "2026-04-24T10:00:00.000Z",
      "expires_at": "2026-04-24T11:00:00.000Z"
    }
  ]
}
```

---

## Integración con el widget React

El widget ya está configurado con `TOKEN_URL = '/api/voice-token'`.  
Si el frontend y el backend corren en orígenes distintos, actualiza `TOKEN_URL`:

```js
// cafelito-voice-widget.jsx
const TOKEN_URL = 'http://localhost:3001/api/voice-token'
```

Para producción, pon el backend detrás del mismo dominio o configura el proxy de Vite/Nginx.

---

## Producción (notas rápidas)

- Usa **PM2** o un proceso supervisor: `pm2 start src/server.js --name cafelito-backend`
- Pon el servidor detrás de **Nginx** o **Caddy** con HTTPS
- Sube `SESSIONS_SECRET` para proteger el endpoint de sesiones
- El store de sesiones es in-memory — si necesitas persistencia entre reinicios, sustituye `sessions` en `vocalbridge.js` por Redis
