#!/usr/bin/env bun
// bergauf — MCP server for planning hikes in Switzerland.
//
// stdio transport, atomic tools, JSON output. The LLM client composes the tools
// to assemble a hike plan: search a place → list/pick a route → get the elevation
// profile → check the weather → plan transit to the trailhead.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from '@/tools/index.ts';

const server = new McpServer(
  { name: 'bergauf', version: '0.1.0' },
  {
    instructions: [
      'Plan hikes anywhere in Switzerland (and Liechtenstein).',
      'Typical flow:',
      '  1. search_location to resolve place names to coordinates.',
      '  2. list_named_routes to find SwitzerlandMobility Wanderland routes near a point or bbox.',
      "  3. get_named_route to fetch a specific route's geometry and metadata.",
      '  4. get_hike_profile to derive distance, ascent/descent and an SAC/DAV time estimate.',
      '  5. nearest_stations + plan_transit to figure out how to get there and back.',
      '  6. forecast to check the weather at the trailhead.',
      'Coordinates throughout are WGS84 lat/lon. Attribution: hiking data from swisstopo, SchweizMobil and the Swiss Hiking Federation; weather from Open-Meteo (CC BY 4.0).',
    ].join('\n'),
  },
);

registerTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr is the only thing safe to log on; stdout is the MCP wire.
  console.error('bergauf MCP server running on stdio');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
