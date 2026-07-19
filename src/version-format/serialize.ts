import {
	DOCUMENT_MARKER_PREFIX,
	INACTIVE_CALLOUT,
	MARKER_SUFFIX,
	VERSION_MARKER_PREFIX,
	type DocumentMeta,
	type VersionMeta,
	type VersionSnapshot,
	type VersionedDocument,
} from './types';
import { quoteBody } from './quote';

export function serializeDocumentMarker(meta: DocumentMeta): string {
	return `${DOCUMENT_MARKER_PREFIX}${JSON.stringify(meta)}${MARKER_SUFFIX}`;
}

export function serializeVersionMarker(meta: VersionMeta): string {
	return `${VERSION_MARKER_PREFIX}${JSON.stringify(meta)}${MARKER_SUFFIX}`;
}

export function serializeInactiveVersionBlock(
	version: VersionSnapshot,
	newline: '\n' | '\r\n',
): string {
	const opener = `> [!${INACTIVE_CALLOUT}]`;
	const markerLine = `> ${serializeVersionMarker(version.meta)}`;
	const bodyQuoted = quoteBody(version.body, newline);
	const parts = [opener, markerLine];
	if (bodyQuoted.length > 0) {
		parts.push(bodyQuoted);
	}
	return parts.join(newline);
}

/**
 * Serialize a versioned document as schema 2 Markdown.
 * Inactive callouts first (newest-first among archives), then the unquoted
 * active version marker and plain active body through EOF.
 */
export function serializeDocument(doc: VersionedDocument): string {
	const { newline } = doc;
	const chunks: string[] = [];

	if (doc.frontmatter) {
		chunks.push(doc.frontmatter.replace(/\r?\n$/, '') + newline);
	}

	chunks.push(serializeDocumentMarker(doc.document) + newline + newline);

	const inactive = doc.versions
		.filter((v) => !v.active)
		.sort((a, b) => b.meta.number - a.meta.number);

	for (const version of inactive) {
		chunks.push(serializeInactiveVersionBlock(version, newline));
		chunks.push(newline + newline);
	}

	const active = doc.versions.find((v) => v.active);
	if (!active) {
		throw new Error('Cannot serialize a document without an active version.');
	}

	chunks.push(serializeVersionMarker(active.meta) + newline + newline);
	chunks.push(active.body);
	if (!active.body.endsWith(newline) && active.body.length > 0) {
		chunks.push(newline);
	} else if (active.body.length === 0) {
		chunks.push(newline);
	}

	return chunks.join('');
}
