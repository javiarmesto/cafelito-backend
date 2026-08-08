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
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SNAPSHOT_PATH = fileURLToPath(new URL('../data/catalog-snapshot.json', import.meta.url))

const router = Router()

function loadCatalog() {
  return JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'))
}

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
