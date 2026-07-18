import { splitFrontmatter } from './frontmatter';
import { unquoteBody } from './quote';
import {
	ACTIVE_CALLOUT,
	DOCUMENT_MARKER_PREFIX,
	DRAFTLINE_SCHEMA,
	INACTIVE_CALLOUT,
	MARKER_SUFFIX,
	VERSION_MARKER_PREFIX,
	type DocumentMeta,
	type ParseResult,
	type VersionMeta,
	type VersionSnapshot,
	type VersionedDocument,
} from './types';

function parseJsonPayload<T>(raw: string, label: string): T | string {
	try {
		return JSON.parse(raw) as T;
	} catch {
		return `Invalid ${label} JSON.`;
	}
}

function extractMarker(
	line: string,
	prefix: string,
): string | null {
	const trimmed = line.trim();
	if (!trimmed.startsWith(prefix) || !trimmed.endsWith(MARKER_SUFFIX)) {
		return null;
	}
	return trimmed.slice(prefix.length, trimmed.length - MARKER_SUFFIX.length);
}

function isCalloutOpener(line: string): 'active' | 'inactive' | null {
	const trimmed = line.trim();
	if (trimmed === `> [!${ACTIVE_CALLOUT}]` || trimmed === `>[!${ACTIVE_CALLOUT}]`) {
		return 'active';
	}
	if (
		trimmed === `> [!${INACTIVE_CALLOUT}]` ||
		trimmed === `>[!${INACTIVE_CALLOUT}]`
	) {
		return 'inactive';
	}
	return null;
}

function isQuotedLine(line: string): boolean {
	return line.startsWith('>') || line.trim() === '';
}

/**
 * Parse a Draftline-versioned note. Returns an error string for malformed structure.
 */
export function parseVersionedDocument(content: string): ParseResult {
	const { frontmatter, body, newline } = splitFrontmatter(content);
	const lines = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

	let index = 0;
	while (index < lines.length && lines[index]!.trim() === '') {
		index++;
	}

	if (index >= lines.length) {
		return { ok: false, error: 'Missing Draftline document marker.' };
	}

	const docPayload = extractMarker(lines[index]!, DOCUMENT_MARKER_PREFIX);
	if (docPayload === null) {
		return { ok: false, error: 'Missing Draftline document marker.' };
	}

	const documentOrError = parseJsonPayload<DocumentMeta>(
		docPayload,
		'document marker',
	);
	if (typeof documentOrError === 'string') {
		return { ok: false, error: documentOrError };
	}
	const document = documentOrError;
	if (document.schema !== DRAFTLINE_SCHEMA) {
		return {
			ok: false,
			error: `Unsupported Draftline schema version: ${String(document.schema)}.`,
		};
	}
	if (typeof document.latestVersionId !== 'string' || !document.latestVersionId) {
		return { ok: false, error: 'Document marker is missing latestVersionId.' };
	}

	index++;
	while (index < lines.length && lines[index]!.trim() === '') {
		index++;
	}

	const versions: VersionSnapshot[] = [];

	while (index < lines.length) {
		while (index < lines.length && lines[index]!.trim() === '') {
			index++;
		}
		if (index >= lines.length) {
			break;
		}

		const activity = isCalloutOpener(lines[index]!);
		if (!activity) {
			return {
				ok: false,
				error: `Expected a Draftline version callout, found: ${lines[index]!.slice(0, 80)}`,
			};
		}
		index++;

		if (index >= lines.length) {
			return { ok: false, error: 'Version callout is missing its version marker.' };
		}

		const versionLine = lines[index]!;
		const unquotedMarkerLine = unquoteBody(versionLine).trim();
		const versionPayload = extractMarker(
			unquotedMarkerLine.startsWith('%%')
				? unquotedMarkerLine
				: versionLine.trim().replace(/^>\s?/, ''),
			VERSION_MARKER_PREFIX,
		);
		// Prefer parsing from unquoted form.
		const payload =
			extractMarker(unquotedMarkerLine, VERSION_MARKER_PREFIX) ?? versionPayload;
		if (payload === null) {
			return { ok: false, error: 'Version callout is missing its version marker.' };
		}

		const metaOrError = parseJsonPayload<VersionMeta>(payload, 'version marker');
		if (typeof metaOrError === 'string') {
			return { ok: false, error: metaOrError };
		}
		const meta = metaOrError;
		if (typeof meta.id !== 'string' || !meta.id) {
			return { ok: false, error: 'Version marker is missing id.' };
		}
		if (typeof meta.number !== 'number' || !Number.isInteger(meta.number) || meta.number < 1) {
			return { ok: false, error: `Version ${meta.id} has an invalid number.` };
		}
		if (typeof meta.createdAt !== 'string' || !meta.createdAt) {
			return { ok: false, error: `Version ${meta.id} is missing createdAt.` };
		}
		if (meta.parentId !== null && typeof meta.parentId !== 'string') {
			return { ok: false, error: `Version ${meta.id} has an invalid parentId.` };
		}

		index++;
		const bodyLines: string[] = [];
		while (index < lines.length) {
			const line = lines[index]!;
			if (line.trim() === '') {
				// Blank line: could be separator between callouts or part of body.
				// Look ahead for next callout opener.
				let look = index + 1;
				while (look < lines.length && lines[look]!.trim() === '') {
					look++;
				}
				if (look < lines.length && isCalloutOpener(lines[look]!)) {
					break;
				}
				// Part of the version body (empty quoted line omitted — treat as blank).
				bodyLines.push('');
				index++;
				continue;
			}
			if (isCalloutOpener(line)) {
				break;
			}
			if (!isQuotedLine(line) && !line.startsWith('>')) {
				return {
					ok: false,
					error: `Unexpected unquoted content inside version ${meta.id}.`,
				};
			}
			bodyLines.push(line);
			index++;
		}

		// Trim trailing blank body lines introduced as separators.
		while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1] === '') {
			bodyLines.pop();
		}

		const quotedBody = bodyLines.join('\n');
		const body = unquoteBody(quotedBody);

		versions.push({
			meta,
			body,
			active: activity === 'active',
		});
	}

	if (versions.length === 0) {
		return { ok: false, error: 'No Draftline versions found.' };
	}

	const documentModel: VersionedDocument = {
		frontmatter,
		document,
		versions,
		newline,
	};

	return { ok: true, document: documentModel };
}

export function isDraftlineDocument(content: string): boolean {
	const { body } = splitFrontmatter(content);
	return body.includes(DOCUMENT_MARKER_PREFIX);
}
