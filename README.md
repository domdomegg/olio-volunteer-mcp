# olio-volunteer-mcp

MCP server for the [Olio Volunteer Hub](https://volunteers.olioex.com) — browse Food Waste Hero collections, your squads, and your collection history.

> **Note**: This is an unofficial tool, not affiliated with or endorsed by Olio. It calls the Volunteer Hub on your behalf using your own logged-in session, in the same way your browser would when you visit the site. Olio does not publish an OpenAPI / Swagger spec, and endpoints, fields, and behaviour can change without notice.

## Use Cases

**Find a slot tonight near home**: "Are there any unclaimed Olio collections within 1.5 miles of me, this evening, that I could pick up?"

**See what a slot typically yields**: "What kind of food has historically been collected at the Waitrose Clerkenwell Saturday morning slot?"

**Check upcoming commitments**: "What collections do I have in the next two weeks?"

**Audit your squads**: "Which squads am I in, and who's the squad captain for each?"

## Setup

1. Log in to https://volunteers.olioex.com in a browser.
2. Open DevTools → Application → Cookies → `https://volunteers.olioex.com`, copy the value of `_session_id`.
3. Configure the MCP:

```bash
claude mcp add olio-volunteer-mcp \
  -e OLIO_SESSION_ID="..." \
  -- npx -y olio-volunteer-mcp
```

The session cookie expires after a while; if tools start returning auth errors, refresh it the same way.

> **HTTP transport**: this server only speaks stdio. If you need HTTP, run it behind [`mcp-auth-wrapper`](https://github.com/domdomegg/mcp-auth-wrapper) (or similar) so the server is gated by proper auth.

## Environment Variables

| Variable           | Required | Description                                                                                |
| ------------------ | -------- | ------------------------------------------------------------------------------------------ |
| `OLIO_SESSION_ID`  | Yes      | Value of the `_session_id` cookie from a logged-in Volunteer Hub session.                  |
| `OLIO_BASE_URL`    | No       | Base URL of the hub (default: `https://volunteers.olioex.com`).                            |
| `OLIO_USER_AGENT`  | No       | User-Agent string. Default: `olio-volunteer-mcp/<version>`.                                |

## Tools

| Tool                          | Description                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `list_available_collections`  | List unclaimed collections near the volunteer's saved location, with rich filters.                   |
| `get_collection`              | Get a collection by id, plus its store and business in one call. Optionally include inductions.      |
| `get_collection_articles`     | List the articles (food items) historically collected at a given schedule/window.                    |
| `list_my_collections`         | List your upcoming collections (default) or your history (when `include_history=true`).              |
| `list_my_squads`              | List the squads/stores you are a member of, with business lookups by default.                        |
| `get_stores`                  | Resolve one or more store ids to full store records.                                                 |
| `get_businesses`              | Resolve one or more business ids to full business records.                                           |
| `get_current_user`            | Profile of the logged-in volunteer (home location, roles, preferences).                              |
| `call_api`                    | Escape hatch for any Volunteer Hub endpoint. Session cookie is added automatically.                  |

All tools are read-only. The hub does expose write endpoints (claim/unclaim a slot, etc.) but they're intentionally not wired up here — claiming food collections is an action with a real-world commitment, so it belongs in the official app, not in an LLM tool.

## Contributing

Pull requests welcome.

1. `npm install`
2. `npm run build`
3. Smoke test:
   ```bash
   OLIO_SESSION_ID="..." node ./dist/main.js
   # then send JSON-RPC over stdio
   ```
