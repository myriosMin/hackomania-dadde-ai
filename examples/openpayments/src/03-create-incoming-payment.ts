import { client, getWalletAddress } from './client.js'
import { env } from './config.js'

const token = process.argv[2]
if (!token) {
  throw new Error('Usage: npm run incoming:create -- <incoming-payment-access-token>')
}

const walletAddress = await getWalletAddress()
const incomingPayment = await client.incomingPayment.create(
  {
    url: walletAddress.incomingPayments,
    accessToken: token
  },
  {
    walletAddress: walletAddress.id,
    incomingAmount: {
      assetCode: walletAddress.assetCode,
      assetScale: walletAddress.assetScale,
      value: String(env.INCOMING_AMOUNT)
    },
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  }
)

console.log('Incoming payment URL:', incomingPayment.id)
console.log('Payment pointer (for sender):', incomingPayment.id)
console.log('Amount:', incomingPayment.incomingAmount?.value)
console.log('Expires at:', incomingPayment.expiresAt)
