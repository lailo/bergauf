# bergauf

A Model Context Protocol (MCP) server that lets an LLM client plan hikes
anywhere in Switzerland. Combines named SwitzerlandMobility routes, swisstopo
elevation profiles, Open-Meteo weather, and Swiss public transport.

Single static binary, built with Bun. No API keys.

## Tools

| Tool                | Purpose                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------- |
| `search_location`   | Resolve a free-text place name (town, mountain, station, address) to WGS84 coordinates. |
| `list_named_routes` | List SwitzerlandMobility (Wanderland) routes. Optional WGS84 bbox filter.               |
| `get_named_route`   | Fetch one route by its feature id. Returns attributes and geometry (WGS84 GeoJSON).     |
| `get_hike_profile`  | Distance, ascent/descent, elevation samples, SAC/DAV walking time for a GeoJSON line.   |
| `nearest_stations`  | Nearest train/bus/tram stops to a WGS84 point.                                          |
| `plan_transit`      | Plan a public transport connection (departure or arrival time).                         |
| `forecast`          | Hourly + daily weather for a WGS84 point (MeteoSwiss ICON seamless via Open-Meteo).     |

Each tool returns small JSON payloads with both `content` (text) and
`structuredContent`. Coordinates are WGS84 lat/lon throughout.

## Install

Run from source (requires [Bun](https://bun.sh) ≥ 1.2):

```bash
bun install
bun run dev          # MCP Inspector UI in the browser — call tools, inspect responses
bun run dev:stdio    # or the raw stdio server (for piping JSON-RPC by hand)
```

`bun run dev` wraps the server in [MCP Inspector](https://github.com/modelcontextprotocol/inspector),
which auto-discovers the seven tools, renders their Zod input schemas as forms, and shows
both the pretty-printed and structured outputs side-by-side. First run downloads the
Inspector via `bunx`; subsequent runs hit the cache.

Or build the compiled binary for your platform:

```bash
bun run build:darwin-arm64    # → dist/bergauf-darwin-arm64
bun run build:darwin-x64      # → dist/bergauf-darwin-x64
bun run build:linux-x64       # → dist/bergauf-linux-x64
bun run build:linux-arm64     # → dist/bergauf-linux-arm64
bun run build:windows-x64     # → dist/bergauf-windows-x64.exe
bun run build                 # all five
```

## Claude Desktop config

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bergauf": {
      "command": "/absolute/path/to/dist/bergauf-darwin-arm64"
    }
  }
}
```

For Bun-from-source during development:

```json
{
  "mcpServers": {
    "bergauf": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/bergauf/src/index.ts"]
    }
  }
}
```

Restart Claude Desktop. The seven tools appear under the bergauf server.

## Example prompts

- _"Plan me a 4-hour day hike from Zurich this Saturday. I want to take the train there and back."_
- _"What's the weather like at the top of Säntis tomorrow?"_
- _"Show me the elevation profile for ViaJacobi between Rapperswil and Einsiedeln."_

The LLM composes the tools: `search_location` → `list_named_routes` →
`get_named_route` → `get_hike_profile` → `forecast` → `nearest_stations` →
`plan_transit`.

## Development

```bash
bun test          # unit tests (no live API calls)
bun run typecheck # tsc --noEmit
bun run lint      # biome check
bun run format    # biome format --write
```

API client tests stub `fetch`; no fixtures are committed. The Wanderland
attribute schema and a few transport edge cases were verified with live probes
during initial development — see `src/tools/list-named-routes.ts` for the
SwitzerlandMobility route-number → category convention.

## External APIs

All free, public, no auth:

- **geo.admin.ch (api3)** — search, Wanderland identify, elevation profile,
  point elevation. Fair use: 20 req/min average. GET only.
- **transport.opendata.ch** — Swiss public transport (locations,
  connections). Soft, undocumented rate limit.
- **Open-Meteo** — weather forecast. MeteoSwiss ICON seamless model for best
  Swiss coverage. CC BY 4.0 attribution.

## Attribution

- Hiking data: swisstopo, SchweizMobil, Swiss Hiking Federation.
- Weather data: Open-Meteo (CC BY 4.0), MeteoSwiss ICON seamless model.

## License

MIT with [Commons Clause](https://commonsclause.com/) — free to use, modify,
and self-host; selling the software (including hosted/commercial offerings
whose value derives substantially from it) requires a separate license.
See [LICENSE](./LICENSE).
