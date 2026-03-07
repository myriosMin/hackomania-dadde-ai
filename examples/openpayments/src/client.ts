import { createAuthenticatedClient } from '@interledger/open-payments'
import { createPrivateKey } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { env } from './config.js'

async function resolvePrivateKey(): Promise<string | ReturnType<typeof createPrivateKey>> {
  const raw = env.PRIVATE_KEY.trim()

  // PEM provided inline
  if (raw.startsWith('-----BEGIN')) {
    return raw
  }

  // PEM provided as a file path
  if (existsSync(raw)) {
    const pem = await readFile(raw, 'utf8')
    return pem.trim()
  }

  // Base64-encoded DER (PKCS#8) is commonly returned by some dev-wallet UIs.
  // Convert it into a KeyObject so the SDK can sign requests.
  const candidate = raw.replace(/\s+/g, '')
  const looksBase64 = /^[A-Za-z0-9+/]+=*$/.test(candidate) && candidate.length % 4 === 0
  if (looksBase64) {
    try {
      const der = Buffer.from(candidate, 'base64')
      return createPrivateKey({ key: der, format: 'der', type: 'pkcs8' })
    } catch {
      // Fall through to error below.
    }
  }

  throw new Error(
    'Invalid PRIVATE_KEY. Provide PEM text, a PEM file path, or a base64-encoded PKCS#8 DER key.'
  )
}

export const client = await createAuthenticatedClient({
  walletAddressUrl: env.WALLET_ADDRESS,
  keyId: env.KEY_ID,
  privateKey: await resolvePrivateKey()
})

export async function getWalletAddress() {
  return client.walletAddress.get({
    url: env.WALLET_ADDRESS
  })
}
