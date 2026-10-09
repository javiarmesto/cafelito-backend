import { describe, it, expect } from 'vitest'
import { loadCatalog } from '../src/services/catalog.js'

describe('procedencia real del catálogo', () => {
  it('una respuesta servida ahora no cambia la fecha ni convierte el snapshot en vivo', () => {
    const result = loadCatalog()
    expect(result.provenance).toEqual({ type: 'snapshot', live: false })
    expect(result.generated_at).toBe('2026-08-08T09:40:00Z')
    expect(result.source).toContain('snapshot manual')
    expect(result.items).toHaveLength(16)
  })
})
