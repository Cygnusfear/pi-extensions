# provider-key-router

One multi-provider API-key router for Pi. It replaces the separate ZAI and Kimi rotation extensions and adds QwenCloud support.

## Behavior

The router keeps the last successful key active and persists observed health per key. Before every new request it refreshes that shared health ledger, skips keys in cooldown, quota-exhausted, auth-invalid, or active-probe states, and selects only an eligible key. Observed-healthy keys are preferred in ring order, then unknown keys remain eligible until a real provider response proves otherwise.

When a turn ends with a provider-limit failure, the router records that exact key once before choosing the next eligible key. Response status and reset headers captured from `after_provider_response` remain attached even when Pi's later retry event omits them or automatic retry is disabled. Each candidate is still attempted at most once per recovery episode. If no key is eligible, Pi aborts the retry (or handles new input before the LLM call) and displays one explicit request-pool or alternate-pool result with state counts, required auth remediation, and the earliest known recovery time. It never queues a continuation or rate-limit timer for an exhausted pool.

Retryable 429 errors rotate before Pi's built-in retry, so the next retry uses the new key in the same turn. Non-retryable 401, 402, 403, and account-quota errors rotate once and request one immediate continuation. The recovery episode is committed only after the host acknowledges that follow-up; rejection rolls the queue state back and leaves `rate-limit-recovery` free to recover. Shared-bus queries and direct host listeners enter one router-owned transition: the exact event identity is marked in flight synchronously before either handler runs, both entrances share its result, and every settled evaluation is cached with its true/false claim result. A rejected evaluation releases ownership; a settled false result remains cached so rate recovery may act without replaying a key mutation when Pi awaits listeners sequentially. Shared-bus coordination is therefore independent of extension listener order, so one error cannot mutate the ring or schedule recovery twice.

Provider reset headers are authoritative only when they produce a finite, representable wake time. Malformed, non-finite, and out-of-range numeric values are treated as absent and never enter the durable health ledger. Every health mutation must also pass the complete store schema before durable publication, so provider resets, adaptive resets, observations, and probe leases cannot write state that the reader rejects. Without trustworthy reset metadata, cooldown/quota failures re-enter eligibility after an adaptive 5h → 10h → 20h → 40h → 80h schedule capped at 7 days; weekly-limit errors begin at 7 days. An expired key is leased to one Pi process for a bounded real-request recheck, preventing a fleet-wide probe storm. The durable lease has an owner identity, survives manual selection and input preflight, and can be finalized only by that owner's real provider response. Abandoned selections and orderly shutdown release their own lease back to an expired timed state; owner-token checks ensure they never erase another process's claim. There is no background probing. A successful response marks the key healthy.

Provider overrides use `pi.registerProvider(providerId, { apiKey })`. Rings with several provider IDs change as one transaction: the router carries the actual prior key, records every provider ID changed, and restores those registrations plus the untouched durable snapshot if any later registration or durable save fails. Configuration commands stage and validate a cloned store, register a required replacement across every alias, publish durably, and only then replace runtime and recovery-episode state. Failed add, remove, or auto-rotate publication therefore leaves the original command retryable. They do not mutate process-wide environment variables.

## Commands

| Command | Action |
|---|---|
| `/swap` | Select a different eligible key for the active model provider; the current key is never counted as an alternate |
| `/swap check` | Make the active provider's timed-quarantined keys eligible for the next real-request recheck; sends no provider request and preserves auth-invalid keys |
| `/provider-keys` | List configured key rings |
| `/provider-keys <provider> keys` | Show redacted key status |
| `/provider-keys <provider> swap` | Select the next key |
| `/zai-keys`, `/kimi-keys`, `/qwen-keys` | Provider-specific key management |
| `/zai-swap`, `/kimi-swap`, `/qwen-swap` | Provider-specific manual swap |
| `/<provider>-swap check` | Provider-specific equivalent of `/swap check` |
| `/<provider>-keys auto-on` | Enable automatic failover |
| `/<provider>-keys auto-off` | Disable automatic failover |
| `/<provider>-keys add <source>` | Add a literal, `$ENV`, or `!command` key source |
| `/<provider>-keys remove <#>` | Remove a source by displayed number |
| `/<provider>-keys reset-health [all|#]` | Emergency-only: make quarantined keys eligible for recheck |

`/qwen` remains the model shortcut. `/qwen-swap` changes only the QwenCloud credential.

## Configuration

Credential configuration lives in `~/.pi/agent/provider-keys.json`. Operational health lives separately in `~/.pi/agent/provider-key-health.json`. Both use file mode `0600` and durable atomic publication. Health records contain stable source IDs, state, timestamps, failure counts, sanitized reason codes, and owner-scoped probe metadata—never key values or raw provider messages. Health schema v2 reads v1 state safely; a legacy ownerless probe remains timed until its prior lease expiry, then receives a v2 owner when selected. Cross-process mutations use a bounded FIFO lock namespace. Exclusive creation assigns each contender a monotonically increasing, never-reused ticket with a UUID owner; release or stale takeover retires that exact ticket instead of deleting a reusable lock path. A successor ticket therefore cannot be removed by an older contender completing stale cleanup. An epoch-old legacy `owner` is pinned by inode and retired through an immutable identity marker; its reusable pathname is never deleted by the new router, so replacement ABA cannot erase a successor. Released lower tickets are compacted while the highest ticket remains as the allocation watermark. Every mutation reloads the latest state before writing. Router bus subscriptions and locally owned probe leases are disposed during session shutdown so reloads cannot duplicate listeners or strand an eligible key.

The credential file has a versioned schema and one entry per logical provider. Each entry declares its Pi provider IDs, slash-command name, key sources, active key ID, and automatic-rotation setting. Provider IDs and command names must be unique across the store, and `activeKeyId` must reference a configured source.

Key sources use the same forms as `models.json`:

- a literal key
- `$ENV_VAR` or `${ENV_VAR}`
- `!command` (stdout is the key)

Prefer environment or secret-command sources. Status commands show only redacted resolved values. Resolution failures cross the UI boundary only as generic source-unavailable diagnostics; raw source text, commands, stderr, and resolved values are never included.

On first load, the router imports `zai-keys.json` and `kimi-keys.json` into the unified store. It preserves key order, active selection, and `autoRotate`. It removes each legacy file only after the unified file is written successfully.

Health state is provider-agnostic. `healthy` and absent/unknown entries are eligible; `cooldown`, `quota-exhausted`, and `probe` become eligible at `retryAt`; `auth-invalid` requires source replacement or the emergency reset command. Normal quota recovery never depends on manual reset.

A stored `/login` credential has higher priority than provider configuration. The router detects this case, warns, and refuses to claim that a swap succeeded. Run `/logout <provider>` before using the key ring.

## Add another provider

Add one entry under `providers` in `provider-keys.json`. Use a unique logical ID and command name. Set `providerIds` to every Pi provider ID that shares the subscription pool. No TypeScript copy is required.
