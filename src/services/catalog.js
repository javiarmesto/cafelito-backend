import { readFileSync } from 'node:fs'

export function loadCatalog() {
  const catalog = JSON.parse(readFileSync(new URL('../data/catalog-snapshot.json', import.meta.url), 'utf8'))
  return {
    ...catalog,
    provenance: { type: 'snapshot', live: false },
  }
}
