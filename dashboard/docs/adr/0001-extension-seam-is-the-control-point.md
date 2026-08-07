# 0001 — Extension seam is the control/observation point

We want to see the exact payload sent to the provider per API call and to decide what is allowed to
go out. The natural seam is pi's extension API: `before_provider_request` hands us the fully
assembled payload right before it is sent and lets us replace it, `context` lets us filter the
message list, and `before_agent_start` lets us decide the injectables and system prompt.

We chose this over a local reverse proxy (read-only observability; rewriting foreign wire JSON is
fragile) and over re-embedding pi via the SDK (re-builds the agent loop; weeks of work). Extensions
live in the user-owned `~/.pi/agent/extensions/` dir, are never rewritten by pi updates, and hot
reload, so this is simultaneously the "total control" and "survives updates" path.
