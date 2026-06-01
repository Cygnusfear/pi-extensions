/**
 * Apple Time Machine-style canvas history.
 *
 * - Full-screen overlay (cosmic dark background, starfield vibes).
 * - Center: the selected version's canvas, rendered into a read-only
 *   tldraw instance that includes the frontpage HTML embed at that
 *   version (via /api/page/<slug>/embed-versioned?ts=<ts>).
 * - Behind: z-stacked "ghost" panels suggesting depth (frosted, receding).
 * - Right edge: vertical timeline with one tick per history entry,
 *   color-coded by author. Scroll wheel and ↑/↓ navigate. Click a tick
 *   to jump.
 * - Bottom: "Restore to this point" / "Cancel" buttons.
 * - Esc closes.
 *
 * Distinguishes hooman edits (warm) from agent edits (cool / per-agent
 * hash color) and restore points (cyan) at a glance via color + label.
 */

import * as React from "react";
import {
	Tldraw,
	type Editor,
	type RecordProps,
	type TLBaseShape,
	type TLEditorComponents,
	BaseBoxShapeUtil,
	HTMLContainer,
	T,
	loadSnapshot,
} from "tldraw";

// ---- versioned embed shape (read-only Time Machine view) ----

type VersionedEmbedShape = TLBaseShape<
	"versioned-embed",
	{ w: number; h: number; slug: string; ts: number }
>;

class VersionedEmbedShapeUtil extends BaseBoxShapeUtil<VersionedEmbedShape> {
	static override type = "versioned-embed" as const;
	static override props: RecordProps<VersionedEmbedShape> = {
		w: T.number,
		h: T.number,
		slug: T.string,
		ts: T.number,
	};
	getDefaultProps(): VersionedEmbedShape["props"] {
		return { w: 1200, h: 8000, slug: "", ts: 0 };
	}
	override canResize = () => false;
	override hideResizeHandles = () => true;
	override hideRotateHandle = () => true;
	override canEdit = () => false;
	component(shape: VersionedEmbedShape) {
		const url = shape.props.ts > 0
			? `/api/page/${encodeURIComponent(shape.props.slug)}/embed-versioned?ts=${shape.props.ts}`
			: `/page/${encodeURIComponent(shape.props.slug)}/embed`;
		return (
			<HTMLContainer
				id={shape.id}
				style={{
					width: shape.props.w,
					height: shape.props.h,
					pointerEvents: "none",
					overflow: "hidden",
					background: "#fafaf7",
					boxShadow: "0 8px 28px rgba(0,0,0,0.2)",
					borderRadius: 6,
				}}
			>
				<iframe
					src={url}
					title={`${shape.props.slug}@${shape.props.ts}`}
					style={{ width: "100%", height: "100%", border: 0, display: "block", background: "white", pointerEvents: "none" }}
				/>
			</HTMLContainer>
		);
	}
	indicator(shape: VersionedEmbedShape) {
		return <rect width={shape.props.w} height={shape.props.h} rx={6} ry={6} />;
	}
}

// ---- author color ----

function djb2(s: string): number {
	let h = 5381;
	for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) & 0xffffffff;
	return Math.abs(h);
}

const AGENT_PALETTE = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#6366f1", "#14b8a6", "#a855f7"];

export function authorColor(author: string): string {
	if (author === "hooman") return "#eab308"; // warm yellow — the hooman's edits
	if (author.startsWith("restore-from:")) return "#0891b2"; // cyan — restore points
	if (author.startsWith("agent:")) {
		const name = author.slice(6) || "agent";
		return AGENT_PALETTE[djb2(name) % AGENT_PALETTE.length];
	}
	return "#9ca3af"; // grey — unknown
}

export function authorLabel(author: string): string {
	if (author === "hooman") return "you";
	if (author.startsWith("restore-from:")) return "↩ restored";
	if (author.startsWith("agent:")) return author.slice(6) || "agent";
	return author;
}

function formatRel(ts: number): string {
	const diff = Date.now() - ts;
	if (diff < 60_000) return `${Math.round(diff / 1000)}s`;
	if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m`;
	if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h`;
	return `${Math.round(diff / 86_400_000)}d`;
}

function formatAbs(ts: number): string {
	const d = new Date(ts);
	return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ---- timeline ticks ----

interface HistorySummary { ts: number; author: string; shapeCount: number }

function TimelineRail({
	entries,
	selectedIdx,
	onSelect,
}: { entries: HistorySummary[]; selectedIdx: number; onSelect: (idx: number) => void }) {
	// Newest at top.
	const ordered = React.useMemo(() => entries.slice().reverse(), [entries]);
	return (
		<div
			style={{
				position: "absolute",
				top: 0,
				right: 0,
				bottom: 0,
				width: 220,
				background: "linear-gradient(180deg, rgba(20,18,32,0.85), rgba(8,8,16,0.95))",
				borderLeft: "1px solid rgba(255,255,255,0.08)",
				display: "flex",
				flexDirection: "column",
				color: "#e7e7ec",
				fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
				overflow: "hidden",
			}}
		>
			<div style={{ padding: "16px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
				<div style={{ fontSize: 11, letterSpacing: "0.12em", color: "rgba(255,255,255,0.5)" }}>TIME MACHINE</div>
				<div style={{ fontSize: 14, marginTop: 4, fontWeight: 500 }}>{ordered.length} version{ordered.length === 1 ? "" : "s"}</div>
			</div>
			<div style={{ overflowY: "auto", flex: 1 }}>
				{ordered.map((e, idx) => {
					const reverseIdx = entries.length - 1 - idx; // map back to original index
					const isSelected = reverseIdx === selectedIdx;
					const isCurrent = idx === 0;
					return (
						<button
							key={e.ts}
							onClick={() => onSelect(reverseIdx)}
							style={{
								all: "unset",
								display: "flex",
								alignItems: "center",
								gap: 10,
								padding: "10px 20px",
								cursor: "pointer",
								borderLeft: isSelected ? `3px solid ${authorColor(e.author)}` : "3px solid transparent",
								background: isSelected ? "rgba(255,255,255,0.06)" : "transparent",
								transition: "background 0.15s",
							}}
							onMouseEnter={(ev) => { if (!isSelected) (ev.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)"; }}
							onMouseLeave={(ev) => { if (!isSelected) (ev.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
						>
							<span style={{
								width: 10,
								height: 10,
								borderRadius: "50%",
								background: authorColor(e.author),
								flexShrink: 0,
								boxShadow: isSelected ? `0 0 8px ${authorColor(e.author)}` : "none",
							}} />
							<div style={{ flex: 1, minWidth: 0 }}>
								<div style={{ fontSize: 12, fontWeight: 500, display: "flex", justifyContent: "space-between" }}>
									<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
										{authorLabel(e.author)}
									</span>
									<span style={{ color: "rgba(255,255,255,0.5)", marginLeft: 6 }}>{formatRel(e.ts)}</span>
								</div>
								<div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
									{e.shapeCount} shape{e.shapeCount === 1 ? "" : "s"}{isCurrent ? " · now" : ""}
								</div>
							</div>
						</button>
					);
				})}
			</div>
			<div style={{ padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
				↑ / ↓ / wheel to navigate
			</div>
		</div>
	);
}

// ---- main Time Machine overlay ----

export interface TimeMachineProps {
	slug: string;
	onClose: () => void;
}

export function TimeMachine({ slug, onClose }: TimeMachineProps) {
	const [entries, setEntries] = React.useState<HistorySummary[] | null>(null);
	const [selectedIdx, setSelectedIdx] = React.useState<number>(-1);
	const [snapshot, setSnapshot] = React.useState<unknown>(null);
	const [loadingSnap, setLoadingSnap] = React.useState(false);
	const [editorRef, setEditorRef] = React.useState<Editor | null>(null);
	const [error, setError] = React.useState<string | null>(null);
	const [restoring, setRestoring] = React.useState(false);

	// Fetch the history list once.
	React.useEffect(() => {
		(async () => {
			try {
				const r = await fetch(`/api/page/${encodeURIComponent(slug)}/history`);
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				const body = (await r.json()) as { entries: HistorySummary[] };
				setEntries(body.entries);
				setSelectedIdx(body.entries.length - 1); // newest = top
			} catch (err) {
				setError(err instanceof Error ? err.message : String(err));
			}
		})();
	}, [slug]);

	// Fetch the snapshot for the currently selected version.
	React.useEffect(() => {
		if (!entries || selectedIdx < 0) return;
		const ts = entries[selectedIdx]?.ts;
		if (!ts) return;
		setLoadingSnap(true);
		(async () => {
			try {
				const r = await fetch(`/api/page/${encodeURIComponent(slug)}/history/${ts}`);
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				const body = await r.json();
				setSnapshot(body.snapshot ?? null);
			} catch (err) {
				setError(err instanceof Error ? err.message : String(err));
			} finally {
				setLoadingSnap(false);
			}
		})();
	}, [entries, selectedIdx, slug]);

	// Load snapshot into the editor when both are ready.
	React.useEffect(() => {
		if (!editorRef || !snapshot) return;
		try {
			loadSnapshot(editorRef.store, snapshot as Parameters<typeof loadSnapshot>[1]);
			// Stamp every embed shape with the selected ts so iframes load
			// the historical HTML for that version.
			const ts = entries?.[selectedIdx]?.ts ?? 0;
			const shapes = editorRef.getCurrentPageShapes();
			for (const s of shapes) {
				if (s.type === "frontpage-embed" || s.type === "versioned-embed") {
					editorRef.updateShape({
						id: s.id,
						type: "versioned-embed",
						props: { ...(s.props as Record<string, unknown>), ts },
					});
				}
			}
			editorRef.zoomToFit({ animation: { duration: 200 } });
		} catch (err) {
			console.warn("[time-machine] failed to load snapshot:", err);
		}
	}, [editorRef, snapshot, entries, selectedIdx]);

	// Keyboard / wheel navigation.
	React.useEffect(() => {
		const onKey = (ev: KeyboardEvent) => {
			if (ev.key === "Escape") { onClose(); return; }
			if (!entries) return;
			if (ev.key === "ArrowUp") {
				setSelectedIdx((i) => Math.min(entries.length - 1, i + 1));
				ev.preventDefault();
			} else if (ev.key === "ArrowDown") {
				setSelectedIdx((i) => Math.max(0, i - 1));
				ev.preventDefault();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [entries, onClose]);

	const restore = React.useCallback(async () => {
		if (!entries || selectedIdx < 0) return;
		setRestoring(true);
		try {
			const ts = entries[selectedIdx].ts;
			const r = await fetch(`/api/page/${encodeURIComponent(slug)}/restore`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ ts }),
			});
			if (!r.ok) throw new Error(`restore failed: HTTP ${r.status}`);
			// Hard reload — the iframe needs to re-fetch the restored HTML,
			// and the parent shell needs to re-load the restored tldraw state.
			window.location.reload();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setRestoring(false);
		}
	}, [entries, selectedIdx, slug]);

	const components = React.useMemo<TLEditorComponents>(
		() => ({ Toolbar: null, StylePanel: null, MainMenu: null, HelpMenu: null, NavigationPanel: null, QuickActions: null, ActionsMenu: null, PageMenu: null, ZoomMenu: null, DebugPanel: null, DebugMenu: null, MenuPanel: null, SharePanel: null }),
		[],
	);

	const currentEntry = entries && selectedIdx >= 0 ? entries[selectedIdx] : null;
	const isCurrent = entries ? selectedIdx === entries.length - 1 : false;

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 10000,
				background:
					"radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a14 60%, #050508 100%)",
				display: "flex",
				color: "white",
				fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
			}}
		>
			{/* Starfield via simple radial gradient noise (cheap) */}
			<div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5,
				backgroundImage:
					"radial-gradient(1px 1px at 10% 20%, white, transparent), " +
					"radial-gradient(1px 1px at 80% 40%, white, transparent), " +
					"radial-gradient(1px 1px at 50% 70%, white, transparent), " +
					"radial-gradient(1px 1px at 30% 90%, white, transparent), " +
					"radial-gradient(1px 1px at 90% 10%, rgba(255,255,255,0.5), transparent), " +
					"radial-gradient(2px 2px at 65% 25%, rgba(255,255,255,0.7), transparent), " +
					"radial-gradient(1px 1px at 20% 60%, white, transparent), " +
					"radial-gradient(1px 1px at 75% 85%, rgba(255,255,255,0.6), transparent)",
			}} />

			{/* Main stage — center, with z-depth panel ghosts behind */}
			<div
				style={{
					flex: 1,
					marginRight: 220,
					position: "relative",
					perspective: 2000,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{/* Ghost stack: 3 panels receding behind the focused one */}
				{[3, 2, 1].map((d) => (
					<div
						key={d}
						style={{
							position: "absolute",
							width: `min(85%, ${900 - d * 60}px)`,
							height: `${72 - d * 6}%`,
							borderRadius: 8,
							background: "rgba(40, 40, 60, 0.4)",
							border: "1px solid rgba(255,255,255,0.06)",
							boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
							transform: `translateZ(${-d * 200}px) translateY(${d * -10}px)`,
							filter: `blur(${d * 0.5}px)`,
							opacity: 0.5 - d * 0.1,
							pointerEvents: "none",
						}}
					/>
				))}

				{/* Focused version */}
				<div
					style={{
						position: "relative",
						width: "min(85%, 900px)",
						height: "72%",
						borderRadius: 8,
						overflow: "hidden",
						boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)",
						background: "#fafaf7",
					}}
				>
					{loadingSnap && (
						<div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 12, background: "rgba(250,250,247,0.8)", zIndex: 5 }}>
							Loading…
						</div>
					)}
					<Tldraw
						shapeUtils={[VersionedEmbedShapeUtil]}
						components={components}
						onMount={(ed) => { setEditorRef(ed); ed.updateInstanceState({ isReadonly: true }); }}
					/>
				</div>

				{/* Header above the stage */}
				<div style={{ position: "absolute", top: 20, left: 0, right: 0, textAlign: "center", pointerEvents: "none" }}>
					<div style={{ fontSize: 11, letterSpacing: "0.18em", color: "rgba(255,255,255,0.5)" }}>BROWSING</div>
					<div style={{ fontSize: 16, marginTop: 4, fontWeight: 500 }}>
						{currentEntry ? (
							<>
								<span style={{ color: authorColor(currentEntry.author) }}>{authorLabel(currentEntry.author)}</span>
								{" · "}
								{formatAbs(currentEntry.ts)}
								{isCurrent && <span style={{ color: "rgba(255,255,255,0.5)" }}> · now</span>}
							</>
						) : ""}
					</div>
				</div>

				{/* Footer: restore + cancel */}
				<div style={{ position: "absolute", bottom: 30, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 12, pointerEvents: "all" }}>
					<button
						onClick={onClose}
						style={{
							all: "unset",
							padding: "10px 20px",
							borderRadius: 8,
							background: "rgba(255,255,255,0.08)",
							color: "white",
							cursor: "pointer",
							fontSize: 13,
							border: "1px solid rgba(255,255,255,0.15)",
						}}
					>
						Cancel
					</button>
					<button
						disabled={isCurrent || restoring}
						onClick={restore}
						style={{
							all: "unset",
							padding: "10px 24px",
							borderRadius: 8,
							background: isCurrent ? "rgba(255,255,255,0.08)" : "#eab308",
							color: isCurrent ? "rgba(255,255,255,0.4)" : "#1a1a2e",
							cursor: isCurrent || restoring ? "default" : "pointer",
							fontWeight: 600,
							fontSize: 13,
							boxShadow: isCurrent ? "none" : "0 4px 16px rgba(234,179,8,0.4)",
						}}
					>
						{restoring ? "Restoring…" : isCurrent ? "Already at current" : "Restore to this point"}
					</button>
				</div>

				{error && (
					<div style={{ position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)", padding: "8px 14px", background: "#b91c1c", color: "white", fontSize: 12, borderRadius: 6 }}>
						{error}
					</div>
				)}
			</div>

			{/* Right rail: timeline */}
			{entries && (
				<TimelineRail entries={entries} selectedIdx={selectedIdx} onSelect={setSelectedIdx} />
			)}
		</div>
	);
}
