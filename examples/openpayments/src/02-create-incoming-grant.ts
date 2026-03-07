import { client, getWalletAddress } from './client.js'

const walletAddress = await getWalletAddress()

const grant = await client.grant.request(
  {
    url: walletAddress.authServer,
    access_token: {
      access: [
        {
          type: 'incoming-payment',
          actions: ['create', 'read', 'list']
        }
      ]
    }
  },
  {
    walletAddress
  }
)

if (!grant.access_token) {
  throw new Error('No access token returned for incoming-payment grant')
}

console.log('Incoming-payment access token:')
console.log(grant.access_token.value)
console.log('Expires in (seconds):', grant.access_token.expires_in)
