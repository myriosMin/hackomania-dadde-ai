import { createAuthenticatedClient } from '@interledger/open-payments'
import { env } from './config.js'

export const client = await createAuthenticatedClient({
  walletAddressUrl: env.WALLET_ADDRESS,
  keyId: env.KEY_ID,
  privateKey: env.PRIVATE_KEY
})

export async function getWalletAddress() {
  return client.walletAddress.get({
    url: env.WALLET_ADDRESS
  })
}
