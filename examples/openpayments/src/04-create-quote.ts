import { isFinalizedGrantWithAccessToken } from '@interledger/open-payments'
import { client, getWalletAddress } from './client.js'
import { env, requireEnv } from './config.js'

// receiver must be an incoming payment URL (output of step 03), e.g.
// https://ilp.interledger-test.dev/receiver/incoming-payments/<id>
const incomingPaymentUrl = process.argv[2] ?? requireEnv('INCOMING_PAYMENT_URL')

const senderWallet = await getWalletAddress()

// Step 4a: request a non-interactive quote grant on the sender wallet
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

// Step 4b: create the quote
const quote = await client.quote.create(
  {
    url: senderWallet.resourceServer,
    accessToken: quoteGrant.access_token.value
  },
  {
    method: 'ilp',
    walletAddress: senderWallet.id,
    receiver: incomingPaymentUrl,
    debitAmount: {
      assetCode: senderWallet.assetCode,
      assetScale: senderWallet.assetScale,
      value: String(env.QUOTE_SEND_AMOUNT)
    }
  }
)

console.log('Quote URL:', quote.id)
console.log('Debit amount:', quote.debitAmount?.value)
console.log('Receive amount:', quote.receiveAmount?.value)
console.log('Expires at:', quote.expiresAt)
console.log('Set QUOTE_URL=', quote.id)
