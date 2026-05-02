#!/usr/bin/env node
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {createServer} from './index.js';
import type {Config} from './tools/types.js';

function setupSignalHandlers(cleanup: () => Promise<void>): void {
	process.on('SIGINT', async () => {
		await cleanup();
		process.exit(0);
	});
	process.on('SIGTERM', async () => {
		await cleanup();
		process.exit(0);
	});
}

function getConfig(): Config {
	const sessionId = process.env.OLIO_SESSION_ID;
	if (!sessionId) {
		console.error('olio-volunteer-mcp: OLIO_SESSION_ID is required');
		console.error('Get it from the `_session_id` cookie at https://volunteers.olioex.com (DevTools → Application → Cookies)');
		process.exit(1);
	}

	return {
		sessionId,
		baseUrl: process.env.OLIO_BASE_URL || 'https://volunteers.olioex.com',
	};
}

(async () => {
	const config = getConfig();
	const server = createServer(config);
	setupSignalHandlers(async () => server.close());

	const stdioTransport = new StdioServerTransport();
	await server.connect(stdioTransport);
	console.error('olio-volunteer-mcp running on stdio');
})();
