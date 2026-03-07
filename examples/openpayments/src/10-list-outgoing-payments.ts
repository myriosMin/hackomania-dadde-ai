/**
 * Step 10 – List all outgoing payments on the sender wallet.
 *
 * Powers the transparency dashboard in Dadde's fund — shows all payouts issued,
 * disbursal history, and fund health metrics fed into ClickHouse.
 *
 * Usage:
 *   npm run outgoing:list                  (reads OUTGOING_ACCESS_TOKEN from .env)
 *   npm run outgoing:list -- <access-token>
 */
import { client, getWalletAddress } from './client.js'
import { requireEnv } from './config.js'

const accessToken  = process.argv[2] ?? requireEnv('OUTGOING_ACCESS_TOKEN')

const walletAddress = await getWalletAddress()

const result = await client.outgoingPayment.list(
  {
    url: walletAddress.resourceServer,
    walletAddress: walletAddress.id,
    accessToken
  },
  { first: 20 }
)

const payments = result.result ?? []
console.log(`Found ${payments.length} outgoing payment(s)`)
for (const p of payments) {
  console.log(`  ${p.id}  failed=${p.failed}  sent=${p.sentAmount?.value} ${p.sentAmount?.assetCode}  createdAt=${p.createdAt}`)
}
if (result.pagination?.hasNextPage) {
  console.log('  … more pages available (use cursor to paginate)')
}
