/**
 * Frontpage v2 tldraw client shell.
 *
 * Renders a tldraw canvas with the frontpage HTML embedded as a custom shape.
 * Persists the canvas snapshot to the server on every change (debounced).
 * Restores the snapshot on mount. Forwards section bounding boxes from the
 * embedded iframe to the server so the agent can compute spatial overlap
 * (sticky → section) without a browser.
 *
 * v3 additions:
 *   - Default size "s" for new note/text shapes (≈80% of m, FigJam-feel).
 *   - Sticker toolbar overlay (top-right): one-click thumbs-up / nope /
 *     warning / question / etc. Drops a small text shape at viewport center.
 */

import * as React from "react";
import { createRoot } from "react-dom/client";
import {
	Tldraw,
	BaseBoxShapeUtil,
	HTMLContainer,
	type TLBaseShape,
	type RecordProps,
	T,
	type TLEditorComponents,
	type Editor,
	getSnapshot,
	loadSnapshot,
	DefaultSizeStyle,
	DefaultFontStyle,
	createShapeId,
} from "tldraw";
import "tldraw/tldraw.css";

// ---- custom shape: frontpage-embed ----

type FrontpageEmbedShape = TLBaseShape<
	"frontpage-embed",
	{
		w: number;
		h: number;
		slug: string;
	}
>;

class FrontpageEmbedShapeUtil extends BaseBoxShapeUtil<FrontpageEmbedShape> {
	static override type = "frontpage-embed" as const;
	static override props: RecordProps<FrontpageEmbedShape> = {
		w: T.number,
		h: T.number,
		slug: T.string,
	};

	getDefaultProps(): FrontpageEmbedShape["props"] {
		return { w: 1200, h: 8000, slug: "" };
	}

	override canResize = () => true;
	override hideResizeHandles = () => false;
	override hideRotateHandle = () => true;
	override canEdit = () => false;
	override canBind = () => true;

	component(shape: FrontpageEmbedShape) {
		const url = `/page/${encodeURIComponent(shape.props.slug)}/embed`;
		return (
			<HTMLContainer
				id={shape.id}
				style={{
					width: shape.props.w,
					height: shape.props.h,
					pointerEvents: "none",
					overflow: "hidden",
					background: "#fafaf7",
					boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
					borderRadius: 6,
				}}
			>
				<iframe
					src={url}
					title={shape.props.slug}
					style={{
						width: "100%",
						height: "100%",
						border: 0,
						display: "block",
						background: "white",
						pointerEvents: "none",
					}}
				/>
			</HTMLContainer>
		);
	}

	indicator(shape: FrontpageEmbedShape) {
		return <rect width={shape.props.w} height={shape.props.h} rx={6} ry={6} />;
	}
}

// ---- persistence helpers ----

function debounce<TArgs extends unknown[]>(fn: (...args: TArgs) => void, ms: number) {
	let h: ReturnType<typeof setTimeout> | null = null;
	return (...args: TArgs) => {
		if (h) clearTimeout(h);
		h = setTimeout(() => fn(...args), ms);
	};
}

async function loadServerSnapshot(slug: string): Promise<unknown | null> {
	try {
		const r = await fetch(`/api/page/${encodeURIComponent(slug)}/tldraw`);
		if (!r.ok) return null;
		const body = (await r.json()) as { snapshot?: unknown | null };
		return body.snapshot ?? null;
	} catch {
		return null;
	}
}

async function postSnapshot(slug: string, snapshot: unknown): Promise<void> {
	try {
		await fetch(`/api/page/${encodeURIComponent(slug)}/tldraw`, {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ snapshot }),
		});
	} catch {}
}

async function postLayout(slug: string, sections: unknown[]): Promise<void> {
	try {
		await fetch(`/api/page/${encodeURIComponent(slug)}/layout`, {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ sections }),
		});
	} catch {}
}

// ---- sticker palette ----
// FigJam-style quick reactions. Click → drop a text shape at viewport center
// with the emoji as content. Size "s" so they don't dominate the canvas.

interface StickerSpec {
	emoji: string;
	tooltip: string;
}
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

function StickerBar({ editor }: { editor: Editor | null }) {
	const dropSticker = React.useCallback(
		(emoji: string) => {
			if (!editor) return;
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
		},
		[editor],
	);

	return (
		<div
			style={{
				position: "absolute",
				top: 64,
				right: 16,
				zIndex: 1000,
				display: "flex",
				flexDirection: "column",
				gap: 4,
				background: "rgba(255,255,255,0.92)",
				border: "1px solid #e0e0e0",
				borderRadius: 8,
				padding: 6,
				boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
				pointerEvents: "all",
			}}
		>
			{STICKERS.map((s) => (
				<button
					key={s.emoji}
					title={s.tooltip}
					onClick={() => dropSticker(s.emoji)}
					style={{
						background: "transparent",
						border: "1px solid transparent",
						borderRadius: 6,
						padding: "4px 6px",
						cursor: "pointer",
						fontSize: 20,
						lineHeight: 1.1,
						width: 36,
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
	);
}

// ---- app shell ----

function App({ slug }: { slug: string }) {
	const [editor, setEditor] = React.useState<Editor | null>(null);
	const handleMount = React.useCallback(
		(ed: Editor) => {
			let cancelled = false;
			setEditor(ed);

			// v3: smaller default size for new shapes ("s" instead of "m") so
			// fresh stickies / text don't dominate the page below.
			ed.setStyleForNextShapes(DefaultSizeStyle, "s");
			ed.setStyleForNextShapes(DefaultFontStyle, "draw");

			(async () => {
				const saved = await loadServerSnapshot(slug);
				if (cancelled) return;
				if (saved) {
					try {
						loadSnapshot(ed.store, saved as Parameters<typeof loadSnapshot>[1]);
					} catch (err) {
						console.warn("[frontpage] failed to load saved snapshot, starting fresh:", err);
					}
				}
				const existing = ed.getCurrentPageShapes().find((s) => s.type === "frontpage-embed");
				if (!existing) {
					ed.createShape<FrontpageEmbedShape>({
						type: "frontpage-embed",
						x: 0,
						y: 0,
						props: { w: 1200, h: 8000, slug },
					});
				}
				if (!saved) {
					ed.setCamera({ x: 40, y: 40, z: 1 }, { animation: { duration: 0 } });
				}
				// Re-apply default-size after load (loadSnapshot may restore prior style state).
				ed.setStyleForNextShapes(DefaultSizeStyle, "s");

				const saveSoon = debounce(() => {
					const snap = getSnapshot(ed.store);
					void postSnapshot(slug, snap);
				}, 500);
				ed.store.listen(saveSoon, { scope: "document" });
			})();

			const onMessage = (ev: MessageEvent) => {
				const data = ev.data as { type?: string; sections?: unknown };
				if (!data || data.type !== "frontpage:layout" || !Array.isArray(data.sections)) return;
				void postLayout(slug, data.sections as unknown[]);
			};
			window.addEventListener("message", onMessage);

			return () => {
				cancelled = true;
				window.removeEventListener("message", onMessage);
			};
		},
		[slug],
	);

	const components = React.useMemo<TLEditorComponents>(() => ({}), []);

	return (
		<>
			<Tldraw
				shapeUtils={[FrontpageEmbedShapeUtil]}
				onMount={handleMount}
				components={components}
			/>
			<StickerBar editor={editor} />
		</>
	);
}

// ---- boot ----

const slug = ((globalThis as { __FRONTPAGE_SLUG__?: string }).__FRONTPAGE_SLUG__ ?? "");
const rootEl = document.getElementById("root");
if (rootEl && slug) {
	const root = createRoot(rootEl);
	root.render(<App slug={slug} />);
} else if (rootEl) {
	rootEl.textContent = "No slug provided (window.__FRONTPAGE_SLUG__ is empty).";
}
