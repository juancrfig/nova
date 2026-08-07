# Nova

A personal agent harness built on top of [pi](https://github.com/earendil-works/pi-coding-agent).
Nova doesn't fork pi — it extends it from the user-owned layer with pi extensions, so custom work
survives pi updates.

Nova is organized as **rooms** (components): each room is one or more pi extensions plus a surface
that shows what they do. Pi extensions we ship live in `extensions/`; a composite component with its
own surface becomes a room.

## Extensions

| Extension | What it is |
| --------- | ---------- |
| `extensions/minimal-status/` | Quiet terminal — animated `Thinking…`/`Working…` status while the harness runs |

## Rooms

| Room | What it is | Status |
| ---- | ---------- | ------ |
| `dashboard/` | The **pipes room** — live, minimal, elegant view of what the harness sends to the model provider, per API call | design (spec ready) |

## Working here

See `AGENTS.md`. Nova's vocabulary is in `CONTEXT.md`; the Dashboard's is in `dashboard/CONTEXT.md`.
Architectural commitments live in `dashboard/docs/adr/`.

## Bootstrap a new machine

```bash
./scripts/init.sh   # symlink extensions + merge default settings (non-destructive)
```
