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
	Box,
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
	{ w: number; h: number; slug: string; ts: number; label: string }
>;

class FrontpageEmbedShapeUtil extends BaseBoxShapeUtil<FrontpageEmbedShape> {
	static override type = "frontpage-embed" as const;
	static override props: RecordProps<FrontpageEmbedShape> = {
		w: T.number,
		h: T.number,
		slug: T.string,
		// ts=0 → live (current /embed). ts>0 → frozen at that history version
		// (embed-versioned?ts=). Freezing is how the hooman's annotations stay
		// pinned: the doc they sit on never changes again.
		ts: T.number,
		label: T.string,
	};

	getDefaultProps(): FrontpageEmbedShape["props"] {
		return { w: 1200, h: 1500, slug: "", ts: 0, label: "" };
	}

	override canResize = () => true;
	override hideResizeHandles = () => false;
	override hideRotateHandle = () => true;
	override canEdit = () => false;
	override canBind = () => true;

	component(shape: FrontpageEmbedShape) {
		const { slug, ts, label } = shape.props;
		const url = ts > 0
			? `/api/page/${encodeURIComponent(slug)}/embed-versioned?ts=${ts}`
			: `/page/${encodeURIComponent(slug)}/embed`;
		const frozen = ts > 0;
		// Interact mode: by default the embed is pointer-events:none so the hooman
		// can DRAW over it on the canvas. Toggling Interact flips the iframe to
		// pointer-events:auto so clicks reach the page — decision buttons, choice
		// cards, the floating chip and Submit all work live. Stored per-shape in
		// meta so it survives re-renders. Frozen history embeds are never interactive.
		const interactive = !frozen && (shape.meta as { interactive?: boolean }).interactive === true;
		const editor = this.editor;
		const toggleInteractive = (e: { stopPropagation: () => void }) => {
			e.stopPropagation();
			editor.updateShape({ id: shape.id, type: "frontpage-embed", meta: { ...shape.meta, interactive: !interactive } });
		};
		return (
			<HTMLContainer
				id={shape.id}
				style={{
					width: shape.props.w,
					height: shape.props.h,
					pointerEvents: "none",
					overflow: "hidden",
					background: "#fafaf7",
					boxShadow: frozen ? "0 2px 12px rgba(0,0,0,0.06)" : interactive ? "0 6px 28px rgba(255,56,92,0.22)" : "0 4px 24px rgba(0,0,0,0.10)",
					borderRadius: 6,
					border: frozen ? "1px solid #d8d8d8" : interactive ? "2px solid #FF385C" : "2px solid #1f6feb",
					opacity: frozen ? 0.96 : 1,
				}}
			>
				{label ? (
					<div style={{
						position: "absolute", top: 0, left: 0, right: 0,
						padding: "4px 10px",
						font: "600 11px -apple-system, BlinkMacSystemFont, sans-serif",
						letterSpacing: "0.06em",
						color: frozen ? "#666" : "#fff",
						background: frozen ? "#ededed" : "#1f6feb",
						borderBottom: frozen ? "1px solid #ddd" : "none",
						zIndex: 2,
						pointerEvents: "none",
						textTransform: "uppercase",
					}}>{label}</div>
				) : null}
				{!frozen ? (
					<button
						onPointerDown={toggleInteractive}
						title={interactive ? "Back to drawing on the canvas" : "Click to interact with the page — buttons & choices"}
						style={{
							position: "absolute", top: 7, right: 8, zIndex: 3,
							pointerEvents: "auto", cursor: "pointer",
							font: "600 11px -apple-system, BlinkMacSystemFont, sans-serif",
							letterSpacing: "0.03em",
							padding: "5px 11px", borderRadius: 20, border: "none",
							background: interactive ? "#FF385C" : "rgba(255,255,255,0.94)",
							color: interactive ? "#fff" : "#222",
							boxShadow: "0 1px 6px rgba(0,0,0,0.2)",
						}}
					>{interactive ? "✏️ Done — draw" : "🖱 Interact"}</button>
				) : null}
				<iframe
					src={url}
					title={`${slug}${frozen ? "@" + ts : " (live)"}`}
					style={{ width: "100%", height: "100%", border: 0, display: "block", background: "white", pointerEvents: interactive ? "auto" : "none", marginTop: label ? 24 : 0 }}
				/>
			</HTMLContainer>
		);
	}

	indicator(shape: FrontpageEmbedShape) {
		return <rect width={shape.props.w} height={shape.props.h} rx={6} ry={6} />;
	}

	// Exported representation (editor.toImage). The live iframe can't be
	// rasterized into the SVG export, so the embed renders as a LABELED FRAME —
	// enough spatial reference for the agent to see where the hooman's drawings
	// sit relative to each version. The drawings themselves export natively.
	override toSvg(shape: FrontpageEmbedShape) {
		const { w, h, slug, label, ts } = shape.props;
		const frozen = ts > 0;
		const accent = frozen ? "#9aa0a6" : "#1f6feb";
		const barFill = frozen ? "#ededed" : "#1f6feb";
		const barText = frozen ? "#666666" : "#ffffff";
		return (
			<g>
				<rect x={0} y={0} width={w} height={h} rx={6} ry={6} fill="#fafaf7" stroke={accent} strokeWidth={frozen ? 1 : 2} />
				<rect x={0} y={0} width={w} height={24} fill={barFill} />
				<text x={10} y={16} fontFamily="-apple-system, sans-serif" fontSize={11} fontWeight={600} fill={barText}>{(label || slug).toUpperCase()}</text>
				<text x={w / 2} y={h / 2} textAnchor="middle" fontFamily="-apple-system, sans-serif" fontSize={22} fill="#c2c2c2">{slug}</text>
				<text x={w / 2} y={h / 2 + 28} textAnchor="middle" fontFamily="-apple-system, sans-serif" fontSize={13} fill="#d4d4d4">frontpage embed</text>
			</g>
		);
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

async function postCanvasImage(slug: string, blob: Blob): Promise<void> {
	try {
		await fetch(`/api/page/${encodeURIComponent(slug)}/canvas-image`, {
			method: "POST",
			headers: { "content-type": "image/png" },
			body: blob,
		});
	} catch (err) {
		console.error("[frontpage] postCanvasImage failed:", err);
	}
}

async function postSnapshot(slug: string, snapshot: unknown): Promise<boolean> {
	try {
		const r = await fetch(`/api/page/${encodeURIComponent(slug)}/tldraw`, {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ snapshot }),
		});
		return r.ok;
	} catch (err) {
		console.error("[frontpage] snapshot save failed:", err);
		return false;
	}
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
			let hydrated = false; // gate saves until initial load completes
			setEditor(ed);

			// --- PERSISTENCE: attach FIRST, synchronously, before any async
			// load that could throw and block listener attachment. ---
			// CHANGE-DRIVEN save, debounced ~350ms. NO polling. store.listen
			// fires on every store change → debounce → save. We never write
			// unless something actually changed, and never write stale state
			// on a timer. Gated behind `hydrated` so the initial loadSnapshot
			// doesn't immediately re-write what we just loaded.
			const doSave = () => {
				if (!hydrated) return;
				try {
					void postSnapshot(slug, getSnapshot(ed.store));
				} catch (err) {
					console.error("[frontpage] getSnapshot/save threw:", err);
				}
			};
			const saveSoon = debounce(doSave, 350);

			// CANVAS VISION: export the whole canvas (frontpage frame + the
			// hooman's drawings/handwriting/arrows) to a PNG whenever the canvas
			// changes — change-driven + debounced, NO polling. Gated to when there
			// is at least one drawing (a non-embed shape), so embed-only canvases
			// don't burn exports. The agent reads this via frontpage_read to SEE
			// handwriting/arrows the text mapping can't convey.
			const exportCanvasImage = async () => {
				if (!hydrated) return;
				try {
					const shapes = ed.getCurrentPageShapes();
					const drawings = shapes.filter((s) => s.type !== "frontpage-embed");
					if (drawings.length === 0) return;
					// Export the REGION OF INTEREST (bounds of the hooman's drawings
					// + padding), NOT the whole multi-version filmstrip — that can be
					// 10000px+ tall and blow past Anthropic's image limits (8000px /
					// 5MB). Focusing keeps the image small AND the handwriting legible.
					let region: Box | null = null;
					for (const s of drawings) {
						const b = ed.getShapePageBounds(s);
						if (!b) continue;
						region = region ? region.union(b) : new Box(b.minX, b.minY, b.width, b.height);
					}
					if (!region) return;
					region.expandBy(64);
					// Cap the long edge ~1600px (Anthropic downscales >1568 anyway),
					// allow up to 2x on small regions for crisp handwriting. The
					// frontpage_read tool also hard-guarantees the final size.
					const longEdge = Math.max(region.width, region.height);
					const scale = Math.max(0.2, Math.min(2, 1600 / longEdge));
					// Pass all shape ids + a bounds clip so the embed frame under the
					// drawings renders too, clipped to the region.
					const out = await ed.toImage(shapes.map((s) => s.id), {
						format: "png", background: true, bounds: region, scale,
					});
					await postCanvasImage(slug, out.blob);
				} catch (err) {
					console.error("[frontpage] canvas image export failed:", err);
				}
			};
			const exportImageSoon = debounce(() => { void exportCanvasImage(); }, 1200);

			const unlisten = ed.store.listen(() => { saveSoon(); exportImageSoon(); });

			// Apply default style + load saved snapshot (best-effort; cannot
			// block persistence anymore since the listener is already live).
			try {
				ed.setStyleForNextShapes(DefaultSizeStyle, "s");
				ed.setStyleForNextShapes(DefaultFontStyle, "draw");
			} catch (err) { console.warn("[frontpage] setStyle failed:", err); }

			(async () => {
				let saved: unknown = null;
				try {
					saved = await loadServerSnapshot(slug);
				} catch (err) { console.warn("[frontpage] load failed:", err); }
				if (cancelled) return;
				if (saved) {
					try { loadSnapshot(ed.store, saved as Parameters<typeof loadSnapshot>[1]); }
					catch (err) { console.warn("[frontpage] failed to load saved snapshot:", err); }
				}
				try {
					// Normalize legacy embeds saved before the ts/label props
					// existed → treat as the live current version.
					for (const s of ed.getCurrentPageShapes()) {
						if (s.type !== "frontpage-embed") continue;
						const p = s.props as { ts?: number; label?: string };
						if (p.ts === undefined || p.label === undefined) {
							ed.updateShape({
								id: s.id,
								type: "frontpage-embed",
								props: { ...(s.props as Record<string, unknown>), ts: p.ts ?? 0, label: p.label ?? "CURRENT" },
							});
						}
					}
					const existing = ed.getCurrentPageShapes().find((s) => s.type === "frontpage-embed");
					if (!existing) {
						ed.createShape<FrontpageEmbedShape>({ type: "frontpage-embed", x: 0, y: 0, props: { w: 1200, h: 1500, slug, ts: 0, label: "CURRENT" } });
					}
					if (!saved) ed.setCamera({ x: 40, y: 40, z: 1 }, { animation: { duration: 0 } });
					ed.setStyleForNextShapes(DefaultSizeStyle, "s");
				} catch (err) { console.warn("[frontpage] post-load setup failed:", err); }
				// Initial hydration complete — NOW allow saves. Flush once so
				// the embed shape (created above if missing) persists, giving
				// annotate an embed to anchor against even before the first
				// user edit.
				hydrated = true;
				doSave();
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
					// + 28 fixed pad for the version label ribbon, clamped to a
					// sane floor. NOT derived from viewport, so no runaway.
					// +48 pad (label ribbon + a little slack) so content never clips.
					const targetH = Math.max(400, Math.round(data.documentHeight) + 48);
					// Only the LIVE embed (ts===0) has the layout shim — the
					// frozen PREVIOUS embeds use embed-versioned (no shim). So
					// the height message is always about the live embed.
					const live = ed.getCurrentPageShapes().find(
						(s) => s.type === "frontpage-embed" && ((s.props as { ts?: number }).ts ?? 0) === 0,
					);
					if (live) {
						const cur = (live.props as { h?: number }).h ?? 0;
						if (Math.abs(cur - targetH) > 24) {
							ed.updateShape({
								id: live.id,
								type: "frontpage-embed",
								props: { ...(live.props as Record<string, unknown>), h: targetH },
							});
						}
					}
				}
			};
			window.addEventListener("message", onMessage);

			// --- LIVE REVISION (SSE): when the agent runs frontpage_update,
			// freeze the current live embed at the prior version (so the
			// hooman's annotations stay pinned to the OLD content) and append
			// a fresh live embed to the RIGHT showing the new content. No
			// refresh required. ---
			let es: EventSource | null = null;
			try {
				es = new EventSource(`/api/page/${encodeURIComponent(slug)}/events`);
				es.onmessage = (ev) => {
					let data: { type?: string; priorTs?: number; author?: string; summary?: string } | null = null;
					try { data = JSON.parse(ev.data); } catch { return; }
					if (!data || data.type !== "revised") return;

					const allEmbeds = ed.getCurrentPageShapes().filter((s) => s.type === "frontpage-embed");
					const liveEmbeds = allEmbeds.filter((s) => ((s.props as { ts?: number }).ts ?? 0) === 0);
					if (liveEmbeds.length === 0) return;

					// Reference geometry = the RIGHTMOST embed (the filmstrip grows
					// left→right; the newest CURRENT goes furthest right). Y stays
					// aligned to the embed strip so versions line up for comparison.
					const rightmost = allEmbeds.reduce((a, b) => ((a as { x: number }).x >= (b as { x: number }).x ? a : b));
					const rp = rightmost.props as { w: number; h: number };
					const rightX = (rightmost as { x: number }).x;
					const rightY = (rightmost as { y: number }).y;

					// X position = past the right edge of ALL page shapes, not just
					// embeds — the hooman draws notes/arrows/handwriting to the side
					// of the embed, and a new version must never land on top of
					// them. getShapePageBounds covers draw/arrow/note/geo shapes.
					let maxRight = rightX + rp.w;
					for (const s of ed.getCurrentPageShapes()) {
						const b = ed.getShapePageBounds(s);
						if (b && b.maxX > maxRight) maxRight = b.maxX;
					}

					// 1. Freeze EVERY live embed at the prior version (there
					//    should be exactly one, but guard against dupes so we
					//    never end up with two CURRENTs again).
					if (typeof data.priorTs === "number" && data.priorTs > 0) {
						for (const le of liveEmbeds) {
							ed.updateShape({
								id: le.id,
								type: "frontpage-embed",
								props: { ...(le.props as Record<string, unknown>), ts: data.priorTs, label: "PREVIOUS" },
							});
						}
					}

					// 2. Append ONE fresh live embed past the right edge of
					//    EVERYTHING on the canvas (embeds + the hooman's drawings).
					const gap = 120;
					ed.createShape<FrontpageEmbedShape>({
						type: "frontpage-embed",
						x: maxRight + gap,
						y: rightY,
						props: { w: 1200, h: 1500, slug, ts: 0, label: "CURRENT" },
					});
					doSave();

					// 3. Pan to fit the whole filmstrip.
					try { ed.zoomToFit({ animation: { duration: 400 } }); } catch {}
				};
			} catch (err) { console.warn("[frontpage] SSE subscribe failed:", err); }

			return () => {
				cancelled = true;
				window.removeEventListener("message", onMessage);
				try { unlisten(); } catch {}
				try { es?.close(); } catch {}
				// Final flush on unmount so nothing is lost.
				try { void postSnapshot(slug, getSnapshot(ed.store)); } catch {}
			};
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
