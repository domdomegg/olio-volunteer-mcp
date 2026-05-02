import type {Config} from '../tools/types.js';

const USER_AGENT = 'olio-volunteer-mcp (https://github.com/domdomegg/olio-volunteer-mcp)';

async function handleApiError(response: Response): Promise<never> {
	const text = await response.text().catch(() => '');
	if (response.status === 401 || response.status === 403) {
		throw new Error(`Olio API auth failed (${response.status}). Your OLIO_SESSION_ID has likely expired — log in to https://volunteers.olioex.com and copy a fresh _session_id cookie.`);
	}

	throw new Error(`Olio API error: ${response.status} ${response.statusText}${text ? ` - ${text.slice(0, 500)}` : ''}`);
}

function buildHeaders(config: Config, extra?: Record<string, string>): Record<string, string> {
	return {
		Accept: 'application/json',
		'User-Agent': USER_AGENT,
		// The Volunteer Hub rejects same-origin API calls without a Referer
		// header (server-side CSRF protection), so we always send one pointing
		// at the configured base URL.
		Referer: `${config.baseUrl}/`,
		Cookie: `_session_id=${config.sessionId}`,
		...extra,
	};
}

function buildUrl(config: Config, endpoint: string, params?: Record<string, string | number | undefined | null>): URL {
	const url = new URL(endpoint, config.baseUrl);
	if (params) {
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined && value !== null && value !== '') {
				url.searchParams.set(key, String(value));
			}
		}
	}

	return url;
}

export async function olioGet(
	config: Config,
	endpoint: string,
	params?: Record<string, string | number | undefined | null>,
): Promise<unknown> {
	const url = buildUrl(config, endpoint, params);
	const response = await fetch(url.toString(), {headers: buildHeaders(config)});
	if (!response.ok) {
		await handleApiError(response);
	}

	return response.json();
}

/**
 * Some endpoints accept array query params via the `ids[]=A&ids[]=B` convention.
 * URL.searchParams handles this correctly when we append the same key multiple times.
 */
export async function olioGetWithArrayParam(
	config: Config,
	endpoint: string,
	arrayKey: string,
	values: (string | number)[],
	extraParams?: Record<string, string | number | undefined | null>,
): Promise<unknown> {
	const url = buildUrl(config, endpoint, extraParams);
	for (const v of values) {
		url.searchParams.append(arrayKey, String(v));
	}

	const response = await fetch(url.toString(), {headers: buildHeaders(config)});
	if (!response.ok) {
		await handleApiError(response);
	}

	return response.json();
}

export async function olioRequest(
	config: Config,
	method: string,
	endpoint: string,
	params?: Record<string, string | number | undefined | null>,
	jsonBody?: unknown,
): Promise<unknown> {
	if (method === 'GET' || method === 'HEAD') {
		return olioGet(config, endpoint, params);
	}

	const url = buildUrl(config, endpoint, params);
	const init: RequestInit = {
		method,
		headers: buildHeaders(config, jsonBody !== undefined ? {'Content-Type': 'application/json'} : undefined),
	};
	if (jsonBody !== undefined) {
		init.body = JSON.stringify(jsonBody);
	}

	const response = await fetch(url.toString(), init);
	if (!response.ok) {
		await handleApiError(response);
	}

	const text = await response.text();
	return text ? JSON.parse(text) : {ok: true};
}
