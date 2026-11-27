// src/routes/catalog.js
// ─────────────────────────────────────────────
// GET /api/catalog → catálogo con stock/precio de
// Business Central para que el frontend no muestre
// datos inventados.
//
// Fuente actual: snapshot estático generado desde el
// MCP ATICO (get-items). Cuando el backend tenga
// credenciales de la API de BC (o un endpoint HTTP del
// MCP), sustituir loadCatalog() por la llamada real
// manteniendo el mismo shape de respuesta.
// ─────────────────────────────────────────────

import { Router } from 'express'
import { loadCatalog } from '../services/catalog.js'

import { createReleases } from '../services/releases.js'

const router = Router()
let releases

router.get(['/releases', '/releases/:id/picture'], async (req, res) => {
  res.set('Cache-Control', 'no-store')
  if (process.env.BC_RELEASES_ENABLED !== 'true') return res.sendStatus(404)
  try {
    releases ??= createReleases(process.env)
    if (!req.params.id) return res.json(await releases.list())
    const picture = await releases.picture(req.params.id)
    if (!picture) return res.sendStatus(404)
    res.set('X-Content-Type-Options', 'nosniff')
    return res.type(picture.type).send(picture.bytes)
  } catch (error) {
    console.error('[releases]', error.message)
    return res.status(503).json({ error: 'Business Central catalog unavailable' })
  }
})

// GET /api/catalog
router.get('/', (req, res) => {
  try {
    const catalog = loadCatalog()
    res.set('Cache-Control', 'public, max-age=300')
    res.json(catalog)
  } catch (err) {
    console.error('[catalog] Error:', err.message)
    res.status(500).json({ error: 'Catalog unavailable' })
  }
})

export default router
