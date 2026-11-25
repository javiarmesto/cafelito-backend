// Read the public assortment from one Business Central company.
const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const origin = 'https://api.businesscentral.dynamics.com'
const category = 'CAFELITO'
const pictureTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const maxPictureBytes = 5 * 1024 * 1024

export function createReleases(env, request = fetch) {
  const tenant = env.BC_TENANT_ID
  const company = env.BC_COMPANY_ID
  if (!guid.test(tenant) || !guid.test(company) || !env.BC_CLIENT_ID ||
      !env.BC_CLIENT_SECRET || !env.BC_ENVIRONMENT || !env.BC_BAG_250G_UOM) {
    throw new Error('Incomplete Business Central releases configuration')
  }
  const root = origin + '/v2.0/' + tenant + '/' + encodeURIComponent(env.BC_ENVIRONMENT) +
    '/api/v2.0/companies(' + company + ')'
  const itemsUrl = root + '/items'
  let token, tokenUntil = 0, snapshot, refresh, expires = 0

  async function read(url) {
    if (!token || Date.now() >= tokenUntil) {
      const response = await request('https://login.microsoftonline.com/' + tenant + '/oauth2/v2.0/token', {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
        body: new URLSearchParams({ client_id: env.BC_CLIENT_ID, client_secret: env.BC_CLIENT_SECRET,
          scope: origin + '/.default', grant_type: 'client_credentials' }),
      })
      if (!response.ok) throw new Error('Business Central authorization failed')
      const data = await response.json()
      if (!data.access_token) throw new Error('No Business Central token')
      token = data.access_token
      tokenUntil = Date.now() + Math.max(0, Number(data.expires_in) - 60) * 1000
    }
    const response = await request(url, { redirect: 'error', signal: AbortSignal.timeout(12000),
      headers: { Authorization: 'Bearer ' + token } })
    if (response.status === 401) tokenUntil = 0
    return response
  }

  async function collect() {
    let page = new URL(itemsUrl)
    page.searchParams.set('$filter', "itemCategoryCode eq 'CAFELITO' and blocked eq false")
    page.searchParams.set('$select', 'id,number,displayName,displayName2,itemCategoryCode,type,blocked,unitPrice,priceIncludesTax,inventory,baseUnitOfMeasureCode')
    const seen = new Set(), items = []
    while (page) {
      if (page.origin !== origin || page.pathname !== new URL(itemsUrl).pathname || seen.has(page.href)) {
        throw new Error('Invalid Business Central continuation')
      }
      seen.add(page.href)
      const res = await read(page)
      if (!res.ok) throw new Error('Business Central items unavailable')
      const data = await res.json()
      if (!Array.isArray(data.value)) throw new Error('Invalid items response')
      for (const row of data.value) {
        if (row.itemCategoryCode !== category || row.blocked !== false || row.type !== 'Inventory' ||
            row.baseUnitOfMeasureCode !== env.BC_BAG_250G_UOM || !guid.test(row.id) ||
            !row.number || !row.displayName || !Number.isFinite(row.inventory) ||
            !Number.isFinite(row.unitPrice) || row.unitPrice <= 0) continue
        items.push({ id: row.id, number: row.number, name: row.displayName, description: row.displayName2 || '',
          price: row.unitPrice, currency: 'USD', unit: 'bolsa de 250 g', includesTax: row.priceIncludesTax === true,
          stock: row.inventory, picture: '/api/catalog/releases/' + row.id + '/picture' })
      }
      page = data['@odata.nextLink'] ? new URL(data['@odata.nextLink'], page) : null
    }
    return { items, generated_at: new Date().toISOString(), source: 'Business Central' }
  }

  async function list() {
    if (snapshot && Date.now() < expires) return snapshot
    if (!refresh) refresh = collect().then(data => {
      snapshot = data
      expires = Date.now() + 10000
      return data
    }).finally(() => { refresh = null })
    return refresh
  }

  async function picture(id) {
    if (!guid.test(id) || !(await list()).items.some(item => item.id === id)) return null
    const item = itemsUrl + '(' + id + ')/picture'
    const meta = await read(item)
    if (meta.status === 404 || meta.status === 204) return null
    if (!meta.ok) throw new Error('Business Central picture unavailable')
    const data = await meta.json()
    const link = data['pictureContent@odata.mediaReadLink'] || data['content@odata.mediaReadLink']
    if (!link) return null
    const url = new URL(link, item)
    const prefix = new URL(item).pathname
    if (url.origin !== origin || !(url.pathname.startsWith(prefix + '(') || url.pathname.startsWith(prefix + '/'))) {
      throw new Error('Invalid Business Central image URL')
    }
    const res = await read(url)
    if (res.status === 404 || res.status === 204) return null
    if (!res.ok) throw new Error('Business Central picture download failed')
    const contentType = (res.headers.get('content-type') || '').split(';')[0]
    const type = contentType === 'application/octet-stream' ? data.contentType : contentType
    if (!pictureTypes.has(type) || Number(res.headers.get('content-length')) > maxPictureBytes) {
      await res.body?.cancel()
      return null
    }
    const chunks = []
    let size = 0
    for await (const chunk of res.body) {
      size += chunk.length
      if (size > maxPictureBytes) return null
      chunks.push(chunk)
    }
    return size ? { type, bytes: Buffer.concat(chunks) } : null
  }

  return { list, picture }
}
