import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {Config} from './types.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {olioGet} from '../utils/olio-api.js';

const inputSchema = strictSchemaWithAliases(
	{
		collection_window_id: z.string().describe('The schedule/window id, e.g. "10124_6_9_0". Available as `schedule_id` or `window_id` on a collection.'),
		page: z.number().int().min(1).default(1).describe('Page number (default: 1).'),
		per_page: z.number().int().min(1).max(100).default(50).describe('Results per page (default: 50, max: 100).'),
		include_all: z.boolean().default(true).describe('Include articles from past instances of this collection window.'),
	},
	{
		window_id: 'collection_window_id',
		schedule_id: 'collection_window_id',
	},
);

export function registerGetCollectionArticles(server: McpServer, config: Config): void {
	server.registerTool(
		'get_collection_articles',
		{
			title: 'Get collection articles',
			description: 'List the articles (food and non-food items) that have been collected at a given collection window. Useful for understanding what kind of surplus a particular slot typically yields.',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const data = await olioGet(config, '/api/v1/articles', {
				collection_window_id: args.collection_window_id,
				search_type: 'articles',
				include_all: args.include_all ? 'true' : 'false',
				page: args.page,
				per_page: args.per_page,
			});

			return jsonResult(data);
		},
	);
}
