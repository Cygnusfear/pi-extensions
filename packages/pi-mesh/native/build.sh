#!/usr/bin/env bash
# Requires Rust 1.85+ (Edition 2024)
set -euo pipefail

cd "$(dirname "$0")"
ROOT="$(pwd)"

echo "Building pi-mesh sidecar binary (release)..."
cargo build --release --bin pi-mesh

ARTIFACT="target/release/pi-mesh"
if [[ "$(uname)" == "MINGW"* ]] || [[ "$(uname)" == "MSYS"* ]]; then
    ARTIFACT="target/release/pi-mesh.exe"
fi

echo "Build complete: ${ARTIFACT}"
ls -lh "${ARTIFACT}"

# Copy to canonical location so pi-mesh extension finds it without needing target/
# Resolve the install path from an absolute root: "cd $(dirname $0)" above
# makes $0-relative paths resolve under the NEW cwd, which silently failed the
# install when the script was invoked relatively (bash packages/.../build.sh).
DEST="${ROOT}/pi-mesh"
if [[ "$(uname)" == "MINGW"* ]] || [[ "$(uname)" == "MSYS"* ]]; then
    DEST="${ROOT}/pi-mesh.exe"
fi
# Install via atomic rename (review kal-kcbh5uwv finding 2): cp over DEST in
# place rewrites the inode of a RUNNING sidecar's mapped pages; macOS
# re-validates code signatures per page at fault-in time, so a live process
# could be SIGKILLed later (memory pressure, sleep/wake). rename(2) onto a
# fresh inode leaves any running process's mapped pages untouched.
TMP="$(mktemp "${DEST}.XXXXXX")"
trap 'rm -f "${TMP}"' EXIT
cp "${ARTIFACT}" "${TMP}"
chmod 755 "${TMP}" # mktemp makes 0600; restore the executable bit before install

# Re-sign (ad-hoc) BEFORE the rename: replacing the file leaves a stale
# code-signature/provenance state; the kernel then SIGKILLs the process at
# load ("load code signature error 2") — observed on Apple Silicon macOS.
if command -v codesign >/dev/null 2>&1; then
    codesign --force --sign - "${TMP}"
fi

mv "${TMP}" "${DEST}" # same directory => atomic rename(2)
trap - EXIT
echo "Installed to: ${DEST}"
