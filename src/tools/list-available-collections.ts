import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {Config} from './types.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {olioGet} from '../utils/olio-api.js';

type Business = {id: number; name: string; display_name?: string};
type Store = {id: number; name: string; business_id: number; address?: Record<string, unknown>; location?: {latitude: number; longitude: number}};
type RawListResponse = {
	collections: (Record<string, unknown> & {store_id?: number; business_id?: number})[];
	meta: {
		current_page: number;
		next_page: number | null;
		prev_page: number | null;
		total_pages: number;
		total_count: number;
		businesses: Business[];
		stores: Store[];
	};
};

const TIME_VALUES = ['morning', 'afternoon', 'earlyEvening', 'evening'] as const;

const inputSchema = strictSchemaWithAliases(
	{
		page: z.number().int().min(1).default(1).describe('Page number (default: 1).'),
		per_page: z.number().int().min(1).max(100).default(20).describe('Results per page (default: 20, max: 100).'),
		distance: z.union([z.number().positive(), z.literal('all')]).optional().describe('Maximum distance from your saved location, in your preferred units (miles in the UK). Omit or pass "all" for no limit.'),
		time: z.array(z.enum(TIME_VALUES)).optional().describe(`Time-of-day windows. Any of: ${TIME_VALUES.join(', ')}. Maps to: morning 07:00-11:59, afternoon 12:00-16:59, earlyEvening 17:00-19:59, evening 20:00-23:00. Omit for all times.`),
		store_id: z.number().int().optional().describe('Restrict to a single store id.'),
		business_id: z.number().int().optional().describe('Restrict to a single business id (e.g. 247 for Tesco, 8 for Sainsbury\'s, 387 for Waitrose).'),
		type: z.enum(['adhoc', 'recurring', 'all']).optional().describe('Slot type filter.'),
		claimable_by: z.enum(['home', 'squad', 'any']).optional().describe('Filter by who can claim: home (any volunteer in the area), squad (squad members only), or any.'),
		order: z.enum(['next_collection_asc', 'next_collection_desc', 'distance_asc']).default('next_collection_desc').describe('Sort order. Default: next_collection_desc (soonest first).'),
		date_range: z.string().optional().describe('Optional date range filter, as understood by the Volunteer Hub UI (e.g. "today", "tomorrow", or an ISO date range).'),
		include_meta_lookups: z.boolean().default(true).describe('When true (default), enrich each collection with `business` and `store` objects resolved from the meta lookup tables, so you don\'t have to cross-reference IDs.'),
	},
	{
		page_size: 'per_page',
		businessId: 'business_id',
		storeId: 'store_id',
		claimableBy: 'claimable_by',
		dateRange: 'date_range',
	},
);

function enrichCollections(data: RawListResponse): RawListResponse & {collections: Record<string, unknown>[]} {
	const businesses = new Map(data.meta.businesses.map((b) => [b.id, b]));
	const stores = new Map(data.meta.stores.map((s) => [s.id, s]));

	const collections = data.collections.map((c) => {
		const business = c.business_id !== undefined ? businesses.get(c.business_id) : undefined;
		const store = c.store_id !== undefined ? stores.get(c.store_id) : undefined;
		return {
			...c,
			business: business ? {id: business.id, name: business.display_name || business.name} : undefined,
			store: store
				? {
					id: store.id, name: store.name, address: store.address, location: store.location,
				}
				: undefined,
		};
	});

	return {...data, collections};
}

export function registerListAvailableCollections(server: McpServer, config: Config): void {
	server.registerTool(
		'list_available_collections',
		{
			title: 'List available Olio collections',
			description: `List Food Waste Hero collections that are unclaimed and within range of the volunteer's saved home location.

Each collection has an \`id\` (use with get_collection), \`store_id\` and \`business_id\` (resolved into \`store\` and \`business\` objects when include_meta_lookups is true), a \`next_collection\` ISO timestamp, a \`state\` ("unassigned" for available slots), and a \`claimable_by\` value ("home" or "squad").

To change the search location, the volunteer must update it in the Olio mobile app — the Volunteer Hub does not expose a location-override API.

The response \`meta\` block contains pagination info (current_page, next_page, total_pages, total_count) and lookup tables (businesses, stores) for any IDs referenced.`,
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const params: Record<string, string | number> = {
				page: args.page,
				per_page: args.per_page,
				order: args.order,
			};

			if (args.distance !== undefined) {
				params.distance = args.distance === 'all' ? 'all' : args.distance;
			}

			if (args.time && args.time.length > 0) {
				params.time = args.time.join(',');
			}

			if (args.store_id !== undefined) {
				params.storeid = args.store_id;
			}

			if (args.business_id !== undefined) {
				params.businessid = args.business_id;
			}

			if (args.type) {
				params.type = args.type;
			}

			if (args.claimable_by) {
				params.claimableBy = args.claimable_by;
			}

			if (args.date_range) {
				params.dateRange = args.date_range;
			}

			const data = await olioGet(config, '/api/v4/collections/available', params) as RawListResponse;
			const enriched = args.include_meta_lookups ? enrichCollections(data) : data;

			return jsonResult(enriched);
		},
	);
}
