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
}

offline_tests() {
  log "Running offline tests..."

  base_env
  run_expect_success \
    "config loads with baseline env" \
    npx tsx tests/helpers/load-config.ts

  base_env
  unset WALLET_ADDRESS
  run_expect_failure_contains \
    "config fails when WALLET_ADDRESS missing" \
    "Invalid env vars" \
    npx tsx tests/helpers/load-config.ts

  if grep -q "WALLET_ADDRESS=" .env.example \
    && grep -q "KEY_ID=" .env.example \
    && grep -q "PRIVATE_KEY=" .env.example; then
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
}

live_smoke_tests() {
  log "Running live smoke tests..."
  run_expect_success "wallet script executes" npm run wallet
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
