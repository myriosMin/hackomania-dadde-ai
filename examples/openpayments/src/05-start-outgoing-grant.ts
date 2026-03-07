import { isPendingGrant } from '@interledger/open-payments'
import { client, getWalletAddress } from './client.js'
import { env } from './config.js'

const walletAddress = await getWalletAddress()

const grant = await client.grant.request(
  {
    url: walletAddress.authServer,
    access_token: {
      access: [
        {
          identifier: walletAddress.id,
          type: 'quote',
          actions: ['create', 'read']
        },
        {
          identifier: walletAddress.id,
          type: 'outgoing-payment',
          actions: ['create', 'read', 'list']
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
  },
  {
    walletAddress
  }
)

if (!isPendingGrant(grant)) {
  throw new Error('Expected interactive grant request to be pending')
}

const continueToken = grant.continue.access_token.value

console.log('Open this URL in browser and approve:')
console.log(grant.interact.redirect)
console.log('\nAfter redirect, collect interact_ref from callback URL query.')
console.log('Set these in .env for next step:')
console.log(`CONTINUE_URI=${grant.continue.uri}`)
console.log(`CONTINUE_ACCESS_TOKEN=${continueToken}`)
