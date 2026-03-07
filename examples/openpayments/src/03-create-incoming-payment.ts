import { client } from './client.js'
import { env, requireEnv } from './config.js'

const token = process.argv[2]
if (!token) {
  throw new Error('Usage: npm run incoming:create -- <incoming-payment-access-token>')
}

const receiverWalletUrl = requireEnv('RECEIVER_WALLET_ADDRESS')
const receiverWallet = await client.walletAddress.get({ url: receiverWalletUrl })

const incomingPayment = await client.incomingPayment.create(
  {
    url: receiverWallet.resourceServer,
    accessToken: token
  },
  {
    walletAddress: receiverWallet.id,
    incomingAmount: {
      assetCode: receiverWallet.assetCode,
      assetScale: receiverWallet.assetScale,
      value: String(env.INCOMING_AMOUNT)
    },
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  }
)

console.log('Incoming payment URL:', incomingPayment.id)
console.log('Payment pointer (for sender):', incomingPayment.id)
console.log('Amount:', incomingPayment.incomingAmount?.value)
console.log('Expires at:', incomingPayment.expiresAt)
console.log('Set INCOMING_PAYMENT_URL=', incomingPayment.id)
