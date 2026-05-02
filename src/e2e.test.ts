import {
	describe, test, expect, beforeAll, afterAll,
} from 'vitest';
import type {
	CallToolResult,
	JSONRPCMessage,
	JSONRPCRequest,
	JSONRPCResponse,
	ListToolsResult,
} from '@modelcontextprotocol/sdk/types.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from './index.js';

// E2E tests hit the real Volunteer Hub API. They're skipped unless
// OLIO_SESSION_ID is set — copy the `_session_id` cookie from a logged-in
// browser session at https://volunteers.olioex.com.
const SESSION_ID = process.env.OLIO_SESSION_ID;

type MCPClient = {
	sendRequest: <T>(message: JSONRPCRequest) => Promise<T>;
	close: () => Promise<void>;
};

async function createInMemoryClient(): Promise<MCPClient> {
	const server = createServer({
		sessionId: SESSION_ID!,
		baseUrl: 'https://volunteers.olioex.com',
	});
	const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
	await server.connect(serverTransport);

	const sendRequest = async <T>(message: JSONRPCRequest): Promise<T> => {
		return new Promise((resolve, reject) => {
			clientTransport.onmessage = (response: JSONRPCMessage) => {
				const typedResponse = response as JSONRPCResponse;
				if ('result' in typedResponse) {
					resolve(typedResponse.result as T);
					return;
				}

				reject(new Error('No result in response'));
			};

			clientTransport.onerror = (err: Error) => {
				reject(err);
			};

			clientTransport.send(message).catch((err: unknown) => {
				reject(err instanceof Error ? err : new Error(String(err)));
			});
		});
	};

	return {
		sendRequest,
		close: async () => server.close(),
	};
}

describe.skipIf(!SESSION_ID)('e2e: Olio Volunteer Hub', () => {
	let client: MCPClient;

	beforeAll(async () => {
		client = await createInMemoryClient();
	}, 30_000);

	afterAll(async () => {
		if (client) {
			await client.close();
		}
	});

	test('lists all expected tools', async () => {
		const result = await client.sendRequest<ListToolsResult>({
			jsonrpc: '2.0',
			id: '1',
			method: 'tools/list',
			params: {},
		});

		expect(result.tools.map((t) => t.name).sort()).toEqual([
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
	}, 10_000);

	test('list_available_collections returns the expected response shape', async () => {
		const result = await client.sendRequest<CallToolResult>({
			jsonrpc: '2.0',
			id: '2',
			method: 'tools/call',
			params: {
				name: 'list_available_collections',
				arguments: {per_page: 1, include_meta_lookups: false},
			},
		});

		expect(result).toMatchObject({content: [{type: 'text', text: expect.any(String)}]});
		const body = JSON.parse(result.content[0]!.text as string);
		expect(body).toMatchObject({
			collections: expect.any(Array),
			meta: expect.objectContaining({
				current_page: 1,
				total_count: expect.any(Number),
				total_pages: expect.any(Number),
			}),
		});
	}, 30_000);

	test('get_current_user returns the logged-in volunteer', async () => {
		const result = await client.sendRequest<CallToolResult>({
			jsonrpc: '2.0',
			id: '3',
			method: 'tools/call',
			params: {
				name: 'get_current_user',
				arguments: {},
			},
		});

		expect(result).toMatchObject({content: [{type: 'text', text: expect.any(String)}]});
		const user = JSON.parse(result.content[0]!.text as string);
		expect(user).toMatchObject({
			id: expect.any(Number),
			email: expect.any(String),
			roles: expect.arrayContaining(['Volunteer']),
		});
	}, 30_000);

	test('a collection can be fetched, with store and business resolved', async () => {
		const list = await client.sendRequest<CallToolResult>({
			jsonrpc: '2.0',
			id: '4',
			method: 'tools/call',
			params: {
				name: 'list_available_collections',
				arguments: {per_page: 1, include_meta_lookups: false},
			},
		});
		const listBody = JSON.parse(list.content[0]!.text as string);
		if (listBody.collections.length === 0) {
			console.warn('No available collections in this account, skipping detail check');
			return;
		}

		const id = listBody.collections[0].id as number;

		const detail = await client.sendRequest<CallToolResult>({
			jsonrpc: '2.0',
			id: '5',
			method: 'tools/call',
			params: {
				name: 'get_collection',
				arguments: {id},
			},
		});

		const detailBody = JSON.parse(detail.content[0]!.text as string);
		expect(detailBody).toMatchObject({
			collection: expect.objectContaining({id, store_id: expect.any(Number)}),
			store: expect.objectContaining({id: expect.any(Number), business_id: expect.any(Number)}),
			business: expect.objectContaining({id: expect.any(Number), name: expect.any(String)}),
		});
	}, 60_000);
});
