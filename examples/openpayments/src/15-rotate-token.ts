/**
 * Step 15 – Rotate an access token.
 *
 * Rotating generates a new token value (and new manage URL) without invalidating
 * the underlying grant. Use this for long-lived subscription tokens in Dadde's fund
 * — rotate periodically to keep recurring pledge grants secure.
 *
 * The new token and manage URL should be stored and used for all future operations.
 *
 * Usage:
 *   npm run token:rotate                            (reads TOKEN_MANAGE_URL + TOKEN_VALUE from .env)
 *   npm run token:rotate -- <manage-url> <token-value>
 *
 * TOKEN_MANAGE_URL and TOKEN_VALUE come from any previous grant's access_token.manage
 * and access_token.value fields.
 */
import { client } from './client.js'
import { requireEnv } from './config.js'

const manageUrl  = process.argv[2] ?? requireEnv('TOKEN_MANAGE_URL')
const tokenValue = process.argv[3] ?? requireEnv('TOKEN_VALUE')

const result = await client.token.rotate({
  url: manageUrl,
  accessToken: tokenValue
})

console.log('Token rotated successfully.')
console.log('New token value:      ', result.access_token.value)
console.log('New manage URL:       ', result.access_token.manage)
console.log('Expires in (seconds): ', result.access_token.expires_in ?? 'n/a')
console.log()
console.log('Update .env:')
console.log(`TOKEN_VALUE=${result.access_token.value}`)
console.log(`TOKEN_MANAGE_URL=${result.access_token.manage}`)
