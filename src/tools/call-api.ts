import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {Config} from './types.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {olioRequest} from '../utils/olio-api.js';

const inputSchema = strictSchemaWithAliases(
	{
		method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET').describe('HTTP method (default: GET).'),
		endpoint: z.string().describe('API path, e.g. "/api/v4/collections/available" or "/api/v1/collections/123".'),
		params: z.record(z.union([z.string(), z.number()])).optional().describe('Query parameters.'),
		json_body: z.record(z.unknown()).optional().describe('JSON request body for non-GET methods.'),
	},
	{
		path: 'endpoint',
		url: 'endpoint',
		body: 'json_body',
	},
);

export function registerCallApi(server: McpServer, config: Config): void {
	server.registerTool(
		'call_api',
		{
			title: 'Call API',
			description: `Escape hatch for calling any Volunteer Hub endpoint directly. The session cookie is added automatically.

The Volunteer Hub does not publish an API spec, so this is useful for endpoints not already wrapped by a dedicated tool. Known read-only endpoints include:

- GET /api/v4/collections/available — list available collections
- GET /api/v1/collections — my upcoming collections
- GET /api/v4/collections/history — my historical collections
- GET /api/v1/collections/:id — collection detail
- GET /api/v4/collections/:id/inductions — required inductions for a collection
- GET /api/v4/collections/schedules/:scheduleId — schedule with all instances
- GET /api/v1/articles?collection_window_id=:id — articles collected at a window
- GET /api/v1/stores, /api/v1/stores?ids[]=... — squads / store lookup
- GET /api/v1/businesses?ids[]=... — business lookup
- GET /api/v1/users/me, /api/v1/users/:id — user lookup
- GET /api/v4/inductions — all inductions for the current user`,
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const data = await olioRequest(config, args.method, args.endpoint, args.params, args.json_body);
			return jsonResult(data as Record<string, unknown>);
		},
	);
}
