import { splitFrontmatter } from './frontmatter';
import { createVersionId } from './ids';
import { isDraftlineDocument, parseVersionedDocument } from './parse';
import { serializeDocument } from './serialize';
import { validateDocument } from './validate';
import {
	DRAFTLINE_SCHEMA,
	type VersionSnapshot,
	type VersionedDocument,
} from './types';

export type OperationResult =
	| { ok: true; content: string; document: VersionedDocument }
	| { ok: false; error: string };

function requireValid(doc: VersionedDocument): string | null {
	return validateDocument(doc);
}

function cloneDocument(doc: VersionedDocument): VersionedDocument {
	return {
		frontmatter: doc.frontmatter,
		document: { ...doc.document },
		newline: doc.newline,
		versions: doc.versions.map((v) => ({
			active: v.active,
			body: v.body,
			meta: { ...v.meta },
		})),
	};
}

function getActive(doc: VersionedDocument): VersionSnapshot {
	const active = doc.versions.find((v) => v.active);
	if (!active) {
		throw new Error('No active version.');
	}
	return active;
}

/**
 * Wrap an unversioned note body as Version 1.
 */
export function initializeVersionedNote(
	content: string,
	options?: { now?: Date; id?: string },
): OperationResult {
	const parsed = parseVersionedDocument(content);
	if (parsed.ok) {
		return { ok: false, error: 'Note is already a Draftline document.' };
	}

	const { frontmatter, body, newline } = splitFrontmatter(content);
	const trimmedBody = body.replace(/^\r?\n+/, '').replace(/\r?\n+$/, '');
	const id = options?.id ?? createVersionId();
	const createdAt = (options?.now ?? new Date()).toISOString();

	const document: VersionedDocument = {
		frontmatter,
		newline,
		document: {
			schema: DRAFTLINE_SCHEMA,
			latestVersionId: id,
		},
		versions: [
			{
				active: true,
				body: trimmedBody,
				meta: {
					id,
					number: 1,
					createdAt,
					parentId: null,
				},
			},
		],
	};

	const error = requireValid(document);
	if (error) {
		return { ok: false, error };
	}

	return {
		ok: true,
		content: serializeDocument(document),
		document,
	};
}

/**
 * Duplicate the currently active version into a new latest editable version.
 */
export function createVersionFromActive(
	content: string,
	options?: { now?: Date; id?: string },
): OperationResult {
	const parsed = parseVersionedDocument(content);
	if (!parsed.ok) {
		if (isDraftlineDocument(content)) {
			return { ok: false, error: parsed.error };
		}
		// First create initializes an unversioned note.
		return initializeVersionedNote(content, options);
	}

	const error = requireValid(parsed.document);
	if (error) {
		return { ok: false, error };
	}

	const doc = cloneDocument(parsed.document);
	const active = getActive(doc);
	const nextNumber =
		doc.versions.reduce((max, v) => Math.max(max, v.meta.number), 0) + 1;
	const id = options?.id ?? createVersionId();
	const createdAt = (options?.now ?? new Date()).toISOString();

	for (const version of doc.versions) {
		version.active = false;
	}

	doc.versions.unshift({
		active: true,
		body: active.body,
		meta: {
			id,
			number: nextNumber,
			createdAt,
			parentId: active.meta.id,
		},
	});
	doc.document.latestVersionId = id;

	const validationError = requireValid(doc);
	if (validationError) {
		return { ok: false, error: validationError };
	}

	return {
		ok: true,
		content: serializeDocument(doc),
		document: doc,
	};
}

/**
 * Switch which version is active by rewriting only callout openers via full serialize.
 * Snapshot bodies are preserved.
 */
export function switchActiveVersion(
	content: string,
	versionId: string,
): OperationResult {
	const parsed = parseVersionedDocument(content);
	if (!parsed.ok) {
		return { ok: false, error: parsed.error };
	}

	const error = requireValid(parsed.document);
	if (error) {
		return { ok: false, error };
	}

	const doc = cloneDocument(parsed.document);
	const target = doc.versions.find((v) => v.meta.id === versionId);
	if (!target) {
		return { ok: false, error: `Version ${versionId} was not found.` };
	}

	for (const version of doc.versions) {
		version.active = version.meta.id === versionId;
	}

	const validationError = requireValid(doc);
	if (validationError) {
		return { ok: false, error: validationError };
	}

	return {
		ok: true,
		content: serializeDocument(doc),
		document: doc,
	};
}

export function getActiveVersion(
	doc: VersionedDocument,
): VersionSnapshot | null {
	return doc.versions.find((v) => v.active) ?? null;
}

export function listVersionsNewestFirst(
	doc: VersionedDocument,
): VersionSnapshot[] {
	return [...doc.versions].sort((a, b) => b.meta.number - a.meta.number);
}

/**
 * Replace the active version body after an editor edit of the unquoted content.
 */
export function updateActiveBody(
	content: string,
	nextBody: string,
): OperationResult {
	const parsed = parseVersionedDocument(content);
	if (!parsed.ok) {
		return { ok: false, error: parsed.error };
	}

	const error = requireValid(parsed.document);
	if (error) {
		return { ok: false, error };
	}

	const doc = cloneDocument(parsed.document);
	const active = getActive(doc);
	active.body = nextBody;

	return {
		ok: true,
		content: serializeDocument(doc),
		document: doc,
	};
}
