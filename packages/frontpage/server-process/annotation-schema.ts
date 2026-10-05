import { createTLSchema, defaultShapeSchemas, DocumentRecordType, PageRecordType, type TLStoreSnapshot, type TLStoreSchema } from "@tldraw/tlschema";
import { ZERO_INDEX_KEY } from "@tldraw/utils";
import { T } from "@tldraw/validate";

// The same legacy schema is used by the server and the hidden client adapter.
export const legacyEmbedProps = { w: T.number, h: T.number, slug: T.string, ts: T.number, label: T.string };
export function createAnnotationSchema(): TLStoreSchema { return createTLSchema({ shapes: { ...defaultShapeSchemas, "frontpage-embed": { props: legacyEmbedProps } } }); }

/** Create state only for a real first edit, never merely for reading a page. */
export function emptyAnnotationSnapshot(annotationSchema: TLStoreSchema): { document: TLStoreSnapshot } {
	const document = DocumentRecordType.create({ id: DocumentRecordType.createId("document"), meta: { frontpageCoordinates: "document" } });
	const page = PageRecordType.create({ id: PageRecordType.createId("page"), name: "Page 1", index: ZERO_INDEX_KEY });
	return { document: { schema: annotationSchema.serialize(), store: { [document.id]: document, [page.id]: page } } };
}

/** Reuse tldraw's migration; never mix new records into an old schema stamp.
 *
 * The error result is not the only way this can fail: a snapshot with no schema
 * stamp makes tldraw throw a raw TypeError, so the reason is carried here rather
 * than left to surface as a server error nobody can act on. */
export function normalizeAnnotationSnapshot(snapshot: unknown, annotationSchema: TLStoreSchema) {
	const copy = structuredClone(snapshot) as Record<string, unknown>;
	const document = (copy.document ?? copy) as TLStoreSnapshot;
	if (document.schema === undefined || document.schema === null) throw new Error("Annotation snapshot carries no schema stamp, so it cannot be read");
	let migrated: ReturnType<TLStoreSchema["migrateStoreSnapshot"]>;
	try {
		migrated = annotationSchema.migrateStoreSnapshot(document);
	} catch (error) {
		throw new Error("Annotation snapshot cannot be read: " + (error instanceof Error ? error.message : String(error)));
	}
	if (migrated.type === "error") throw new Error("Annotation migration refused: " + migrated.reason);
	delete copy.store;
	delete copy.schema;
	copy.document = { store: migrated.value, schema: annotationSchema.serialize() };
	return copy as { document: TLStoreSnapshot };
}
