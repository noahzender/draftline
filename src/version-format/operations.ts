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

export type VersionOperationOptions = {
	now?: Date;
	/** Id for the new active version (Version 2 on first create). */
	id?: string;
	/** Id for the archived original (Version 1 on first create). */
	parentId?: string;
};

/**
 * On first Create Version: archive the original body as Version 1 and open an
 * editable Version 2 duplicate. Later calls use createVersionFromActive.
 */
export function initializeVersionedNote(
	content: string,
	options?: VersionOperationOptions,
): OperationResult {
	const parsed = parseVersionedDocument(content);
	if (parsed.ok) {
		return { ok: false, error: 'Note is already a Draftline document.' };
	}

	const { frontmatter, body, newline } = splitFrontmatter(content);
	const trimmedBody = body.replace(/^\r?\n+/, '').replace(/\r?\n+$/, '');
	const parentId = options?.parentId ?? createVersionId();
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
				active: false,
				body: trimmedBody,
				meta: {
					id: parentId,
					number: 1,
					createdAt,
					parentId: null,
				},
			},
			{
				active: true,
				body: trimmedBody,
				meta: {
					id,
					number: 2,
					createdAt,
					parentId,
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
 * For unversioned notes, archives the original as Version 1 and opens Version 2.
 */
export function createVersionFromActive(
	content: string,
	options?: VersionOperationOptions,
): OperationResult {
	const parsed = parseVersionedDocument(content);
	if (!parsed.ok) {
		if (isDraftlineDocument(content)) {
			return { ok: false, error: parsed.error };
		}
		// First create archives the original as Version 1 and opens Version 2.
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
 * Switch which version is active by promoting its body to the plain region
 * and archiving the previous active snapshot into an inactive callout.
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
