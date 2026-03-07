import { env } from '../../src/config.js'

console.log('WALLET_ADDRESS=' + env.WALLET_ADDRESS)
console.log('KEY_ID=' + env.KEY_ID)
console.log('PRIVATE_KEY=' + env.PRIVATE_KEY)
console.log('RECEIVER_WALLET_ADDRESS=' + (env.RECEIVER_WALLET_ADDRESS ?? ''))
console.log('GRANT_NONCE=' + env.GRANT_NONCE)
