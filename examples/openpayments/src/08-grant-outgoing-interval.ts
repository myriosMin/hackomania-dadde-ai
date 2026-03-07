/**
 * Step 8 – Request an interactive outgoing-payment grant with a recurring interval limit.
 *
 * This is the key primitive for subscription / pledge contributions in Dadde's fund.
 * The `interval` field (ISO 8601 repeating) tells the auth server that the debit
 * limit resets on every period — e.g. "charge at most $X per day, indefinitely".
 *
 * Usage: npm run grant:outgoing:interval
 * Then approve the browser redirect and run step 06 (continue grant) to get the token.
 */
import { isPendingGrant } from '@interledger/open-payments'
import { client, getWalletAddress } from './client.js'
import { env } from './config.js'

const walletAddress = await getWalletAddress()

// How much to allow per interval period (reuses QUOTE_SEND_AMOUNT for demo convenience)
const limitPerPeriod = String(env.QUOTE_SEND_AMOUNT)

const grant = await client.grant.request(
  { url: walletAddress.authServer },
  {
    access_token: {
      access: [
        {
          identifier: walletAddress.id,
          type: 'outgoing-payment',
          actions: ['create', 'read', 'list'],
          limits: {
            debitAmount: {
              assetCode: walletAddress.assetCode,
              assetScale: walletAddress.assetScale,
              value: limitPerPeriod
            },
            // Repeating daily interval starting now — replace date & period as needed.
            // Format: R/<start>/<duration>  e.g. R/2026-03-07T00:00:00Z/P1M = monthly
            interval: `R/${new Date().toISOString().slice(0, 10)}T00:00:00Z/P1D`
          }
        }
      ]
    },
    interact: {
      start: ['redirect'],
      finish: {
        method: 'redirect',
        uri: env.GRANT_REDIRECT_URI,
        nonce: env.GRANT_NONCE
      }
    }
  }
)

if (!isPendingGrant(grant)) {
  throw new Error('Expected interactive grant — got finalized grant instead')
}

console.log('Open this URL in browser and approve:')
console.log(grant.interact.redirect)
console.log()
console.log('After redirect, collect interact_ref from the callback URL query.')
console.log('Set these in .env for step 06 (continue grant):')
console.log(`CONTINUE_URI=${grant.continue.uri}`)
console.log(`CONTINUE_ACCESS_TOKEN=${grant.continue.access_token.value}`)
console.log(`Interval limit per period: ${limitPerPeriod} ${walletAddress.assetCode}`)
