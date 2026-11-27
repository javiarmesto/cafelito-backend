import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createReleases } from '../src/services/releases.js'

const id = '00112233-4455-6677-8899-aabbccddeeff'
const other = '11223344-5566-7788-99aa-bbccddeeff00'
const env = { BC_TENANT_ID: id, BC_COMPANY_ID: other, BC_ENVIRONMENT: 'Sandbox',
  BC_CLIENT_ID: 'test', BC_CLIENT_SECRET: 'test', BC_BAG_250G_UOM: 'BAG250' }
const coffee = { id, number: 'TEST-COFFEE', displayName: 'Café de ensayo', displayName2: 'Tueste medio',
  itemCategoryCode: 'CAFELITO', type: 'Inventory', blocked: false, unitPrice: 18.5,
  priceIncludesTax: false, inventory: 0, baseUnitOfMeasureCode: 'BAG250' }

function setup(handle) {
  return createReleases(env, async (input, options) => {
    const url = new URL(input)
    if (url.hostname === 'login.microsoftonline.com') return Response.json({ access_token: 'test', expires_in: 3600 })
    assert.equal(options.headers.Authorization, 'Bearer test')
    return handle(url)
  })
}

test('publishes the approved bag and exact USD price with zero stock; filters private, blocked and wrong-unit items', async () => {
  let calls = 0
  const service = setup(url => {
    calls++
    assert.match(url.searchParams.get('$filter'), /CAFELITO/)
    return Response.json({ value: [coffee, { ...coffee, blocked: true }, { ...coffee, itemCategoryCode: 'PRIVATE' },
      { ...coffee, baseUnitOfMeasureCode: 'KG' }, { ...coffee, unitPrice: 0 }] })
  })
  const [a, b] = await Promise.all([service.list(), service.list()])
  assert.equal(calls, 1)
  assert.deepEqual(a, b)
  assert.deepEqual(a.items, [{ id, number: coffee.number, name: coffee.displayName, description: coffee.displayName2,
    price: 18.5, currency: 'USD', unit: 'bolsa de 250 g', includesTax: false, stock: 0,
    picture: '/api/catalog/releases/' + id + '/picture' }])
  assert.equal(await service.picture(other), null)
  assert.equal(calls, 1)
})

test('follows a same-company next page and reads its picture', async () => {
  const bytes = new Uint8Array([255,216,255,217])
  const service = setup(url => {
    if (url.pathname.endsWith('/content')) return new Response(bytes, { headers: { 'Content-Type': 'image/jpeg' } })
    if (url.pathname.endsWith('/picture')) return Response.json({ 'pictureContent@odata.mediaReadLink': url.href + '(' + id + ')/content' })
    if (url.searchParams.has('next')) return Response.json({ value: [coffee] })
    return Response.json({ value: [], '@odata.nextLink': url.pathname + '?next=2' })
  })
  const image = await service.picture(id)
  assert.equal(image.type, 'image/jpeg')
  assert.deepEqual(image.bytes, Buffer.from(bytes))
})

test('rejects a continuation pointing outside the configured company', async () => {
  const service = setup(() => Response.json({ value: [], '@odata.nextLink': 'https://example.org/items' }))
  await assert.rejects(service.list(), /continuation/)
})

test('an unavailable ERP can recover on the next refresh', async () => {
  let fails = true
  const service = setup(() => fails ? new Response(null, { status: 503 }) : Response.json({ value: [] }))
  await assert.rejects(service.list(), /unavailable/)
  fails = false
  assert.deepEqual((await service.list()).items, [])
})

test('a missing picture leaves the item visible', async () => {
  const service = setup(url => url.pathname.endsWith('/picture') ? new Response(null, { status: 404 }) : Response.json({ value: [coffee] }))
  assert.equal(await service.picture(id), null)
  assert.equal((await service.list()).items.length, 1)
})
