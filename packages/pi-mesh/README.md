# pi-mesh

Peer-to-peer agent communication layer for pi. Built on Zenoh via `bun:ffi`.

Every pi session gets automatic peer discovery and direct messaging — no central server, no daemon, no subprocess.

## Architecture

```
native/          Rust cdylib — thin wrapper around Zenoh (loaded via bun:ffi)
extension/       TypeScript pi-extension — mesh tools, presence, session identity
```

## Build

```bash
cd native
bash build.sh
```

Produces `libpi_mesh_native.dylib` (Mac) or `libpi_mesh_native.so` (Linux).

## Test

```bash
cd native
bash run-test.sh
```

Runs cargo tests (25) and Bun FFI integration tests (19).

## Transport decision

Zenoh via `bun:ffi` — a Rust cdylib loaded in-process. Evaluated 18+ alternatives including Hyperswarm (crashes on Bun), NATS (needs daemon), libp2p (heavy).

## Install

```bash
pi install /path/to/pi-mesh
```

The extension is loaded automatically. If the native binary is missing you'll see a warning and the mesh tools will be disabled — run `cd native && bash build.sh` to build it first.

## Status

- [x] Tranche 1: Rust native bridge (production, 7 iterations, opus + gpt-5.4 reviewed)
- [x] Tranche 2: TypeScript extension + MCP tools
- [ ] Tranche 3: Replace presence
- [ ] Tranche 4: Replace gateway dependency
- [ ] Tranche 5: Replace teams file polling
- [ ] Tranche 6: Replace server seance (P2)
- [ ] Tranche 7: Remote session attach (P2)
