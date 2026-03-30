#!/usr/bin/env bash
# Requires Rust 1.85+ (Edition 2024)
set -euo pipefail

cd "$(dirname "$0")"

echo "Building pi-mesh sidecar binary (release)..."
cargo build --release --bin pi-mesh

ARTIFACT="target/release/pi-mesh"
if [[ "$(uname)" == "MINGW"* ]] || [[ "$(uname)" == "MSYS"* ]]; then
    ARTIFACT="target/release/pi-mesh.exe"
fi

echo "Build complete: ${ARTIFACT}"
ls -lh "${ARTIFACT}"

# Copy to canonical location so pi-mesh extension finds it without needing target/
DEST="$(dirname "$0")/pi-mesh"
if [[ "$(uname)" == "MINGW"* ]] || [[ "$(uname)" == "MSYS"* ]]; then
    DEST="$(dirname "$0")/pi-mesh.exe"
fi
cp "${ARTIFACT}" "${DEST}"
echo "Installed to: ${DEST}"
