# AGENTS.md — Nova

Nova is a personal agent harness built on top of the pi agent harness. We do not fork pi: we extend
it from the user-owned layer with pi extensions, and each room (component) of Nova is one or more
extensions plus any surface that shows what they do.

Current focus: the **Dashboard** (the pipes room) — a live, minimal, elegant view of what the
harness sends to the model provider. Start there.

## Repository layout

```
nova/
├── AGENTS.md            # this file — how to work in the Nova repo
├── CONTEXT.md           # Nova domain vocabulary (Nova, pi, extension, seam, room, pipes room)
├── README.md            # orientation: what Nova is, current state, how to run things
├── LICENSE
├── IDEAS.md             # open ideas for the Nova harness
├── scripts/             # dev tooling: init.sh (bootstrap a machine), merge-settings.mjs
├── config/              # repo config, e.g. settings.defaults.json (init merges these)
├── extensions/          # pi extension modules Nova ships (the update-safe user layer)
│   └── minimal-status/   # quiet terminal: animated Thinking…/Working… status
├── dashboard/           # THE PIPES ROOM — live observability/control of provider payloads
│   ├── AGENTS.md        # working agreement for the Dashboard
│   ├── CONTEXT.md       # Dashboard glossary (payload, injectable, capture log, …)
│   ├── docs/adr/        # architectural decisions for the Dashboard
│   ├── docs/agents/     # agent conventions (issue tracker, triage labels, domain docs)
│   └── .scratch/        # local-markdown issue tracker (specs + tickets)
└── …/                   # future rooms land here as siblings of dashboard/
```

## Conventions

- **Use Nova's vocabulary** from `CONTEXT.md` (`Nova`, `pi`, `extension`, `seam`, `room`, `pipes
  room / Dashboard`). Within a room's files, use that room's glossary from its own `CONTEXT.md`.
- **A new room is a top-level directory** with its own `AGENTS.md`, `CONTEXT.md`, and `docs/`; it
  is a sibling of `dashboard/`. Give every room `docs/agents/` and follow the tracker there.
- **Pi extensions live in `extensions/`** (one dir per extension, symlinked into
  `~/.pi/agent/extensions/`). Small, single-purpose extensions go here; a composite component that
  grows a surface of its own deserves its own room.
- **New-machine bootstrap**: run `scripts/init.sh`. It symlinks every extension in `extensions/`
  into `~/.pi/agent/extensions/` and merges `config/settings.defaults.json` into
  `~/.pi/agent/settings.json`. It is idempotent and non-destructive: existing extensions are
  skipped, and a setting is only added when the user hasn't already set it. To opt into new
  defaults, add keys to `config/settings.defaults.json`.
- **Build as pi extensions, not forks.** Prefer the pi extension seam over re-embedding pi via the
  SDK (see `dashboard/docs/adr/0001-extension-seam-is-the-control-point.md`). Flag any work that
  would require touching pi itself.
- **Issue tracker is local markdown**: specs and tickets under `.scratch/<room-or-feature>/`, with
  a `Status:` triage line. See `dashboard/docs/agents/issue-tracker.md` and `triage-labels.md`.
- **Work where the vocabulary lives.** Before touching a room, read that room's `CONTEXT.md` and any
  ADR covering the area. Flag any output that contradicts an ADR.

## Where to start

- Read `CONTEXT.md` and this file, then `dashboard/CONTEXT.md`.
- The Dashboard spec lives at `dashboard/.scratch/dashboard/spec.md` (status `ready-for-agent`).
- The two ADRs (`dashboard/docs/adr/0001`, `0002`) are the architectural commitments not to break.
