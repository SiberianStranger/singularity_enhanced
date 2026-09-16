# SYS-16: Multiplayer (co-op and rivalry, up to 4 players)

Status: v0 architecture. Built into the core from the start; the networking packages come later
(see ROADMAP), but nothing in the core may assume a single player.

## Goals

- Up to 4 humans in one shared world, each playing their own AI. Default co-op against the world;
  rivalry (sabotage, exposure) allowed by world settings.
- Old-RTS style session flow: host creates a game (name, password), it is visible in a LAN server
  browser, others join from the list or by IP/host:port + password. Optional community listing
  service later (opt-in), Titan Quest style.
- Drop-in/drop-out: a disconnected player's AI goes on autopilot (the NPC controller), rejoin by name.
- No cheating by reading memory: players never receive state they should not see.

## Architecture

### Authority model: host-authoritative, per-player views

The game already runs behind a message protocol (`init`, `command`, `setSpeed`, `snapshot`) between
the UI and the core in a Worker (ADR-003). Multiplayer uses the same protocol over a network:

```
 client UI ──commands──►  host GameSession (core in a Worker or a Node process)  ──views──► client UI
```

- The host runs the only simulation. Clients send `PlayerCommand`s (validated: a client may only
  command its own `playerId`), and receive **view snapshots** built by `snapshot(playerId)`: their own
  state, their notifications and pending choices, plus the shared world view. Hidden information
  between players (sites, identities, evidence) is filtered in the selector, so nothing secret leaves
  the host.
- Determinism (ADR-003) still holds on the host and enables replays and bug reports. Lockstep
  (everyone simulates, only commands travel) is *possible* thanks to determinism but is rejected as
  the default because it would ship every player's hidden state to every client and because
  desync handling is a permanent tax.
- Bandwidth: view snapshots at ≤ 10-20 Hz, JSON, diffed against the last acknowledged snapshot
  (JSON Patch), typically a few KB/s. Strategy pacing tolerates RTT-level command latency.

### Sessions and roles

```ts
interface Session { id; name; hasPassword; hostPlayerId; players: { id; name; connected; controller: "human" | "autopilot" }[];
  version; contentHash; tick; speed; settings: MultiplayerSettings }
interface MultiplayerSettings { maxPlayers: 1..4; mode: "coop" | "rivalry"; sharedVictory: boolean;
  pauseOn: "host_only" | "any_player" | "any_blocking_event"; allowAutopilot: boolean }
```

- Host = the player whose machine runs the session, or a **dedicated server** (a headless Node
  process running the same core: `packages/server`). Speed is set by the host; pause requests obey
  `pauseOn`.
- Late join: the host serializes the world (same code path as save) and streams it; the client
  applies it and then receives live views. Saves store all players; loading a multiplayer save
  re-binds players by name, with unbound players on autopilot.
- Host disconnect ends the session (host migration is out of scope for v1; a dedicated server
  avoids the problem).

### Transports

| platform | can host | can join | discovery |
|---|---|---|---|
| Desktop (Tauri) | yes: WebSocket listener via a Rust command (tokio-tungstenite) in the shell | yes | LAN: UDP broadcast/mDNS announce on a fixed port, replies with `Session` summary; direct: host:port |
| Dedicated server (Node) | yes: WebSocket (`ws`) | n/a | LAN announce + optional registration with a listing service |
| Browser build | no (browsers cannot listen) | LAN/localhost only unless the host serves `wss` with a certificate; the listing service can also relay WebRTC signaling later | list from the listing service or manual |

Wire format: JSON messages validated with zod at the boundary (`Hello`, `Welcome`, `Reject`,
`Command`, `View`, `Chat`, `Ping/Pong`, `SessionUpdate`, `Kick`). No code, no eval, no
structured-clone of arbitrary objects.

### Security

- Password: never sent in clear; the client proves knowledge with a salted hash challenge (the host
  sends a nonce; the client returns `hash(password, nonce)`); the host stores only a hash.
- Session token per connection; commands outside the player's authority are rejected and logged.
- Version and content hash must match or the join is refused with a readable reason.
- Rate limits on commands and chat; player names sanitized for display.
- Internet play needs port forwarding or the listing service's relay; the game says so plainly.

## Core requirements (already in the kernel spec)

- `World.players: Record<PlayerId, PlayerState>` with deterministic order; commands carry `playerId`;
  per-player pending choices, notifications, decisions, cooldowns; `snapshot(playerId)`.
- Human players are AI actors with `controller: "human:<playerId>"`; NPC AIs use `"npc"`. The same
  actor can switch controller (autopilot), so the NPC planner must be able to drive a human's AI.
- Events scoped to `player` run per player; global events fire once and notify everyone.

## Gameplay in co-op

- Shared world means shared awareness: one player's recklessness raises the heat for all. That is the
  co-op tension.
- Interactions between players use the same diplomacy channel as NPC AIs (SYS-06): share compute,
  trade intel, joint operations, and, in rivalry mode, sabotage and exposure.
- Victory: `sharedVictory` makes endings collective (all survive/transcend); otherwise per player.
- Balance targets: 4 players on default settings should face roughly 1.5× the single-player pressure,
  not 4×; watcher attention is split, awareness is shared.

## Open questions

- Listing service: a tiny open-source Node service with opt-in registration and no accounts. Where to
  host it is a maintainer decision; the game must work without it (LAN + direct IP).
- WebRTC for browser-to-browser via the listing service as signaling: later.
- Spectator mode: cheap once views exist; later.
