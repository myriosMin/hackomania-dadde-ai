import { isFinalizedGrantWithAccessToken } from '@interledger/open-payments'
import { client } from './client.js'
import { requireEnv } from './config.js'

const receiverWalletUrl = requireEnv('RECEIVER_WALLET_ADDRESS')
const receiverWallet = await client.walletAddress.get({ url: receiverWalletUrl })

const grant = await client.grant.request(
  { url: receiverWallet.authServer },
  {
    access_token: {
      access: [
        {
          type: 'incoming-payment',
          actions: ['create', 'read', 'list', 'complete']
        }
      ]
    }
  }
)

if (!isFinalizedGrantWithAccessToken(grant)) {
  throw new Error('No access token returned for incoming-payment grant')
}

console.log('Incoming-payment access token:')
console.log(grant.access_token.value)
console.log('Expires in (seconds):', grant.access_token.expires_in)
console.log('Manage URL:', grant.access_token.manage)
