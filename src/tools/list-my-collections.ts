import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {Config} from './types.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {olioGet} from '../utils/olio-api.js';

const inputSchema = strictSchemaWithAliases({
	include_history: z.boolean().default(false).describe('When true, returns past collections via /api/v4/collections/history. When false (default), returns upcoming/active collections via /api/v1/collections.'),
	page: z.number().int().min(1).default(1).describe('Page number (history endpoint is paginated; default 1).'),
	per_page: z.number().int().min(1).max(100).default(20).describe('Results per page (history endpoint; default 20, max 100).'),
});

export function registerListMyCollections(server: McpServer, config: Config): void {
	server.registerTool(
		'list_my_collections',
		{
			title: 'List my collections',
			description: 'List the volunteer\'s own collections — upcoming/active by default, or past collections when include_history is true.',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			if (args.include_history) {
				const data = await olioGet(config, '/api/v4/collections/history', {
					page: args.page,
					per_page: args.per_page,
				});
				return jsonResult(data);
			}

			const data = await olioGet(config, '/api/v1/collections');
			return jsonResult(data);
		},
	);
}
