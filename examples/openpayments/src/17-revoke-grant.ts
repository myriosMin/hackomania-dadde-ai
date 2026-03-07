/**
 * Step 17 – Cancel (revoke) a grant entirely.
 *
 * Cancels the grant on the auth server so no future tokens can be issued under it.
 * Use this when a donor cancels their recurring subscription pledge in Dadde's fund
 * — revoke the grant so the platform can never charge them again without a new
 * consent flow.
 *
 * Requires the CONTINUE_URI and CONTINUE_ACCESS_TOKEN that were issued when the
 * grant was first requested (step 05 or step 08 for interval grants).
 *
 * Usage:
 *   npm run grant:revoke                            (reads env vars)
 *   npm run grant:revoke -- <continue-uri> <continue-access-token>
 */
import { client } from './client.js'
import { requireEnv } from './config.js'

const continueUri         = process.argv[2] ?? requireEnv('CONTINUE_URI')
const continueAccessToken = process.argv[3] ?? requireEnv('CONTINUE_ACCESS_TOKEN')

await client.grant.cancel({
  url: continueUri,
  accessToken: continueAccessToken
})

console.log('Grant cancelled. No further tokens can be issued under this grant.')
console.log('The donor must re-consent to resume contributions.')
