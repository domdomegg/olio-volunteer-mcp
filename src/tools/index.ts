import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {registerListAvailableCollections} from './list-available-collections.js';
import {registerGetCollection} from './get-collection.js';
import {registerGetCollectionArticles} from './get-collection-articles.js';
import {registerListMyCollections} from './list-my-collections.js';
import {registerListMySquads} from './list-my-squads.js';
import {registerGetStores} from './get-stores.js';
import {registerGetBusinesses} from './get-businesses.js';
import {registerGetCurrentUser} from './get-current-user.js';
import {registerCallApi} from './call-api.js';

export type {Config} from './types.js';

export function registerAll(server: McpServer, config: Config): void {
	registerListAvailableCollections(server, config);
	registerGetCollection(server, config);
	registerGetCollectionArticles(server, config);
	registerListMyCollections(server, config);
	registerListMySquads(server, config);
	registerGetStores(server, config);
	registerGetBusinesses(server, config);
	registerGetCurrentUser(server, config);
	registerCallApi(server, config);
}
