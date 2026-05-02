import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {olioGet} from '../utils/olio-api.js';

const inputSchema = strictSchemaWithAliases({});

export function registerGetCurrentUser(server: McpServer, config: Config): void {
	server.registerTool(
		'get_current_user',
		{
			title: 'Get current user',
			description: 'Get the volunteer profile associated with the configured OLIO_SESSION_ID, including saved home location, roles, address, preferences, and notification settings.',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async () => {
			const data = await olioGet(config, '/api/v1/users/me');
			return jsonResult(data);
		},
	);
}
