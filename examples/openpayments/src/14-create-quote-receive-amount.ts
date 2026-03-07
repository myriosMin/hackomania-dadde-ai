/**
 * Step 14 – Create a quote specifying how much the RECEIVER should receive (receiveAmount).
 *
 * This is the correct mode for disaster payouts in Dadde's fund: "send exactly
 * MYR 500 to this claimant" — the platform absorbs any FX/ILP routing difference
 * rather than surprising the recipient with less than expected.
 *
 * Contrast with step 04 (debitAmount) which fixes what the sender spends.
 *
 * Usage:
 *   npm run quote:create:receive                        (reads INCOMING_PAYMENT_URL from .env)
 *   npm run quote:create:receive -- <incoming-payment-url>
 */
import { isFinalizedGrantWithAccessToken } from '@interledger/open-payments'
import { client, getWalletAddress } from './client.js'
import { env, requireEnv } from './config.js'

const incomingPaymentUrl = process.argv[2] ?? requireEnv('INCOMING_PAYMENT_URL')

const senderWallet = await getWalletAddress()

// Request a non-interactive quote grant on the sender wallet
const quoteGrant = await client.grant.request(
  { url: senderWallet.authServer },
  {
    access_token: {
      access: [
        {
          type: 'quote',
          actions: ['create', 'read']
        }
      ]
    }
  }
)

if (!isFinalizedGrantWithAccessToken(quoteGrant)) {
  throw new Error('No access token returned for quote grant')
}

// Create the quote with a fixed receiveAmount
const quote = await client.quote.create(
  {
    url: senderWallet.resourceServer,
    accessToken: quoteGrant.access_token.value
  },
  {
    method: 'ilp',
    walletAddress: senderWallet.id,
    receiver: incomingPaymentUrl,
    receiveAmount: {
      assetCode: senderWallet.assetCode,
      assetScale: senderWallet.assetScale,
      value: String(env.QUOTE_SEND_AMOUNT)   // interpreted as receive amount here
    }
  }
)

console.log('Quote URL (receive-amount mode):', quote.id)
console.log('Debit amount (sender pays):     ', quote.debitAmount?.value, quote.debitAmount?.assetCode)
console.log('Receive amount (payee gets):    ', quote.receiveAmount?.value, quote.receiveAmount?.assetCode)
console.log('Expires at:                     ', quote.expiresAt)
console.log('Set QUOTE_URL=', quote.id)
