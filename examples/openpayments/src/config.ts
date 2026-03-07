import { config as loadEnv } from 'dotenv'
import { z } from 'zod'

loadEnv()

const optionalString = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional())
const optionalUrl = z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional())

const envSchema = z.object({
  WALLET_ADDRESS: z.string().url(),
  KEY_ID: z.string().min(1),
  PRIVATE_KEY: z.string().min(1),
  RECEIVER_WALLET_ADDRESS: optionalUrl,
  INCOMING_AMOUNT: z.coerce.number().int().positive().default(100),
  QUOTE_SEND_AMOUNT: z.coerce.number().int().positive().default(100),
  GRANT_REDIRECT_URI: z.string().url().default('http://localhost:3344/callback'),
  GRANT_NONCE: z.string().min(8).default('hackomania-demo-nonce'),
  CONTINUE_ACCESS_TOKEN: optionalString,
  CONTINUE_URI: optionalUrl,
  INTERACT_REF: optionalString,
  OUTGOING_ACCESS_TOKEN: optionalString,
  QUOTE_URL: optionalUrl
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid env vars:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data

export function requireEnv<K extends keyof typeof env>(key: K): NonNullable<(typeof env)[K]> {
  const value = env[key]
  if (value === undefined || value === '') {
    throw new Error(`Missing required env variable: ${key}`)
  }
  return value as NonNullable<(typeof env)[K]>
}
