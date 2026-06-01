/**
 * Frontpage v2 tldraw client shell.
 *
 * Renders a tldraw canvas with the frontpage HTML embedded as a custom shape.
 * Persists the canvas snapshot to the server on every change (debounced).
 * Restores the snapshot on mount. Forwards section bounding boxes from the
 * embedded iframe to the server so the agent can compute spatial overlap
 * (sticky → section) without a browser.
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
		// pointerEvents:"none" so wheel/click pass THROUGH to tldraw's canvas.
		// The page is a visual; the canvas is the interaction surface.
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

async function postLayout(slug: string, sections: Array<{ id: string; x: number; y: number; w: number; h: number }>): Promise<void> {
	try {
		await fetch(`/api/page/${encodeURIComponent(slug)}/layout`, {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ sections }),
		});
	} catch {}
}

// ---- app shell ----

function App({ slug }: { slug: string }) {
	const handleMount = React.useCallback(
		(editor: Editor) => {
			let cancelled = false;

			// Async boot: restore snapshot if present, otherwise seed the embed shape.
			(async () => {
				const saved = await loadServerSnapshot(slug);
				if (cancelled) return;
				if (saved) {
					try {
						loadSnapshot(editor.store, saved as Parameters<typeof loadSnapshot>[1]);
					} catch (err) {
						console.warn("[frontpage] failed to load saved snapshot, starting fresh:", err);
					}
				}
				// Make sure exactly one frontpage-embed shape exists for this slug.
				const existing = editor
					.getCurrentPageShapes()
					.find((s) => s.type === "frontpage-embed");
				if (!existing) {
					editor.createShape<FrontpageEmbedShape>({
						type: "frontpage-embed",
						x: 0,
						y: 0,
						props: { w: 1200, h: 8000, slug },
					});
				}
				// Set view to 1:1 with a small padding offset only on FIRST load
				// (no saved snapshot). With a saved snapshot, tldraw restores
				// the camera too.
				if (!saved) {
					editor.setCamera({ x: 40, y: 40, z: 1 }, { animation: { duration: 0 } });
				}

				// Persist on every change (debounced).
				const saveSoon = debounce(() => {
					const snap = getSnapshot(editor.store);
					void postSnapshot(slug, snap);
				}, 500);
				editor.store.listen(saveSoon, { scope: "document" });
			})();

			// Receive section bounds from the iframe's layout shim and forward.
			const onMessage = (ev: MessageEvent) => {
				const data = ev.data as { type?: string; sections?: unknown };
				if (!data || data.type !== "frontpage:layout" || !Array.isArray(data.sections)) return;
				void postLayout(
					slug,
					data.sections as Array<{ id: string; x: number; y: number; w: number; h: number }>,
				);
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
		<Tldraw
			shapeUtils={[FrontpageEmbedShapeUtil]}
			onMount={handleMount}
			components={components}
		/>
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
