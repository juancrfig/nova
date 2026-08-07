# 0002 — Capture log is the decoupled contract between capture and render

The capture layer (a pi extension) and the render layer (a webapp) share nothing in-process. They
communicate exclusively through an append-only JSONL stream — the capture log — with one entry per
payload, keyed by an API-call id.

This lets each side be built, thrown away, and restyled independently: the viewer is a pure reader
of records, so it can later be swapped for a TUI or an embedded-SDK harness without touching the
capture logic, and the capture logic can run unobserved. A rewrite of the payload and a snapshot of
the sent payload are both surfaced as records for the user to compare.
