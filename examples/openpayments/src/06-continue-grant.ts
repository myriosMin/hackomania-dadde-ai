import { isFinalizedGrant } from '@interledger/open-payments'
import { client } from './client.js'
import { requireEnv } from './config.js'

const continueUri = process.argv[2] ?? requireEnv('CONTINUE_URI')
const continueAccessToken = process.argv[3] ?? requireEnv('CONTINUE_ACCESS_TOKEN')
const interactRef = process.argv[4] ?? requireEnv('INTERACT_REF')

const grant = await client.grant.continue(
  {
    url: continueUri,
    accessToken: continueAccessToken
  },
  {
    interact_ref: interactRef
  }
)

if (!isFinalizedGrant(grant) || !grant.access_token) {
  throw new Error('Grant not finalized. Ensure interact_ref is correct and approval is completed.')
}

console.log('Final outgoing access token:')
console.log(grant.access_token.value)
console.log('Expires in (seconds):', grant.access_token.expires_in)
console.log('Set OUTGOING_ACCESS_TOKEN to this value.')
