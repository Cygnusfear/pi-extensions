#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "=== Building pi-mesh-native ==="
./build.sh

echo ""
echo "=== Running Bun FFI test harness ==="
bun run test.ts
