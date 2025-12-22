import { type } from 'arktype';

export const ExternalLink = type({
	type: 'string',
	url: 'string'
});

export const ModResponseLinks = type({
	self: 'string',
	info: 'string',
	thumbnail: 'string',
	versions: 'string'
});

export const ModResponse = type({
	'status?': 'string', // Maps to db.PublicationStatus
	id: 'string <= 100',
	name: 'string <= 100',
	author: 'string <= 100',
	description: 'string <= 500',
	created_at: 'number',
	updated_at: 'number',
	downloads: 'number',
	_links: ModResponseLinks
});

export const ModInfoResponse = type({
	long_description: 'string <= 20000',
	license: 'string <= 100',
	links: type(ExternalLink.array()),
	tags: 'string[]'
});

// TypeScript Types
export type Mod = typeof ModResponse.infer;
export type ModInfo = typeof ModInfoResponse.infer;
export type ExternalLink = typeof ExternalLink.infer;
