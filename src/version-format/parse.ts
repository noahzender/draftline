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

function extractMarker(line: string, prefix: string): string | null {
	const trimmed = line.trim();
	if (!trimmed.startsWith(prefix) || !trimmed.endsWith(MARKER_SUFFIX)) {
		return null;
	}
	return trimmed.slice(prefix.length, trimmed.length - MARKER_SUFFIX.length);
}

function isInactiveCalloutOpener(line: string): boolean {
	const trimmed = line.trim();
	return (
		trimmed === `> [!${INACTIVE_CALLOUT}]` ||
		trimmed === `>[!${INACTIVE_CALLOUT}]`
	);
}

function isActiveCalloutOpener(line: string): boolean {
	const trimmed = line.trim();
	return (
		trimmed === `> [!${ACTIVE_CALLOUT}]` ||
		trimmed === `>[!${ACTIVE_CALLOUT}]`
	);
}

function isQuotedLine(line: string): boolean {
	return line.startsWith('>') || line.trim() === '';
}

function parseVersionMeta(
	payload: string,
): VersionMeta | string {
	const metaOrError = parseJsonPayload<VersionMeta>(payload, 'version marker');
	if (typeof metaOrError === 'string') {
		return metaOrError;
	}
	const meta = metaOrError;
	if (typeof meta.id !== 'string' || !meta.id) {
		return 'Version marker is missing id.';
	}
	if (
		typeof meta.number !== 'number' ||
		!Number.isInteger(meta.number) ||
		meta.number < 1
	) {
		return `Version ${meta.id} has an invalid number.`;
	}
	if (typeof meta.createdAt !== 'string' || !meta.createdAt) {
		return `Version ${meta.id} is missing createdAt.`;
	}
	if (meta.parentId !== null && typeof meta.parentId !== 'string') {
		return `Version ${meta.id} has an invalid parentId.`;
	}
	return meta;
}

function parseInactiveCallout(
	lines: string[],
	startIndex: number,
):
	| { ok: true; version: VersionSnapshot; nextIndex: number }
	| { ok: false; error: string } {
	let index = startIndex + 1;

	if (index >= lines.length) {
		return { ok: false, error: 'Version callout is missing its version marker.' };
	}

	const versionLine = lines[index]!;
	const unquotedMarkerLine = unquoteBody(versionLine).trim();
	const payload =
		extractMarker(unquotedMarkerLine, VERSION_MARKER_PREFIX) ??
		extractMarker(
			versionLine.trim().replace(/^>\s?/, ''),
			VERSION_MARKER_PREFIX,
		);
	if (payload === null) {
		return { ok: false, error: 'Version callout is missing its version marker.' };
	}

	const meta = parseVersionMeta(payload);
	if (typeof meta === 'string') {
		return { ok: false, error: meta };
	}

	index++;
	const bodyLines: string[] = [];
	while (index < lines.length) {
		const line = lines[index]!;
		if (line.trim() === '') {
			let look = index + 1;
			while (look < lines.length && lines[look]!.trim() === '') {
				look++;
			}
			if (
				look < lines.length &&
				(isInactiveCalloutOpener(lines[look]!) ||
					extractMarker(lines[look]!.trim(), VERSION_MARKER_PREFIX) !== null)
			) {
				break;
			}
			bodyLines.push('');
			index++;
			continue;
		}
		if (isInactiveCalloutOpener(line)) {
			break;
		}
		if (extractMarker(line.trim(), VERSION_MARKER_PREFIX) !== null) {
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

	while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1] === '') {
		bodyLines.pop();
	}

	return {
		ok: true,
		version: {
			meta,
			body: unquoteBody(bodyLines.join('\n')),
			active: false,
		},
		nextIndex: index,
	};
}

/**
 * Parse a Draftline schema 2 note. Schema 1 and malformed structure fail closed.
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
	let activeParsed = false;

	while (index < lines.length) {
		while (index < lines.length && lines[index]!.trim() === '') {
			index++;
		}
		if (index >= lines.length) {
			break;
		}

		const line = lines[index]!;

		if (isActiveCalloutOpener(line)) {
			return {
				ok: false,
				error:
					'Unsupported Draftline schema version: 1 (active callout storage).',
			};
		}

		if (isInactiveCalloutOpener(line)) {
			if (activeParsed) {
				return {
					ok: false,
					error:
						'Inactive version callouts must appear before the active version marker.',
				};
			}
			const inactive = parseInactiveCallout(lines, index);
			if (!inactive.ok) {
				return inactive;
			}
			versions.push(inactive.version);
			index = inactive.nextIndex;
			continue;
		}

		const activePayload = extractMarker(line.trim(), VERSION_MARKER_PREFIX);
		if (activePayload !== null) {
			if (activeParsed) {
				return {
					ok: false,
					error: 'Expected exactly one active version marker.',
				};
			}
			const meta = parseVersionMeta(activePayload);
			if (typeof meta === 'string') {
				return { ok: false, error: meta };
			}

			index++;
			while (index < lines.length && lines[index]!.trim() === '') {
				index++;
			}

			const bodyLines = lines.slice(index);
			// Guard: inactive callouts must not appear after the active marker.
			for (const bodyLine of bodyLines) {
				if (isInactiveCalloutOpener(bodyLine)) {
					return {
						ok: false,
						error:
							'Inactive version callouts must appear before the active version marker.',
					};
				}
			}

			let activeBody = bodyLines.join('\n');
			activeBody = activeBody.replace(/\n+$/, '');

			versions.push({
				meta,
				body: activeBody,
				active: true,
			});
			activeParsed = true;
			index = lines.length;
			continue;
		}

		return {
			ok: false,
			error: `Expected a Draftline version callout or active marker, found: ${line.slice(0, 80)}`,
		};
	}

	if (!activeParsed) {
		return { ok: false, error: 'Missing active Draftline version marker.' };
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
