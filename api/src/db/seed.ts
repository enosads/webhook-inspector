import { faker } from '@faker-js/faker'
import { db } from '@/db/index'
import { webhooks } from '@/db/schema'

function randomStripeEventType() {
  const events = [
    'payment_intent.created',
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'payment_intent.canceled',
    'charge.succeeded',
    'charge.failed',
    'charge.refunded',
    'charge.captured',
    'customer.created',
    'customer.updated',
    'customer.deleted',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.created',
    'invoice.finalized',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'invoice.paid',
    'invoice.voided',
    'invoice.marked_uncollectible',
    'invoice.upcoming',
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'checkout.session.async_payment_failed',
    'payout.paid',
    'payout.failed',
  ] as const
  return faker.helpers.arrayElement(events)
}

function makeStripeEventPayload(id: string, type: string) {
  const created = faker.date.recent({ days: 90 }).getTime() / 1000 // seconds
  const livemode = faker.datatype.boolean()
  return {
    id,
    object: 'event',
    api_version: '2024-06-20',
    created,
    data: {
      object: {
        id: `pi_${faker.string.alphanumeric({ length: 24 }).toLowerCase()}`,
        object: type.startsWith('invoice')
          ? 'invoice'
          : type.startsWith('charge')
            ? 'charge'
            : type.startsWith('checkout')
              ? 'checkout.session'
              : type.startsWith('customer')
                ? 'customer'
                : 'payment_intent',
        amount: faker.number.int({ min: 500, max: 50000 }),
        currency: faker.finance.currencyCode().toLowerCase(),
        status: faker.helpers.arrayElement([
          'succeeded',
          'requires_payment_method',
          'processing',
          'failed',
          'paid',
          'open',
        ]),
        customer: `cus_${faker.string.alphanumeric({ length: 14 }).toLowerCase()}`,
      },
    },
    livemode,
    pending_webhooks: faker.number.int({ min: 0, max: 1 }),
    request: {
      id: null,
      idempotency_key: faker.string.alphanumeric({ length: 24 }),
    },
    type,
  }
}

function buildHeaders(stripeSignature: string, contentType: string) {
  return {
    'user-agent': `Stripe/1.0 (+https://stripe.com/docs/webhooks)`,
    'stripe-signature': stripeSignature,
    'content-type': contentType,
    accept: '*/*',
    host: faker.internet.domainName(),
    connection: 'close',
  } as Record<string, string>
}

async function seed() {
  const count = 75 // at least 60
  const rows: Array<typeof webhooks.$inferInsert> = []

  for (let i = 0; i < count; i++) {
    const type = randomStripeEventType()
    const eventId = `evt_${faker.string.alphanumeric({ length: 24 }).toLowerCase()}`
    const payload = makeStripeEventPayload(eventId, type)
    const body = JSON.stringify(payload)

    const contentType = 'application/json'
    const sigTimestamp =
      Math.floor(Date.now() / 1000) -
      faker.number.int({ min: 0, max: 60 * 60 * 24 * 30 })
    const signature =
      `t=${sigTimestamp},` +
      `v1=${faker.string.hexadecimal({ length: 64, casing: 'lower' }).slice(2)},` +
      `v0=${faker.string.hexadecimal({ length: 32, casing: 'lower' }).slice(2)}`

    const pathname = faker.helpers.arrayElement([
      '/webhooks/stripe',
      '/api/webhooks/stripe',
      '/stripe/webhooks',
    ])

    rows.push({
      method: 'POST',
      pathname,
      ip: faker.internet.ip(),
      statusCode:
        faker.helpers.maybe(() => faker.number.int({ min: 200, max: 204 }), {
          probability: 0.9,
        }) ?? 200,
      contentType,
      contentLength: Buffer.byteLength(body, 'utf8'),
      queryParams: faker.helpers.maybe(
        () => ({
          attempt: String(faker.number.int({ min: 1, max: 3 })),
          retry: faker.helpers.arrayElement(['true', 'false']),
        }),
        { probability: 0.2 },
      ),
      headers: buildHeaders(signature, contentType),
      body,
      createdAt: faker.date.recent({ days: 90 }),
    })
  }

  // Insert in chunks to avoid exceeding parameter limits
  const chunkSize = 25
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    await db.insert(webhooks).values(chunk)
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${rows.length} webhook(s) into the database.`)
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err)
  process.exitCode = 1
})
