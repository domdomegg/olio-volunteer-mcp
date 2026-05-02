import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {Config} from './types.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {olioGet, olioGetWithArrayParam} from '../utils/olio-api.js';

const inputSchema = strictSchemaWithAliases({
	include_business_lookups: z.boolean().default(true).describe('When true (default), also fetch the businesses for each squad so you have logos and display names alongside the stores.'),
});

export function registerListMySquads(server: McpServer, config: Config): void {
	server.registerTool(
		'list_my_squads',
		{
			title: 'List my squads (stores)',
			description: 'List the squads (stores) the volunteer is a member of — i.e. shops/sites where they have access to recurring collection slots.',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const stores = await olioGet(config, '/api/v1/stores') as {business_id: number}[];

			let businesses: unknown;
			if (args.include_business_lookups && Array.isArray(stores) && stores.length > 0) {
				const ids = [...new Set(stores.map((s) => s.business_id).filter((id) => id !== undefined && id !== null))];
				if (ids.length > 0) {
					businesses = await olioGetWithArrayParam(config, '/api/v1/businesses', 'ids[]', ids);
				}
			}

			return jsonResult({stores, businesses});
		},
	);
}
