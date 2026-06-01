/**
 * Frontpage v2/v3/v4 tldraw client shell.
 *
 * - Renders a tldraw canvas with the frontpage HTML embedded as a custom shape.
 * - Persists canvas snapshot to the server (debounced).
 * - Restores snapshot on mount.
 * - Forwards section/item bounding boxes from the iframe shim.
 * - Smaller default shape size ("s").
 * - Sticker dropdown integrated into tldraw's toolbar (no overlay panel).
 * - History panel (Time Machine).
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
	DefaultToolbar,
	DefaultToolbarContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuItem,
	TldrawUiButton,
	TldrawUiButtonIcon,
	useEditor,
} from "tldraw";
import "tldraw/tldraw.css";
import { TimeMachine } from "./time-machine.tsx";

// ---- custom shape: frontpage-embed ----

type FrontpageEmbedShape = TLBaseShape<
	"frontpage-embed",
	{ w: number; h: number; slug: string }
>;

class FrontpageEmbedShapeUtil extends BaseBoxShapeUtil<FrontpageEmbedShape> {
	static override type = "frontpage-embed" as const;
	static override props: RecordProps<FrontpageEmbedShape> = {
		w: T.number,
		h: T.number,
		slug: T.string,
	};

	getDefaultProps(): FrontpageEmbedShape["props"] {
		// Initial guess; auto-resizes on iframe layout via the layout shim.
		return { w: 1200, h: 1500, slug: "" };
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
					style={{ width: "100%", height: "100%", border: 0, display: "block", background: "white", pointerEvents: "none" }}
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
	} catch { return null; }
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

/** Toolbar item — opens the full-screen Time Machine. */
function TimeMachineToolbarItem({ onClick }: { onClick: () => void }) {
	return (
		<TldrawUiButton
			type="tool"
			title="Time Machine — browse and restore prior versions"
			onClick={onClick}
		>
			<span style={{ fontSize: 16, lineHeight: 1 }}>⏰</span>
		</TldrawUiButton>
	);
}

// (History UI moved to ./time-machine.tsx — full-screen Apple Time Machine-
// style overlay with z-stacked previews, vertical timeline rail, and
// color-coded author markers.)

// ---- app shell ----

function App({ slug }: { slug: string }) {
	const [editor, setEditor] = React.useState<Editor | null>(null);
	const [showTimeMachine, setShowTimeMachine] = React.useState(false);

	const handleMount = React.useCallback(
		(ed: Editor) => {
			let cancelled = false;
			setEditor(ed);
			ed.setStyleForNextShapes(DefaultSizeStyle, "s");
			ed.setStyleForNextShapes(DefaultFontStyle, "draw");
			(async () => {
				const saved = await loadServerSnapshot(slug);
				if (cancelled) return;
				if (saved) {
					try { loadSnapshot(ed.store, saved as Parameters<typeof loadSnapshot>[1]); }
					catch (err) { console.warn("[frontpage] failed to load saved snapshot:", err); }
				}
				const existing = ed.getCurrentPageShapes().find((s) => s.type === "frontpage-embed");
				if (!existing) {
					ed.createShape<FrontpageEmbedShape>({ type: "frontpage-embed", x: 0, y: 0, props: { w: 1200, h: 1500, slug } });
				}
				if (!saved) ed.setCamera({ x: 40, y: 40, z: 1 }, { animation: { duration: 0 } });
				ed.setStyleForNextShapes(DefaultSizeStyle, "s");
				const saveSoon = debounce(() => { void postSnapshot(slug, getSnapshot(ed.store)); }, 500);
				ed.store.listen(saveSoon, { scope: "document" });
			})();
			const onMessage = (ev: MessageEvent) => {
				const data = ev.data as { type?: string; sections?: unknown; documentHeight?: number };
				if (!data || data.type !== "frontpage:layout" || !Array.isArray(data.sections)) return;
				void postLayout(slug, data.sections as unknown[]);
				// Resize the embed shape to match the iframe's actual content height.
				// Adds 40px breathing room. Prevents the huge empty canvas area
				// below the rendered page (was 8000px default; usually pages are
				// 500-3000px tall).
				if (typeof data.documentHeight === "number" && data.documentHeight > 0) {
					const targetH = Math.max(600, data.documentHeight + 40);
					const embed = ed.getCurrentPageShapes().find((s) => s.type === "frontpage-embed");
					if (embed) {
						const cur = (embed.props as { h?: number }).h ?? 0;
						// Only update if meaningfully different (avoid churn on every shim message)
						if (Math.abs(cur - targetH) > 20) {
							ed.updateShape({
								id: embed.id,
								type: "frontpage-embed",
								props: { ...(embed.props as Record<string, unknown>), h: targetH },
							});
						}
					}
				}
			};
			window.addEventListener("message", onMessage);
			return () => { cancelled = true; window.removeEventListener("message", onMessage); };
		},
		[slug],
	);

	const components = React.useMemo<TLEditorComponents>(
		() => ({
			Toolbar: (props) => (
				<DefaultToolbar {...props}>
					<DefaultToolbarContent />
					<TimeMachineToolbarItem onClick={() => setShowTimeMachine(true)} />
					<StickerToolbarItem />
				</DefaultToolbar>
			),
		}),
		[],
	);

	return (
		<>
			<Tldraw shapeUtils={[FrontpageEmbedShapeUtil]} onMount={handleMount} components={components} />
			{showTimeMachine && <TimeMachine slug={slug} onClose={() => setShowTimeMachine(false)} />}
		</>
	);
}

const slug = ((globalThis as { __FRONTPAGE_SLUG__?: string }).__FRONTPAGE_SLUG__ ?? "");
const rootEl = document.getElementById("root");
if (rootEl && slug) {
	const root = createRoot(rootEl);
	root.render(<App slug={slug} />);
} else if (rootEl) {
	rootEl.textContent = "No slug provided (window.__FRONTPAGE_SLUG__ is empty).";
}
