import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { forecastHandler, forecastInput, forecastOutput } from '@/tools/forecast.ts';
import {
  getHikeProfileHandler,
  getHikeProfileInput,
  getHikeProfileOutput,
} from '@/tools/get-hike-profile.ts';
import {
  getNamedRouteHandler,
  getNamedRouteInput,
  getNamedRouteOutput,
} from '@/tools/get-named-route.ts';
import {
  listNamedRoutesHandler,
  listNamedRoutesInput,
  listNamedRoutesOutput,
} from '@/tools/list-named-routes.ts';
import {
  nearestStationsHandler,
  nearestStationsInput,
  nearestStationsOutput,
} from '@/tools/nearest-stations.ts';
import { planTransitHandler, planTransitInput, planTransitOutput } from '@/tools/plan-transit.ts';
import {
  searchLocationHandler,
  searchLocationInput,
  searchLocationOutput,
} from '@/tools/search-location.ts';

// Wrap a typed handler so its JSON result is returned both as text and
// structuredContent. Errors become isError tool responses rather than throwing.
//
// The error path deliberately omits structuredContent: when isError is true and
// the tool has an outputSchema, the MCP client validates any present
// structuredContent against the schema unconditionally (client/index.js
// line ~504), so returning a { error } shape would fail validation against
// success schemas like { results: [] }. Missing structuredContent on isError
// is the spec-compliant shape (client/index.js line ~500).
export function jsonTool<I, O>(handler: (args: I) => Promise<O>) {
  return async (args: I) => {
    try {
      const out = await handler(args);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(out, null, 2) }],
        structuredContent: out as Record<string, unknown>,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  };
}

export function registerTools(server: McpServer): void {
  server.registerTool(
    'search_location',
    {
      description:
        'Resolve a free-text Swiss place name (town, mountain, station, address) to coordinates. Always use this first when the user mentions a place.',
      inputSchema: searchLocationInput,
      outputSchema: searchLocationOutput,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    jsonTool(searchLocationHandler),
  );

  server.registerTool(
    'list_named_routes',
    {
      description:
        'List named SwitzerlandMobility (Wanderland) hiking routes — national, regional, and local. Pass a WGS84 bbox to narrow down to a region; otherwise queries all of Switzerland.',
      inputSchema: listNamedRoutesInput,
      outputSchema: listNamedRoutesOutput,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    jsonTool(listNamedRoutesHandler),
  );

  server.registerTool(
    'get_named_route',
    {
      description:
        'Fetch a single Wanderland route by its feature id (as returned by list_named_routes). Returns attributes (name, number, category, length) and the full geometry (LineString or MultiLineString).',
      inputSchema: getNamedRouteInput,
      outputSchema: getNamedRouteOutput,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    jsonTool(getNamedRouteHandler),
  );

  server.registerTool(
    'get_hike_profile',
    {
      description:
        'Given a WGS84 GeoJSON LineString (usually the geometry from get_named_route), return distance, ascent, descent, max/min elevation, elevation samples, and an estimated walking time using the SAC/DAV formula.',
      inputSchema: getHikeProfileInput,
      outputSchema: getHikeProfileOutput,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    jsonTool(getHikeProfileHandler),
  );

  server.registerTool(
    'nearest_stations',
    {
      description:
        'Find public transport stations (train/bus/tram) near a WGS84 point. Useful for finding a trailhead station or the nearest stop to a finish point.',
      inputSchema: nearestStationsInput,
      outputSchema: nearestStationsOutput,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    jsonTool(nearestStationsHandler),
  );

  server.registerTool(
    'plan_transit',
    {
      description:
        'Plan a Swiss public transport connection between two stations or addresses. Specify either when to depart (mode="departure") or when to arrive (mode="arrival").',
      inputSchema: planTransitInput,
      outputSchema: planTransitOutput,
      annotations: { readOnlyHint: true },
    },
    jsonTool(planTransitHandler),
  );

  server.registerTool(
    'forecast',
    {
      description:
        'Hourly + daily weather forecast for a WGS84 point, using the MeteoSwiss ICON seamless model via Open-Meteo. Use the trailhead coordinates.',
      inputSchema: forecastInput,
      outputSchema: forecastOutput,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    jsonTool(forecastHandler),
  );
}
