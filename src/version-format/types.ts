export const DRAFTLINE_SCHEMA = 1 as const;

export const DOCUMENT_MARKER_PREFIX = '%% draftline-document ';
export const VERSION_MARKER_PREFIX = '%% draftline-version ';
export const MARKER_SUFFIX = ' %%';

export const ACTIVE_CALLOUT = 'draftline-active';
export const INACTIVE_CALLOUT = 'draftline-version';

export interface DocumentMeta {
	schema: typeof DRAFTLINE_SCHEMA;
	latestVersionId: string;
}

export interface VersionMeta {
	id: string;
	number: number;
	createdAt: string;
	parentId: string | null;
}

export interface VersionSnapshot {
	meta: VersionMeta;
	/** Unquoted Markdown body for this version (no leading `> `). */
	body: string;
	active: boolean;
}

export interface VersionedDocument {
	frontmatter: string;
	document: DocumentMeta;
	versions: VersionSnapshot[];
	/** Detected body newline style (`\n` or `\r\n`). */
	newline: '\n' | '\r\n';
}

export type ParseResult =
	| { ok: true; document: VersionedDocument }
	| { ok: false; error: string };

export type UnversionedNote = {
	frontmatter: string;
	body: string;
	newline: '\n' | '\r\n';
};
