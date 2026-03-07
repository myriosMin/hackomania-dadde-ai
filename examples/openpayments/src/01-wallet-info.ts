import { getWalletAddress } from './client.js'

const walletAddress = await getWalletAddress()

console.log('Wallet Address URL:', walletAddress.id)
console.log('Asset:', `${walletAddress.assetCode} (scale ${walletAddress.assetScale})`)
console.log('Auth server:', walletAddress.authServer)
console.log('Incoming payments endpoint:', walletAddress.incomingPayments)
console.log('Outgoing payments endpoint:', walletAddress.outgoingPayments)
console.log('Quote endpoint:', walletAddress.quoteService)
