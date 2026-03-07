#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PASS_COUNT=0
FAIL_COUNT=0

log() {
  printf '%s\n' "$1"
}

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  printf 'PASS: %s\n' "$1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  printf 'FAIL: %s\n' "$1"
}

run_expect_success() {
  local name="$1"
  shift
  set +e
  local output
  output="$($@ 2>&1)"
  local status=$?
  set -e
  if [[ $status -eq 0 ]]; then
    pass "$name"
  else
    fail "$name"
    printf '%s\n' "$output"
  fi
}

run_expect_failure_contains() {
  local name="$1"
  local expected="$2"
  shift 2
  set +e
  local output
  output="$($@ 2>&1)"
  local status=$?
  set -e
  if [[ $status -ne 0 && "$output" == *"$expected"* ]]; then
    pass "$name"
  else
    fail "$name"
    printf 'Expected failure containing: %s\n' "$expected"
    printf 'Actual status: %s\n' "$status"
    printf '%s\n' "$output"
  fi
}

ensure_deps() {
  if [[ ! -d node_modules ]]; then
    log "Installing dependencies (node_modules missing)..."
    npm install >/dev/null
  fi
}

base_env() {
  export WALLET_ADDRESS="https://wallet.interledger-test.dev/test-wallet"
  export KEY_ID="test-key-id"
  export PRIVATE_KEY="/tmp/test-key.pem"
  export INCOMING_AMOUNT="100"
  export QUOTE_SEND_AMOUNT="100"
  export GRANT_REDIRECT_URI="http://localhost:3344/callback"
  export GRANT_NONCE="hackomania-test-nonce"
  export RECEIVER_WALLET_ADDRESS=""
  export CONTINUE_ACCESS_TOKEN=""
  export CONTINUE_URI=""
  export INTERACT_REF=""
  export OUTGOING_ACCESS_TOKEN=""
  export QUOTE_URL=""
  export OUTGOING_PAYMENT_URL=""
  export INCOMING_PAYMENT_ACCESS_TOKEN=""
  export QUOTE_ACCESS_TOKEN=""
  export TOKEN_MANAGE_URL=""
  export TOKEN_VALUE=""
}

offline_tests() {
  log "Running offline tests..."

  base_env
  run_expect_success \
    "config loads with baseline env" \
    env DOTENV_DISABLE=1 npx tsx tests/helpers/load-config.ts

  base_env
  unset WALLET_ADDRESS
  run_expect_failure_contains \
    "config fails when WALLET_ADDRESS missing" \
    "Invalid env vars" \
    env DOTENV_DISABLE=1 npx tsx tests/helpers/load-config.ts

  if grep -q "WALLET_ADDRESS=" .env.example \
    && grep -q "KEY_ID=" .env.example \
    && grep -q "PRIVATE_KEY=" .env.example \
    && grep -q "OUTGOING_PAYMENT_URL=" .env.example \
    && grep -q "INCOMING_PAYMENT_ACCESS_TOKEN=" .env.example \
    && grep -q "TOKEN_MANAGE_URL=" .env.example \
    && grep -q "TOKEN_VALUE=" .env.example; then
    pass ".env.example includes required credentials"
  else
    fail ".env.example includes required credentials"
  fi

  local callback_log
  callback_log="$(mktemp)"
  CALLBACK_PORT=3355 npm run callback >"$callback_log" 2>&1 &
  local callback_pid=$!

  sleep 1
  run_expect_success \
    "callback endpoint accepts interact_ref" \
    curl -fsS "http://localhost:3355/callback?interact_ref=test-ref-123"

  sleep 1
  kill "$callback_pid" >/dev/null 2>&1 || true

  if grep -q "interact_ref: test-ref-123" "$callback_log"; then
    pass "callback server logs interact_ref"
  else
    fail "callback server logs interact_ref"
    cat "$callback_log"
  fi

  rm -f "$callback_log"

  # ── New scripts: offline error-path checks ──────────────────────────────────
  # Generate a throw-away Ed25519 PEM so createAuthenticatedClient initialises
  # successfully and the scripts fail at requireEnv (not at key loading).
  local test_key_path="/tmp/hackomania-test-key.pem"
  node -e "const {generateKeyPairSync}=require('crypto');const {privateKey}=generateKeyPairSync('ed25519',{privateKeyEncoding:{type:'pkcs8',format:'pem'}});require('fs').writeFileSync('${test_key_path}',privateKey);"
  local test_key_env="PRIVATE_KEY=${test_key_path}"

  base_env
  run_expect_failure_contains \
    "outgoing:get fails without OUTGOING_PAYMENT_URL" \
    "OUTGOING_PAYMENT_URL" \
    env DOTENV_DISABLE=1 "$test_key_env" npx tsx src/09-get-outgoing-payment.ts

  base_env
  run_expect_failure_contains \
    "outgoing:list fails without OUTGOING_ACCESS_TOKEN" \
    "OUTGOING_ACCESS_TOKEN" \
    env DOTENV_DISABLE=1 OUTGOING_ACCESS_TOKEN="" "$test_key_env" npx tsx src/10-list-outgoing-payments.ts

  base_env
  run_expect_failure_contains \
    "incoming:list fails without INCOMING_PAYMENT_ACCESS_TOKEN" \
    "INCOMING_PAYMENT_ACCESS_TOKEN" \
    env DOTENV_DISABLE=1 RECEIVER_WALLET_ADDRESS="https://wallet.interledger-test.dev/recv" "$test_key_env" npx tsx src/11-list-incoming-payments.ts

  base_env
  run_expect_failure_contains \
    "incoming:get fails without INCOMING_PAYMENT_URL" \
    "INCOMING_PAYMENT_URL" \
    env DOTENV_DISABLE=1 INCOMING_PAYMENT_ACCESS_TOKEN="tok" "$test_key_env" npx tsx src/12-get-incoming-payment.ts

  base_env
  run_expect_failure_contains \
    "incoming:complete fails without INCOMING_PAYMENT_URL" \
    "INCOMING_PAYMENT_URL" \
    env DOTENV_DISABLE=1 INCOMING_PAYMENT_ACCESS_TOKEN="tok" "$test_key_env" npx tsx src/13-complete-incoming-payment.ts

  base_env
  run_expect_failure_contains \
    "token:rotate fails without TOKEN_MANAGE_URL" \
    "TOKEN_MANAGE_URL" \
    env DOTENV_DISABLE=1 "$test_key_env" npx tsx src/15-rotate-token.ts

  base_env
  run_expect_failure_contains \
    "token:revoke fails without TOKEN_MANAGE_URL" \
    "TOKEN_MANAGE_URL" \
    env DOTENV_DISABLE=1 "$test_key_env" npx tsx src/16-revoke-token.ts

  base_env
  run_expect_failure_contains \
    "grant:revoke fails without CONTINUE_URI" \
    "CONTINUE_URI" \
    env DOTENV_DISABLE=1 "$test_key_env" npx tsx src/17-revoke-grant.ts
}

live_smoke_tests() {
  log "Running live smoke tests..."
  # dotenv does not override existing environment variables, so ensure the
  # baseline env exported by offline tests does not leak into live smoke tests.
  local unset_vars=(
    -u WALLET_ADDRESS
    -u KEY_ID
    -u PRIVATE_KEY
    -u RECEIVER_WALLET_ADDRESS
    -u INCOMING_AMOUNT
    -u QUOTE_SEND_AMOUNT
    -u GRANT_REDIRECT_URI
    -u GRANT_NONCE
    -u CONTINUE_ACCESS_TOKEN
    -u CONTINUE_URI
    -u INTERACT_REF
    -u OUTGOING_ACCESS_TOKEN
    -u QUOTE_URL
    -u INCOMING_PAYMENT_URL
    -u OUTGOING_PAYMENT_URL
    -u INCOMING_PAYMENT_ACCESS_TOKEN
    -u QUOTE_ACCESS_TOKEN
    -u TOKEN_MANAGE_URL
    -u TOKEN_VALUE
  )

  run_expect_success \
    "wallet script executes" \
    env "${unset_vars[@]}" npm run wallet

  # Step 2: request a non-interactive incoming-payment grant
  local grant_output
  set +e
  grant_output="$(env "${unset_vars[@]}" npm run grant:incoming 2>&1)"
  local grant_status=$?
  set -e
  if [[ $grant_status -eq 0 ]]; then
    pass "incoming grant executes"
  else
    fail "incoming grant executes"
    printf '%s\n' "$grant_output"
    return
  fi

  local incoming_token
  incoming_token="$(printf '%s\n' "$grant_output" | awk '/Incoming-payment access token:/{getline; print; exit}')"
  if [[ -z "$incoming_token" ]]; then
    fail "incoming payment creates"
    log "Could not extract access token from grant output"
    return
  fi

  # Step 3: create an incoming payment using the grant token
  local incoming_output
  set +e
  incoming_output="$(env "${unset_vars[@]}" npm run incoming:create -- "$incoming_token" 2>&1)"
  local incoming_status=$?
  set -e
  if [[ $incoming_status -eq 0 ]]; then
    pass "incoming payment creates"
  else
    fail "incoming payment creates"
    printf '%s\n' "$incoming_output"
    return
  fi

  local incoming_url
  incoming_url="$(printf '%s\n' "$incoming_output" | sed -n 's/^Set INCOMING_PAYMENT_URL= //p')"
  if [[ -z "$incoming_url" ]]; then
    fail "quote creates"
    log "Could not extract incoming payment URL from step 3 output"
    return
  fi

  # Step 4: create a quote against the incoming payment
  local quote_output
  set +e
  quote_output="$(env "${unset_vars[@]}" INCOMING_PAYMENT_URL="$incoming_url" npm run quote:create 2>&1)"
  local quote_status=$?
  set -e
  if [[ $quote_status -eq 0 ]]; then
    pass "quote creates"
  else
    fail "quote creates"
    printf '%s\n' "$quote_output"
  fi

  # Step 4b: list incoming payments (using the token from step 2, against receiver wallet)
  local recv_wallet
  recv_wallet="$(grep -E '^RECEIVER_WALLET_ADDRESS=' .env 2>/dev/null | head -1 | cut -d= -f2-)" || true
  if [[ -n "$recv_wallet" ]]; then
    run_expect_success \
      "incoming:list executes" \
      env "${unset_vars[@]}" npm run incoming:list -- "$incoming_token"
  else
    log "SKIP incoming:list (RECEIVER_WALLET_ADDRESS not set in .env)"
  fi

  # Step 4c: get a specific incoming payment
  if [[ -n "$incoming_url" ]]; then
    run_expect_success \
      "incoming:get executes" \
      env "${unset_vars[@]}" npm run incoming:get -- "$incoming_url" "$incoming_token"
  fi

  # Step 4d: create a quote using receiveAmount (alternate quoting mode)
  if [[ -n "$incoming_url" ]]; then
    run_expect_success \
      "quote:create:receive executes" \
      env "${unset_vars[@]}" INCOMING_PAYMENT_URL="$incoming_url" npm run quote:create:receive
  fi
}

main() {
  ensure_deps
  offline_tests

  if [[ "${LIVE_SMOKE:-0}" == "1" ]]; then
    live_smoke_tests
  else
    log "Skipping live smoke tests (set LIVE_SMOKE=1 to enable)."
  fi

  log ""
  log "Summary: ${PASS_COUNT} passed, ${FAIL_COUNT} failed"

  if [[ $FAIL_COUNT -ne 0 ]]; then
    exit 1
  fi
}

main "$@"
