import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {Config} from './types.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {olioGet, olioGetWithArrayParam} from '../utils/olio-api.js';

type Collection = {
	[key: string]: unknown;
	id: number;
	store_id: number;
	user_id: number | null;
	state: string;
};

type Store = {[key: string]: unknown; id: number; business_id: number};
type Business = Record<string, unknown>;

const inputSchema = strictSchemaWithAliases(
	{
		id: z.number().int().describe('Collection id (e.g. from list_available_collections or list_my_collections).'),
		include_inductions: z.boolean().default(false).describe('Also fetch the inductions required to claim this collection.'),
	},
	{
		collection_id: 'id',
	},
);

export function registerGetCollection(server: McpServer, config: Config): void {
	server.registerTool(
		'get_collection',
		{
			title: 'Get collection',
			description: `Get full details for a single collection by id, plus the resolved store and business records. The collection itself comes from /api/v1/collections/:id; this tool also fetches the parent store and business so you don't need three round trips.

When \`include_inductions\` is true, also fetches the inductions a volunteer must complete before they can claim this slot (each induction has an \`is_complete\` flag for the current user).`,
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const collection = await olioGet(config, `/api/v1/collections/${args.id}`) as Collection;

			const stores = await olioGetWithArrayParam(config, '/api/v1/stores', 'ids[]', [collection.store_id]) as Store[];
			const store = stores[0];

			let business: Business | undefined;
			if (store?.business_id !== undefined) {
				const businesses = await olioGetWithArrayParam(config, '/api/v1/businesses', 'ids[]', [store.business_id]) as Business[];
				business = businesses[0];
			}

			let inductions: unknown;
			if (args.include_inductions) {
				inductions = await olioGet(config, `/api/v4/collections/${args.id}/inductions`);
			}

			const result: Record<string, unknown> = {collection, store, business};
			if (args.include_inductions) {
				result.inductions = inductions;
			}

			return jsonResult(result);
		},
	);
}
