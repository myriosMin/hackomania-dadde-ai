# Open Payments TypeScript Examples

This folder contains runnable TypeScript examples for common Open Payments operations using your dev wallet at `https://wallet.interledger-test.dev/`.

## Docs explored

- https://openpayments.dev/overview/getting-started/
- https://openpayments.dev/sdk/incoming-create/
- https://openpayments.dev/sdk/quote-create/
- https://openpayments.dev/sdk/outgoing-create/
- https://openpayments.dev/sdk/grant-request/
- https://openpayments.dev/sdk/grant-continue/

## Setup

1. `cd examples/openpayments`
2. `cp .env.example .env`
3. Fill `.env`:
- `WALLET_ADDRESS`, `KEY_ID`, `PRIVATE_KEY`
- Optionally `RECEIVER_WALLET_ADDRESS`
4. Install deps: `npm install`

## Run tests (single command)

Offline test suite:

```bash
npm test
```

This runs deterministic checks for config validation, callback behavior, and env template coverage.

Optional live smoke test (calls wallet API):

```bash
LIVE_SMOKE=1 npm test
```

## Example flows

### 1) Inspect wallet capabilities

```bash
npm run wallet
```

### 2) Receive money (incoming payment)

```bash
npm run grant:incoming
# copy returned token
npm run incoming:create -- <incoming-payment-access-token>
```

Use the printed incoming payment URL as receiver endpoint.

### 3) Send money (quote + outgoing payment)

Start local callback listener in one terminal:

```bash
npm run callback
```

In another terminal:

```bash
npm run grant:outgoing:start
# open redirect URL and approve in browser
# callback logs interact_ref
npm run grant:outgoing:continue -- <continue-uri> <continue-access-token> <interact-ref>
# copy returned final token
```

Then create quote and outgoing payment:

```bash
npm run quote:create -- <outgoing-access-token> <receiver-wallet-address-url>
# copy quote URL
npm run outgoing:create -- <outgoing-access-token> <quote-url>
```

## Notes

- Amount values are integer minor units. If scale is `2`, then `100` means `1.00`.
- `PRIVATE_KEY` should point to your PEM file path used for wallet API credentials.
- You can also place `CONTINUE_*`, `OUTGOING_ACCESS_TOKEN`, and `QUOTE_URL` in `.env` to omit CLI args.
