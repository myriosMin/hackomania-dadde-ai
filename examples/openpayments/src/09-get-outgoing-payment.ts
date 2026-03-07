/**
 * Step 9 – Get a specific outgoing payment by URL.
 *
 * Use this after step 07 to confirm a payout succeeded before logging it to
 * ClickHouse as confirmed. The `failed` flag and `sentAmount` are the key fields.
 *
 * Usage:
 *   npm run outgoing:get                         (reads OUTGOING_PAYMENT_URL from .env)
 *   npm run outgoing:get -- <url> <access-token> (override via CLI)
 */
import { client } from './client.js'
import { requireEnv } from './config.js'

const url          = process.argv[2] ?? requireEnv('OUTGOING_PAYMENT_URL')
const accessToken  = process.argv[3] ?? requireEnv('OUTGOING_ACCESS_TOKEN')

const payment = await client.outgoingPayment.get({ url, accessToken })

console.log('Outgoing payment URL:  ', payment.id)
console.log('State (failed):        ', payment.failed)
console.log('Sent amount:           ', payment.sentAmount?.value, payment.sentAmount?.assetCode)
console.log('Debit amount:          ', payment.debitAmount?.value, payment.debitAmount?.assetCode)
console.log('Receive amount:        ', payment.receiveAmount?.value, payment.receiveAmount?.assetCode)
console.log('Created at:            ', payment.createdAt)
console.log('Updated at:            ', payment.updatedAt)
