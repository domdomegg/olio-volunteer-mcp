import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {Config} from './types.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {olioGetWithArrayParam} from '../utils/olio-api.js';

const inputSchema = strictSchemaWithAliases(
	{
		ids: z.array(z.number().int()).min(1).describe('Business ids to look up. Returns one entry per id.'),
	},
	{
		business_ids: 'ids',
		id: 'ids',
	},
);

export function registerGetBusinesses(server: McpServer, config: Config): void {
	server.registerTool(
		'get_businesses',
		{
			title: 'Get businesses by id',
			description: 'Resolve business ids to full business records (name, display_name, logo, supply_type, details/instructions HTML).',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const data = await olioGetWithArrayParam(config, '/api/v1/businesses', 'ids[]', args.ids);
			return jsonResult({businesses: data});
		},
	);
}
