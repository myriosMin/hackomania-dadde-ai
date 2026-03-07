/**
 * Step 11 – List all incoming payments on the receiver wallet.
 *
 * Powers the contribution feed in Dadde's fund — lets the AI agent verify
 * a claimant's contribution history before evaluating their claim, and drives
 * the ClickHouse real-time contribution dashboard.
 *
 * Usage:
 *   npm run incoming:list                            (reads env vars)
 *   npm run incoming:list -- <access-token>
 *
 * Requires RECEIVER_WALLET_ADDRESS and INCOMING_PAYMENT_ACCESS_TOKEN (from step 02).
 */
import { client } from './client.js'
import { requireEnv } from './config.js'

const accessToken    = process.argv[2] ?? requireEnv('INCOMING_PAYMENT_ACCESS_TOKEN')
const receiverWalletUrl = requireEnv('RECEIVER_WALLET_ADDRESS')

const receiverWallet = await client.walletAddress.get({ url: receiverWalletUrl })

const result = await client.incomingPayment.list(
  {
    url: receiverWallet.resourceServer,
    walletAddress: receiverWallet.id,
    accessToken
  },
  { first: 20 }
)

const payments = result.result ?? []
console.log(`Found ${payments.length} incoming payment(s) on ${receiverWallet.id}`)
for (const p of payments) {
  const received = p.receivedAmount?.value ?? '?'
  const asset    = p.receivedAmount?.assetCode ?? ''
  console.log(`  ${p.id}  received=${received} ${asset}  completed=${p.completed}  expiresAt=${p.expiresAt}`)
}
if (result.pagination?.hasNextPage) {
  console.log('  … more pages available (use cursor to paginate)')
}
