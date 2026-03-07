/**
 * Step 13 – Complete (close) an incoming payment.
 *
 * Explicitly marks an incoming payment as complete so no further funds are
 * accepted. Use this to close a donation round or surge-drive payment window
 * in Dadde's fund once the target is met.
 *
 * Usage:
 *   npm run incoming:complete                       (reads env vars)
 *   npm run incoming:complete -- <url> <access-token>
 *
 * Requires INCOMING_PAYMENT_URL and INCOMING_PAYMENT_ACCESS_TOKEN.
 */
import { client } from './client.js'
import { requireEnv } from './config.js'

const url         = process.argv[2] ?? requireEnv('INCOMING_PAYMENT_URL')
const accessToken = process.argv[3] ?? requireEnv('INCOMING_PAYMENT_ACCESS_TOKEN')

const payment = await client.incomingPayment.complete({ url, accessToken })

console.log('Incoming payment completed.')
console.log('URL:             ', payment.id)
console.log('Completed:       ', payment.completed)
console.log('Received amount: ', payment.receivedAmount?.value, payment.receivedAmount?.assetCode)
