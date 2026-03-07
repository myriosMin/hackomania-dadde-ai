/**
 * Step 12 – Get a specific incoming payment by URL (authenticated).
 *
 * Used by the AI agent to confirm a donation was received before factoring it
 * into a claim evaluation — anti-fraud check for Dadde's fund.
 *
 * Usage:
 *   npm run incoming:get                            (reads env vars)
 *   npm run incoming:get -- <url> <access-token>
 *
 * Requires INCOMING_PAYMENT_URL and INCOMING_PAYMENT_ACCESS_TOKEN.
 */
import { client } from './client.js'
import { requireEnv } from './config.js'

const url         = process.argv[2] ?? requireEnv('INCOMING_PAYMENT_URL')
const accessToken = process.argv[3] ?? requireEnv('INCOMING_PAYMENT_ACCESS_TOKEN')

const payment = await client.incomingPayment.get({ url, accessToken })

console.log('Incoming payment URL:  ', payment.id)
console.log('Wallet address:        ', payment.walletAddress)
console.log('Incoming amount:       ', payment.incomingAmount?.value, payment.incomingAmount?.assetCode)
console.log('Received amount:       ', payment.receivedAmount?.value, payment.receivedAmount?.assetCode)
console.log('Completed:             ', payment.completed)
console.log('Expires at:            ', payment.expiresAt)
console.log('Created at:            ', payment.createdAt)
