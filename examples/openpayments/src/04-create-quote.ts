import { client, getWalletAddress } from './client.js'
import { env } from './config.js'

const token = process.argv[2]
const receiverWalletAddressUrl = process.argv[3] ?? env.RECEIVER_WALLET_ADDRESS

if (!token) {
  throw new Error('Usage: npm run quote:create -- <quote-access-token> [receiver-wallet-address-url]')
}
if (!receiverWalletAddressUrl) {
  throw new Error('Provide receiver wallet via arg2 or RECEIVER_WALLET_ADDRESS in .env')
}

const senderWallet = await getWalletAddress()
const receiverWallet = await client.walletAddress.get({ url: receiverWalletAddressUrl })

const quote = await client.quote.create(
  {
    url: senderWallet.quoteService,
    accessToken: token
  },
  {
    method: 'ilp',
    walletAddress: senderWallet.id,
    receiver: receiverWallet.id,
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
console.log('If accepted, set QUOTE_URL=', quote.id)
