/**
 * Replay / capacity state for the Pi↔Maestri bridge. Extracted as pure,
 * clock-injectable classes so the admission rules are unit-testable.
 */

export type RequestAdmission = "new" | "replay" | "saturated";

export interface BridgeRequestTrackerOptions {
	replayLimit: number;
	replayGraceMs: number;
	outboundRecordTtlMs: number;
}

export class BridgeRequestTracker {
	private readonly seenRequestIds = new Map<string, number>();
	private readonly outboundRequestIds = new Map<string, number>();

	constructor(private readonly options: BridgeRequestTrackerOptions) {}

	private pruneExpired(cache: Map<string, number>, now: number): void {
		for (const [id, expiresAt] of cache) {
			if (expiresAt <= now) cache.delete(id);
		}
	}

	claimIncomingRequest(
		request: { id: string; expiresAt: number },
		now: number = Date.now(),
	): RequestAdmission {
		this.pruneExpired(this.seenRequestIds, now);
		if (this.seenRequestIds.has(request.id)) return "replay";
		if (this.seenRequestIds.size >= this.options.replayLimit)
			return "saturated";
		this.seenRequestIds.set(
			request.id,
			request.expiresAt + this.options.replayGraceMs,
		);
		return "new";
	}

	rememberOutboundRequest(
		requestId: string,
		now: number = Date.now(),
	): boolean {
		this.pruneExpired(this.outboundRequestIds, now);
		if (this.outboundRequestIds.size >= this.options.replayLimit) return false;
		this.outboundRequestIds.set(
			requestId,
			now + this.options.outboundRecordTtlMs,
		);
		return true;
	}

	claimOutboundReply(requestId: string, now: number = Date.now()): boolean {
		this.pruneExpired(this.outboundRequestIds, now);
		if (!this.outboundRequestIds.has(requestId)) return false;
		this.outboundRequestIds.delete(requestId);
		return true;
	}

	dropOutboundRequest(requestId: string): void {
		this.outboundRequestIds.delete(requestId);
	}
}

export type TransportDisposition = "started" | "queued" | "dropped";

export interface TransportSubmission<T> {
	disposition: TransportDisposition;
	/** Settles with the task result once it actually runs; undefined when dropped. */
	done: Promise<T> | undefined;
}

/** A reserved reply always runs — its done promise is always present. */
export interface ReservedTransportSubmission<T> {
	disposition: "started" | "queued";
	done: Promise<T>;
}

interface QueuedTask<T> {
	run: () => Promise<T>;
	resolve: (value: T) => void;
	reject: (error: unknown) => void;
}

/**
 * Bounded admission owner for detached `maestri ask` transports. Every
 * in-flight transport is a live process for up to its submit timeout, so
 * process count must be bounded at ADMISSION, not at spawn time.
 *
 * Two traffic classes with different guarantees:
 *
 * - **Replies to accepted bridge requests are non-droppable.** Capacity for a
 *   reply is RESERVED when the request is accepted (tryReserveReply); a
 *   request that cannot reserve reply capacity is rejected as busy instead of
 *   being accepted and losing its answer later. The reservation is consumed
 *   when the reply transport is submitted (submitReservedReply) and released
 *   if the accepted work ends without a reply.
 *
 * - **Courtesy rejections are droppable and never queued** (submitRejection).
 *   A flood of busy/saturated requests can therefore never spawn unbounded
 *   processes; excess rejections are dropped and audited by the caller.
 */
export class DetachedTransportQueue {
	private active = 0;
	private reserved = 0;
	private readonly waiting: Array<QueuedTask<unknown>> = [];

	constructor(
		private readonly maxActive: number,
		private readonly maxQueued: number,
	) {}

	get activeCount(): number {
		return this.active;
	}

	get queuedCount(): number {
		return this.waiting.length;
	}

	get reservedCount(): number {
		return this.reserved;
	}

	private get committed(): number {
		return this.active + this.waiting.length + this.reserved;
	}

	/**
	 * Reserve guaranteed reply capacity for an accepted request. Returns false
	 * when all transport capacity is committed — the caller must reject the
	 * request as busy rather than accept work whose answer could be dropped.
	 */
	tryReserveReply(): boolean {
		if (this.committed >= this.maxActive + this.maxQueued) return false;
		this.reserved += 1;
		return true;
	}

	/** Release a reservation whose accepted work will not produce a reply. */
	releaseReplyReservation(): void {
		if (this.reserved > 0) this.reserved -= 1;
	}

	/**
	 * Submit the reply for an accepted request against its reservation. Always
	 * starts or queues — a reserved reply is never dropped.
	 */
	submitReservedReply<T>(
		run: () => Promise<T>,
	): ReservedTransportSubmission<T> {
		this.releaseReplyReservation();
		if (this.active < this.maxActive) {
			return { disposition: "started", done: this.start(run) };
		}
		let resolve!: (value: T) => void;
		let reject!: (error: unknown) => void;
		const done = new Promise<T>((res, rej) => {
			resolve = res;
			reject = rej;
		});
		this.waiting.push({ run, resolve, reject } as QueuedTask<unknown>);
		return { disposition: "queued", done };
	}

	/**
	 * Submit a courtesy rejection transport. Starts only when doing so keeps
	 * the GLOBAL commitment bound — active + queued + reserved stays at most
	 * maxActive + maxQueued — and an active slot is free. Otherwise drops:
	 * rejections are never queued and never inflate reply capacity.
	 */
	submitRejection<T>(run: () => Promise<T>): TransportSubmission<T> {
		if (this.active >= this.maxActive)
			return { disposition: "dropped", done: undefined };
		if (this.committed >= this.maxActive + this.maxQueued)
			return { disposition: "dropped", done: undefined };
		return { disposition: "started", done: this.start(run) };
	}

	private start<T>(run: () => Promise<T>): Promise<T> {
		this.active += 1;
		return run()
			.catch((error: unknown) => {
				throw error;
			})
			.finally(() => {
				this.active -= 1;
				const next = this.waiting.shift();
				if (next) {
					void this.start(next.run).then(next.resolve, next.reject);
				}
			});
	}
}
