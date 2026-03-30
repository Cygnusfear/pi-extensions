export interface TicketNote {
  timestamp: string;
  text: string;
}

export interface ParsedTicket {
  id: string;
  status: string;
  assignee?: string;
  subject: string;
  description: string;
  notes: TicketNote[];
  tags: string[];
}

/**
 * Parse `mai --json show <id>` output into a ParsedTicket.
 * Falls back gracefully if the JSON is invalid.
 */
export function parseMaiShow(raw: string): ParsedTicket {
  try {
    const data = JSON.parse(raw.trim());
    const notes: TicketNote[] = [];

    // Comments from mai show have body + timestamp
    if (Array.isArray(data.comments)) {
      for (const c of data.comments) {
        notes.push({
          timestamp: c.timestamp ?? "",
          text: c.body ?? "",
        });
      }
    }

    return {
      id: data.id ?? "",
      status: data.status ?? "open",
      assignee: data.assignee,
      subject: data.title ?? "",
      description: data.body ?? "",
      notes,
      tags: data.tags ?? [],
    };
  } catch {
    throw new Error("Invalid mai JSON output");
  }
}

export function getNewNotes(notes: TicketNote[], lastSeenCount: number): TicketNote[] {
  return notes.slice(lastSeenCount);
}
