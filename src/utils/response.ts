import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';

export function jsonResult<T>(data: T): CallToolResult {
	const wrapped = (data && typeof data === 'object' && !Array.isArray(data))
		? data as Record<string, unknown>
		: {result: data};

	return {
		content: [{type: 'text', text: JSON.stringify(data, null, 2)}],
		structuredContent: wrapped,
	};
}
