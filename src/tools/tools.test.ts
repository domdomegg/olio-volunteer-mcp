import {describe, expect, it} from 'vitest';
import {createServer} from '../index.js';

describe('createServer', () => {
	it('registers all expected tools', async () => {
		const server = createServer({
			sessionId: 'test',
			baseUrl: 'https://volunteers.olioex.com',
		});

		// Reach into the underlying server to list registered tools.
		// This is the same surface the MCP client would see via tools/list.
		const internal = (server as unknown as {server: {_requestHandlers: Map<string, unknown>}}).server;
		expect(internal._requestHandlers.has('tools/list')).toBe(true);
		expect(internal._requestHandlers.has('tools/call')).toBe(true);

		// Tools are stored on the McpServer instance under a private field.
		// We assert via the public registerTool surface having been called for each.
		const tools = (server as unknown as {_registeredTools: Record<string, unknown>})._registeredTools;
		expect(Object.keys(tools).sort()).toEqual([
			'call_api',
			'get_businesses',
			'get_collection',
			'get_collection_articles',
			'get_current_user',
			'get_stores',
			'list_available_collections',
			'list_my_collections',
			'list_my_squads',
		]);
	});
});
