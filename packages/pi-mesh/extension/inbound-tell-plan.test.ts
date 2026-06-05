import { describe, expect, test } from "bun:test";
import { planInboundTell } from "./inbound-tell-plan.ts";

describe("planInboundTell — inbound direct-tell routing", () => {
	test("deafened drops the message and flags receiverDeafened (even for an interrupt)", () => {
		for (const preempt of [undefined, "steer", "abort"] as const) {
			const plan = planInboundTell({ deafened: true, preempt, agentBusy: true, ackRequested: "delivered" });
			expect(plan.action).toBe("drop-deafened");
			expect(plan.ackDeafened).toBe(true);
			expect(plan.abortFirst).toBe(false);
			expect(plan.deliverAs).toBeUndefined();
		}
	});

	test("preempt 'abort' cancels in-flight work then delivers + wakes", () => {
		const plan = planInboundTell({ deafened: false, preempt: "abort", agentBusy: true, ackRequested: "delivered" });
		expect(plan.action).toBe("preempt-abort");
		expect(plan.abortFirst).toBe(true);
		expect(plan.deliverAs).toBe("followUp");
		expect(plan.triggerTurn).toBe(true);
		expect(plan.ackDeafened).toBe(false);
	});

	test("preempt 'steer' lands at next boundary without killing work", () => {
		const plan = planInboundTell({ deafened: false, preempt: "steer", agentBusy: true, ackRequested: "delivered" });
		expect(plan.action).toBe("preempt-steer");
		expect(plan.abortFirst).toBe(false);
		expect(plan.deliverAs).toBe("steer");
		expect(plan.triggerTurn).toBe(true);
	});

	test("preempt overrides busy/idle — interrupt jumps the queue regardless of busy state", () => {
		const busy = planInboundTell({ deafened: false, preempt: "steer", agentBusy: true, ackRequested: "delivered" });
		const idle = planInboundTell({ deafened: false, preempt: "steer", agentBusy: false, ackRequested: "delivered" });
		expect(busy.action).toBe("preempt-steer");
		expect(idle.action).toBe("preempt-steer");
	});

	test("busy + normal tell is queued and acked 'delivered'", () => {
		const plan = planInboundTell({ deafened: false, preempt: undefined, agentBusy: true, ackRequested: "delivered" });
		expect(plan.action).toBe("queue");
		expect(plan.ackPhase).toBe("delivered");
		expect(plan.deliverAs).toBeUndefined();
	});

	test("idle + normal tell ('delivered' wait) surfaces with a turn trigger", () => {
		const plan = planInboundTell({ deafened: false, preempt: undefined, agentBusy: false, ackRequested: "delivered" });
		expect(plan.action).toBe("surface");
		expect(plan.ackPhase).toBe("delivered");
		expect(plan.deliverAs).toBe("followUp");
		expect(plan.triggerTurn).toBe(true);
	});

	test("idle + normal tell ('visible' wait) surfaces via pi default (no forced turn) and acks 'visible'", () => {
		const plan = planInboundTell({ deafened: false, preempt: undefined, agentBusy: false, ackRequested: "visible" });
		expect(plan.action).toBe("surface");
		expect(plan.ackPhase).toBe("visible");
		expect(plan.deliverAs).toBeUndefined();
		expect(plan.triggerTurn).toBeUndefined();
	});

	test("preempt with 'visible' wait acks 'visible'; with default wait acks 'delivered'", () => {
		expect(planInboundTell({ deafened: false, preempt: "steer", agentBusy: true, ackRequested: "visible" }).ackPhase).toBe("visible");
		expect(planInboundTell({ deafened: false, preempt: "steer", agentBusy: true, ackRequested: "delivered" }).ackPhase).toBe("delivered");
	});
});
