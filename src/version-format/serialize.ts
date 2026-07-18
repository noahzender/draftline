import {
	ACTIVE_CALLOUT,
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

export function serializeVersionBlock(
	version: VersionSnapshot,
	newline: '\n' | '\r\n',
): string {
	const callout = version.active ? ACTIVE_CALLOUT : INACTIVE_CALLOUT;
	const opener = `> [!${callout}]`;
	const markerLine = `> ${serializeVersionMarker(version.meta)}`;
	const bodyQuoted = quoteBody(version.body, newline);
	const parts = [opener, markerLine];
	if (bodyQuoted.length > 0) {
		parts.push(bodyQuoted);
	}
	return parts.join(newline);
}

/**
 * Serialize a versioned document back to Markdown.
 * Versions are written newest-first (active typically first).
 */
export function serializeDocument(doc: VersionedDocument): string {
	const { newline } = doc;
	const chunks: string[] = [];

	if (doc.frontmatter) {
		chunks.push(doc.frontmatter.replace(/\r?\n$/, '') + newline);
	}

	chunks.push(serializeDocumentMarker(doc.document) + newline + newline);

	const ordered = [...doc.versions].sort((a, b) => {
		if (a.active !== b.active) {
			return a.active ? -1 : 1;
		}
		return b.meta.number - a.meta.number;
	});

	for (let i = 0; i < ordered.length; i++) {
		chunks.push(serializeVersionBlock(ordered[i]!, newline));
		if (i < ordered.length - 1) {
			chunks.push(newline + newline);
		} else {
			chunks.push(newline);
		}
	}

	return chunks.join('');
}
