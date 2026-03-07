/**
 * Step 16 – Revoke an access token.
 *
 * Permanently invalidates a token on the auth server. Use this when a donor
 * cancels their subscription in Dadde's fund, or after a one-off payout token
 * has been used and should not be reused.
 *
 * Unlike token rotation, revocation cannot be undone — a new grant request is
 * required to get a fresh token.
 *
 * Usage:
 *   npm run token:revoke                            (reads TOKEN_MANAGE_URL + TOKEN_VALUE from .env)
 *   npm run token:revoke -- <manage-url> <token-value>
 */
import { client } from './client.js'
import { requireEnv } from './config.js'

const manageUrl  = process.argv[2] ?? requireEnv('TOKEN_MANAGE_URL')
const tokenValue = process.argv[3] ?? requireEnv('TOKEN_VALUE')

await client.token.revoke({
  url: manageUrl,
  accessToken: tokenValue
})

console.log('Token revoked. The grant remains on the auth server but this token can no longer be used.')
console.log('To issue payments against this grant again, rotate or re-request a token.')
