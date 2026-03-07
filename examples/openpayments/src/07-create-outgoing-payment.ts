import { client, getWalletAddress } from './client.js'
import { requireEnv } from './config.js'

const accessToken = process.argv[2] ?? requireEnv('OUTGOING_ACCESS_TOKEN')
const quoteId = process.argv[3] ?? requireEnv('QUOTE_URL')

const walletAddress = await getWalletAddress()

const outgoingPayment = await client.outgoingPayment.create(
  {
    url: walletAddress.resourceServer,
    accessToken
  },
  {
    walletAddress: walletAddress.id,
    quoteId
  }
)

console.log('Outgoing payment URL:', outgoingPayment.id)
console.log('Failed:', outgoingPayment.failed)
console.log('Created at:', outgoingPayment.createdAt)
