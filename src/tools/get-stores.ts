import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {Config} from './types.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {olioGetWithArrayParam} from '../utils/olio-api.js';

const inputSchema = strictSchemaWithAliases(
	{
		ids: z.array(z.number().int()).min(1).describe('Store ids to look up. Returns one entry per id.'),
	},
	{
		store_ids: 'ids',
		id: 'ids',
	},
);

export function registerGetStores(server: McpServer, config: Config): void {
	server.registerTool(
		'get_stores',
		{
			title: 'Get stores by id',
			description: 'Resolve store ids to full store records (name, address, location, business_id, squad captain, timezone).',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const data = await olioGetWithArrayParam(config, '/api/v1/stores', 'ids[]', args.ids);
			return jsonResult({stores: data});
		},
	);
}
