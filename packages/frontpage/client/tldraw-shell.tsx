/** The frontpage document is the page; tldraw renders only its annotations. */
import * as React from "react";
import { createRoot } from "react-dom/client";
import { Tldraw, BaseBoxShapeUtil, type TLBaseShape, type RecordProps, type TLComponents, type Editor, type TLShapeId, type TLShape, getSnapshot, loadSnapshot, getArrowInfo, getArrowBindings, type TLArrowShape, DefaultSizeStyle, DefaultFontStyle, createShapeId, DefaultToolbar, DefaultToolbarContent, TldrawUiDropdownMenuRoot, TldrawUiDropdownMenuTrigger, TldrawUiDropdownMenuContent, TldrawUiButton, TldrawUiButtonIcon, useEditor } from "tldraw";
import "tldraw/tldraw.css";
import { legacyEmbedProps } from "../server-process/annotation-schema.ts";
import { TimeMachine } from "./time-machine.tsx";
import { downloadHtml } from "./export-html.ts";
import { mergeDraft } from "./draft-merge.ts";
import { toDocumentCoordinates, contentAnchor, anchorPosition, type LayoutSection, type ContentAnchor } from "../server-process/annotation-coordinates.ts";
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Kept as a schema adapter for legacy history only. It never renders HTML.
type LegacyEmbedShape = TLBaseShape<"frontpage-embed", { w: number; h: number; slug: string; ts: number; label: string }>;
class LegacyEmbedShapeUtil extends BaseBoxShapeUtil<LegacyEmbedShape> {
static override type = "frontpage-embed" as const;
static override props: RecordProps<LegacyEmbedShape> = legacyEmbedProps;
getDefaultProps(): LegacyEmbedShape["props"] { return { w: 1200, h: 1500, slug: "", ts: 0, label: "" }; }
component() { return null; }
indicator() { return null; }
}
const LEGACY_SHAPE_UTILS = [LegacyEmbedShapeUtil];
/** Page elements that own their own pointer input; the annotation layer stays out of them. */
const UI_OWNED = ".tlui-layout, .fp-controls";
const annotationVisibility = (shape: TLShape) => shape.type === "frontpage-embed" || shape.meta.frontpageLegacy ? "hidden" as const : "inherit" as const;

// ---- sticker catalog ----

interface StickerSpec { emoji: string; tooltip: string }
const STICKERS: StickerSpec[] = [
	{ emoji: "👍", tooltip: "approve" },
	{ emoji: "👎", tooltip: "nope" },
	{ emoji: "❓", tooltip: "question" },
	{ emoji: "❗", tooltip: "attention" },
	{ emoji: "⚠️", tooltip: "warning" },
	{ emoji: "✅", tooltip: "done" },
	{ emoji: "❌", tooltip: "blocked" },
	{ emoji: "💡", tooltip: "idea" },
	{ emoji: "🔥", tooltip: "hot" },
	{ emoji: "⭐", tooltip: "star" },
	{ emoji: "🚧", tooltip: "wip" },
	{ emoji: "❤️", tooltip: "love" },
];

function dropStickerAtViewport(editor: Editor, emoji: string) {
	const vp = editor.getViewportPageBounds();
	const cx = vp.x + vp.width / 2;
	const cy = vp.y + vp.height / 2;
	const id = createShapeId();
	editor.createShape({
		id,
		type: "text",
		x: cx - 30,
		y: cy - 20,
		props: {
			color: "black",
			size: "l",
			font: "draw",
			textAlign: "middle",
			autoSize: true,
			richText: {
				type: "doc",
				content: [{ type: "paragraph", attrs: { dir: "auto" }, content: [{ type: "text", text: emoji }] }],
			},
		},
	});
	editor.select(id);
}

/** Toolbar item — sits in tldraw's bottom toolbar next to arrow/rect/etc. */
function StickerToolbarItem() {
	const editor = useEditor();
	return (
		<TldrawUiDropdownMenuRoot id="frontpage-stickers">
			<TldrawUiDropdownMenuTrigger>
				<TldrawUiButton type="tool" title="Stickers — quick reactions">
					<TldrawUiButtonIcon icon="heart" />
				</TldrawUiButton>
			</TldrawUiDropdownMenuTrigger>
			<TldrawUiDropdownMenuContent side="top" align="end">
				<div style={{
					display: "grid",
					gridTemplateColumns: "repeat(6, 1fr)",
					gap: 2,
					padding: 6,
					minWidth: 220,
				}}>
					{STICKERS.map((s) => (
						<button
							key={s.emoji}
							title={s.tooltip}
							onClick={() => dropStickerAtViewport(editor, s.emoji)}
							style={{
								background: "transparent",
								border: "1px solid transparent",
								borderRadius: 6,
								padding: "6px 4px",
								cursor: "pointer",
								fontSize: 20,
								lineHeight: 1.1,
								transition: "background 0.15s, border 0.15s",
							}}
							onMouseEnter={(e) => {
								(e.currentTarget as HTMLButtonElement).style.background = "#f0f0f0";
								(e.currentTarget as HTMLButtonElement).style.borderColor = "#d4d4d4";
							}}
							onMouseLeave={(e) => {
								(e.currentTarget as HTMLButtonElement).style.background = "transparent";
								(e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
							}}
						>
							{s.emoji}
						</button>
					))}
				</div>
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	);
}

// The HTML document owns layout and scrolling. This root owns annotations only.
function installOverlayStyles(): void {
	if (document.getElementById("frontpage-annotation-styles")) return;
	const style = document.createElement("style");
	style.id = "frontpage-annotation-styles";
	style.textContent = `
#frontpage-annotations { position: fixed; inset: 0; z-index: 10000; pointer-events: none; }
#frontpage-annotations .fp-overlay { position: absolute; inset: 0; }
#frontpage-annotations .tl-background { display: none; }
#frontpage-annotations .tl-container, #frontpage-annotations .tl-canvas { background: transparent; }
#frontpage-annotations .fp-controls { position: absolute; top: 12px; right: 12px; display: flex; flex-wrap: wrap; gap: 6px; max-width: calc(100vw - 24px); pointer-events: auto; align-items: center; font: 13px system-ui, sans-serif; }
#frontpage-annotations .fp-controls button { padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px; background: #fff; color: #222; cursor: pointer; font: inherit; }
#frontpage-annotations .fp-controls button[aria-pressed="true"] { background: #222; color: #fff; }
#frontpage-annotations .fp-controls button:disabled { opacity: .5; cursor: wait; }
#frontpage-annotations .fp-save-state { background: #fff; color: #333; padding: 6px 8px; border-radius: 8px; max-width: 38ch; }
#frontpage-annotations .fp-save-state[data-state="failed"] { color: #9b1c1c; }
`;
	document.head.append(style);
}

type SaveState = "loading" | "saving" | "saved" | "failed";
function App({ slug }: { slug: string }) {
	const [annotating, setAnnotating] = React.useState(false);
	const [history, setHistory] = React.useState(false);
	const [state, setState] = React.useState<SaveState>("loading");
	const [canEdit, setCanEdit] = React.useState(true);
	const [error, setError] = React.useState("");
	const [legacyCount, setLegacyCount] = React.useState(0);
	const [detachedCount, setDetachedCount] = React.useState(0);
	const [draftFound, setDraftFound] = React.useState(false);
	const [revisionPending, setRevisionPending] = React.useState(false);
	const [exporting, setExporting] = React.useState(false);
	const [exportError, setExportError] = React.useState("");
	const editor = React.useRef<Editor | null>(null);
	const layer = React.useRef<HTMLDivElement | null>(null);
	const retry = React.useRef<() => void>(() => {});
	const restoreDraft = React.useRef<() => void>(() => {});
	const ready = React.useRef(false);
	const editing = React.useRef(false);
	const dirty = React.useRef(false);
	const persisted = React.useRef(false);
	const draftKey = "frontpage-draft:" + slug;

	React.useEffect(() => { installOverlayStyles(); }, []);
	React.useEffect(() => {
		editing.current = annotating;
		editor.current?.updateInstanceState({ isReadonly: !annotating || !canEdit || !ready.current });
		if (!annotating) editor.current?.selectNone();
	}, [annotating, canEdit]);

	const handleMount = React.useCallback((ed: Editor) => {
		editor.current = ed;
		let disposed = false;
		let loadId = 0;
		let writable = true;
		let unlisten: (() => void) | undefined;
		let version: string | null = null;
		// The store as the server last had it, so a kept draft can be merged
		// onto whatever the server has gained since instead of replacing it.
		let base: unknown = null;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let saving = false;
		let changed = 0;
		let applying = false;
		let sections: LayoutSection[] = [];
		const changedShapes = new Set<TLShapeId>();
		const camera = () => ed.setCamera({ x: -window.scrollX, y: -window.scrollY, z: 1 }, { force: true, immediate: true });
		ed.setCameraOptions({ isLocked: true, wheelBehavior: "none", zoomSteps: [1] });
		ed.updateInstanceState({ isReadonly: !editing.current });
		ed.setStyleForNextShapes(DefaultSizeStyle, "s");
		ed.setStyleForNextShapes(DefaultFontStyle, "draw");
		camera();
		window.addEventListener("scroll", camera, { passive: true });
		window.addEventListener("resize", camera);
		const wheel = (event: WheelEvent) => {
			// Tldraw must not consume the document's wheel scrolling.
			if (event.ctrlKey || event.target instanceof Element && event.target.closest(UI_OWNED)) return;
			event.preventDefault();
			event.stopPropagation();
			const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
			window.scrollBy(event.deltaX * unit, event.deltaY * unit);
		};
		const element = layer.current;
		element?.addEventListener("wheel", wheel, { capture: true, passive: false });
		let drag: { id: number; x: number; y: number } | null = null;
		const hand = (event: PointerEvent) => {
			if (event.type === "pointerdown") {
				if (!editing.current || event.target instanceof Element && event.target.closest(UI_OWNED) || !(event.button === 1 || event.button === 0 && ed.getCurrentToolId() === "hand")) return;
				drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
				element?.setPointerCapture(event.pointerId);
			} else if (!drag || event.pointerId !== drag.id) return;
			event.preventDefault(); event.stopPropagation();
			if (event.type === "pointermove" && drag) {
				window.scrollBy(drag.x - event.clientX, drag.y - event.clientY);
				drag.x = event.clientX; drag.y = event.clientY;
			} else if (event.type !== "pointerdown") {
				if (element?.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
				drag = null;
			}
		};
		const dragEvents = ["pointerdown", "pointermove", "pointerup", "pointercancel"] as const;
		for (const type of dragEvents) element?.addEventListener(type, hand, true);

		const updateCounts = () => {
			const shapes = ed.getCurrentPageShapes();
			setLegacyCount(shapes.filter(s => Boolean(s.meta.frontpageLegacy)).length);
			setDetachedCount(shapes.filter(s => Boolean(s.meta.frontpageDetached)).length);
			let extent = document.getElementById("frontpage-annotation-extent");
			if (!extent) {
				extent = document.createElement("div");
				extent.id = "frontpage-annotation-extent";
				extent.setAttribute("aria-hidden", "true");
				extent.style.cssText = "position:absolute;left:0;top:0;visibility:hidden;pointer-events:none";
				document.body.append(extent);
			}
			const bounds = shapes.filter(s => !ed.isShapeHidden(s)).map(s => ed.getShapePageBounds(s)).filter(b => b !== undefined);
			const origin = extent.getBoundingClientRect();
			extent.style.width = Math.max(0, ...bounds.map(b => b.maxX - origin.left - window.scrollX)) + "px";
			extent.style.height = Math.max(0, ...bounds.map(b => b.maxY - origin.top - window.scrollY)) + "px";
		};
		const attachChanged = () => {
			applying = true;
			for (const id of changedShapes) {
				const shape = ed.getShape(id);
				if (!shape || shape.type === "frontpage-embed" || shape.type === "group" || ed.isShapeHidden(shape)) continue;
				if (shape.type === "arrow") {
					const info = getArrowInfo(ed, shape.id);
					if (!info) continue;
					const transform = ed.getShapePageTransform(shape);
					const from = transform.applyToPoint(info.start.handle);
					const to = transform.applyToPoint(info.end.handle);
					ed.updateShape({ id, type: "arrow", meta: { ...shape.meta, frontpageAnchor: null, frontpageFromAnchor: (info.bindings.start ? null : contentAnchor(from, from, sections)) as unknown as JsonValue, frontpageToAnchor: (info.bindings.end ? null : contentAnchor(to, to, sections)) as unknown as JsonValue } });
					continue;
				}
				const bounds = ed.getShapePageBounds(shape);
				if (!bounds || sections.length === 0) continue;
				const anchor = contentAnchor({ x: bounds.midX, y: bounds.midY }, ed.getShapePageTransform(shape).applyToPoint({ x: 0, y: 0 }), sections);
				ed.updateShape({ id, type: shape.type, meta: { ...shape.meta, frontpageAnchor: anchor as unknown as JsonValue, frontpageDetached: anchor ? false : "ambiguous section" } });
			}
			changedShapes.clear();
			applying = false;
			updateCounts();
		};
		const reflow = () => {
			applying = true;
			try { ed.store.mergeRemoteChanges(() => {
			for (const shape of ed.getCurrentPageShapes().filter(s => s.type !== "arrow" && s.type !== "group")) {
				const anchor = shape.meta.frontpageAnchor as unknown as ContentAnchor | undefined;
				if (!anchor || ed.isShapeHidden(shape) || changedShapes.has(shape.id)) continue;
				const world = anchorPosition(anchor, sections);
				const point = world ? ed.getShapeParentTransform(shape).clone().invert().applyToPoint(world) : null;
				if (!point) {
					if (!shape.meta.frontpageDetached) ed.store.put([{ ...shape, meta: { ...shape.meta, frontpageDetached: "target changed or removed" } }]);
				} else if (shape.x !== point.x || shape.y !== point.y || shape.meta.frontpageDetached) {
					ed.store.put([{ ...shape, x: point.x, y: point.y, meta: { ...shape.meta, frontpageDetached: false } }]);
				}
			}
			for (const shape of ed.getCurrentPageShapes().filter((s): s is TLArrowShape => s.type === "arrow")) {
				if (ed.isShapeHidden(shape) || changedShapes.has(shape.id)) continue;
				const bindings = getArrowBindings(ed, shape);
				const inverse = ed.getShapePageTransform(shape).clone().invert();
				const props: Partial<TLArrowShape["props"]> = {};
				let detached = false;
				for (const terminal of ["start", "end"] as const) {
					if (bindings[terminal]) continue;
					const anchor = shape.meta[terminal === "start" ? "frontpageFromAnchor" : "frontpageToAnchor"] as unknown as ContentAnchor | undefined;
					if (!anchor) continue;
					const point = anchorPosition(anchor, sections);
					if (!point) { detached = true; continue; }
					const local = inverse.applyToPoint(point);
					props[terminal] = { x: local.x, y: local.y };
				}
				ed.store.put([{ ...shape, props: { ...shape.props, ...props }, meta: { ...shape.meta, frontpageDetached: detached ? "endpoint target changed or removed" : false } }]);
			}
			}); } finally { applying = false; }
			updateCounts();
		};
		const layout = (event: MessageEvent) => {
			if (event.source !== window || event.origin !== location.origin || event.data?.type !== "frontpage:layout" || !Array.isArray(event.data.sections)) return;
			sections = event.data.sections as LayoutSection[];
			if (ready.current) { reflow(); attachChanged(); }
			void fetch("/api/page/" + encodeURIComponent(slug) + "/layout", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ sections }) }).catch(err => console.warn("[frontpage] layout save failed", err));
		};
		window.addEventListener("message", layout);

		const exportDrawings = async (savedVersion: string) => {
			const drawings = ed.getCurrentPageShapes().filter(s => s.type !== "frontpage-embed" && !s.meta.frontpageLegacy);
			if (!drawings.length) return;
			try {
				const image = await ed.toImage(drawings.map(s => s.id), { format: "png", background: true, scale: 1 });
				await fetch("/api/page/" + encodeURIComponent(slug) + "/canvas-image", { method: "POST", headers: { "content-type": "image/png", "x-frontpage-snapshot-version": savedVersion }, body: image.blob });
			} catch (err) { console.warn("[frontpage] annotation image unavailable", err); }
		};
		const checkpoint = () => {
			if (!ready.current || !dirty.current) return;
			try { localStorage.setItem(draftKey, JSON.stringify({ base, snapshot: getSnapshot(ed.store), version })); }
			catch (err) { console.warn("[frontpage] local draft storage unavailable", err); }
		};
		const save = async () => {
			if (!ready.current || !writable || saving || disposed) return;
			if (timer) clearTimeout(timer);
			attachChanged();
			checkpoint();
			const generation = changed;
			saving = true;
			setState("saving");
			try {
				const response = await fetch("/api/page/" + encodeURIComponent(slug) + "/tldraw", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ snapshot: getSnapshot(ed.store), expectedVersion: version }) });
				const result = await response.json() as { version?: string; error?: string };
				if (!response.ok || !result.version) throw new Error(result.error ?? "Annotation save refused (HTTP " + response.status + ")");
				version = result.version;
				base = getSnapshot(ed.store);
				persisted.current = true;
				if (generation === changed) {
					dirty.current = false;
					try { localStorage.removeItem(draftKey); } catch {}
					setDraftFound(false);
					setState("saved");
					setError("");
					void exportDrawings(version);
				}
			} catch (err) {
				setState("failed");
				setError(err instanceof Error ? err.message : String(err));
				checkpoint();
			} finally { saving = false; }
			if (generation !== changed) void save();
		};
		const load = async () => {
			const request = ++loadId;
			ready.current = false;
			unlisten?.();
			ed.updateInstanceState({ isReadonly: true });
			setState("loading");
			try {
				const response = await fetch("/api/page/" + encodeURIComponent(slug) + "/tldraw");
				if (!response.ok) throw new Error("Annotations could not load (HTTP " + response.status + ")");
				const body = await response.json() as { snapshot: unknown; version: string | null; editable: boolean };
				if (disposed || request !== loadId) return;
				writable = body.editable;
				setCanEdit(writable);
				version = body.version;
				persisted.current = body.version !== null;
				loadSnapshot(ed.store, toDocumentCoordinates(body.snapshot ?? getSnapshot(ed.store), slug) as Parameters<typeof loadSnapshot>[1]);
				base = getSnapshot(ed.store);
				camera();
				ed.updateInstanceState({ isReadonly: !editing.current || !writable });
				ready.current = true;
				if (!editing.current) ed.selectNone();
				for (const shape of ed.getCurrentPageShapes()) if (!shape.meta.frontpageAnchor && !shape.meta.frontpageLegacy) changedShapes.add(shape.id);
				window.dispatchEvent(new Event("frontpage:request-layout"));
				try { setDraftFound(Boolean(localStorage.getItem(draftKey))); } catch {}
				updateCounts();
				setState("saved");
				setError("");
				unlisten = ed.store.listen(({ changes }) => {
					if (applying || !ready.current || !editing.current) return;
					const shapes = [...Object.values(changes.added), ...Object.values(changes.updated).filter(([before, after]) => before.typeName === "binding" || before.typeName === "shape" && after.typeName === "shape" && (before.x !== after.x || before.y !== after.y || before.rotation !== after.rotation || before.parentId !== after.parentId || ed.isShapeOfType<TLArrowShape>(before, "arrow") && ed.isShapeOfType<TLArrowShape>(after, "arrow") && (JSON.stringify(before.props.start) !== JSON.stringify(after.props.start) || JSON.stringify(before.props.end) !== JSON.stringify(after.props.end)))).map(([, after]) => after)];
					for (const record of shapes) {
						if (record.typeName === "shape" && record.type !== "frontpage-embed") for (const id of ed.getShapeAndDescendantIds([record.id])) changedShapes.add(id);
						else if (record.typeName === "binding" && record.type === "arrow") changedShapes.add(record.fromId);
					}
					if (!Object.keys(changes.added).length && !Object.keys(changes.updated).length && !Object.keys(changes.removed).length) return;
					dirty.current = true;
					changed++;
					if (timer) clearTimeout(timer);
					timer = setTimeout(() => { void save(); }, 350);
				}, { scope: "document", source: "user" });
			} catch (err) { if (!disposed && request === loadId) { setState("failed"); setError(err instanceof Error ? err.message : String(err)); } }
		};
		retry.current = () => { if (ready.current) void save(); else void load(); };
		restoreDraft.current = () => {
			try {
				const raw = localStorage.getItem(draftKey);
				if (!raw) return;
				const draft = JSON.parse(raw) as { base?: unknown; snapshot: unknown; version: string | null };
				let restored = draft.snapshot;
				if (draft.version !== version) {
					if (!draft.base) { setError("Annotations changed since this draft was written and it has no base to merge with. The draft is kept; reload to review the current version."); return; }
					const merge = mergeDraft(draft.base, draft.snapshot, base);
					if (merge.conflicts.length) { setError("This draft and the saved annotations both changed " + merge.conflicts.length + " item(s): " + merge.conflicts.slice(0, 3).join(", ") + ". The draft is kept; reload to compare before saving."); return; }
					restored = merge.merged;
				}
				applying = true;
				loadSnapshot(ed.store, restored as Parameters<typeof loadSnapshot>[1]);
				applying = false;
				reflow();
				dirty.current = true;
				changed++;
				camera();
				ed.updateInstanceState({ isReadonly: !editing.current });
				setDraftFound(false);
				void save();
			} catch (err) { applying = false; setError(String(err)); }
		};
		const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty.current) { checkpoint(); event.preventDefault(); } };
		window.addEventListener("beforeunload", beforeUnload);
		window.addEventListener("pagehide", checkpoint);
		void load();
		const events = new EventSource("/api/page/" + encodeURIComponent(slug) + "/events");
		events.onmessage = event => {
			let data: { type?: string };
			try { data = JSON.parse(event.data) as { type?: string }; } catch { return; }
			if (data.type === "revised") {
				if (dirty.current) setRevisionPending(true); else location.reload();
			} else if (data.type === "annotations" && !dirty.current) {
				unlisten?.();
				void load();
			}
		};
		return () => {
			disposed = true;
			checkpoint();
			ready.current = false;
			if (timer) clearTimeout(timer);
			unlisten?.();
			events.close();
			window.removeEventListener("scroll", camera);
			window.removeEventListener("resize", camera);
			window.removeEventListener("message", layout);
			window.removeEventListener("beforeunload", beforeUnload);
			window.removeEventListener("pagehide", checkpoint);
			element?.removeEventListener("wheel", wheel, true);
			for (const type of dragEvents) element?.removeEventListener(type, hand, true);
			document.getElementById("frontpage-annotation-extent")?.remove();
			editor.current = null;
		};
	}, [slug, draftKey]);

	const exportHtml = async () => {
		if (!editor.current || !ready.current || dirty.current) { setExportError("Wait for annotations to save before exporting."); return; }
		setExporting(true); setExportError("");
		try { await downloadHtml(editor.current, slug); }
		catch (err) { setExportError(err instanceof Error ? err.message : String(err)); }
		finally { setExporting(false); }
	};

	const components = React.useMemo<TLComponents>(() => ({
		Toolbar: props => <DefaultToolbar {...props}><DefaultToolbarContent /><StickerToolbarItem /></DefaultToolbar>,
		PageMenu: null, NavigationPanel: null, ZoomMenu: null,
	}), []);
	return <>
		<div className="fp-overlay" ref={layer} style={{ pointerEvents: annotating ? "auto" : "none" }}>
			<Tldraw shapeUtils={LEGACY_SHAPE_UTILS} onMount={handleMount} components={components} hideUi={!annotating} autoFocus={false} getShapeVisibility={annotationVisibility} />
		</div>
		<div className="fp-controls">
			<button type="button" aria-pressed={annotating} disabled={!annotating && (!ready.current || !canEdit)} onClick={() => setAnnotating(value => !value)}>{annotating ? "Read page" : "Annotate"}</button>
			<button type="button" onClick={() => setHistory(true)}>History{legacyCount ? " (" + legacyCount + " earlier annotations)" : ""}</button>
			<button type="button" disabled={!ready.current || state !== "saved" || exporting} onClick={() => void exportHtml()} title="Download a read-only HTML snapshot with annotations">{exporting ? "Exporting…" : "Export HTML"}</button>
			{exportError && <span role="alert" className="fp-save-state" data-state="failed">Export failed: {exportError}</span>}
			<span className="fp-save-state" data-state={state} role="status" aria-live="polite">{state === "loading" ? "Loading annotations…" : state === "saving" ? "Saving…" : state === "failed" ? "Not saved: " + error : !canEdit ? "Read-only document" : persisted.current ? "Annotations saved" : "No annotations yet"}{detachedCount ? " · " + detachedCount + " need attachment" : ""}</span>
			{state === "failed" && <button type="button" onClick={() => retry.current()}>Retry</button>}
			{draftFound && <button type="button" disabled={!ready.current || !canEdit} onClick={() => restoreDraft.current()}>Restore unsaved draft</button>}
			{revisionPending && <button type="button" onClick={() => location.reload()}>Document updated — reload</button>}
		</div>
		{history && <TimeMachine slug={slug} onClose={() => setHistory(false)} />}
	</>;
}

const rootEl = document.getElementById("frontpage-annotations");
const slug = rootEl ? decodeURIComponent(rootEl.dataset.slug ?? "") : "";
if (rootEl && slug) createRoot(rootEl).render(<App slug={slug} />);
