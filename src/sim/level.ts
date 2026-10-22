// A level file describes one Shift by hand (ADR 0001). Receipt lines, Tickets and
// Accepted outputs are written here; real Node checks them in scripts/level-check.ts.

export type TicketKind = 'nextTick' | 'microtask' | 'timer' | 'immediate';

/** Ticket ids are the names players see, e.g. "B" for the Ticket that prints B. */
export type TicketId = string;

export type Ticket = {
  kind: TicketKind;
  /** 1-based line in the program that creates this Ticket. */
  sourceLine: number;
  /** The Dish that creates this Ticket: the Opening dish, or another Ticket's Dish. */
  createdBy: 'opening' | TicketId;
  /** What this Ticket's Dish prints, in order. */
  receiptLines: string[];
  /** Timers only. */
  delayMs?: number;
};

/** One line of the Opening dish: a grey line prints, a coloured line creates a Ticket. */
export type OpeningLine =
  | { sourceLine: number; prints: string }
  | { sourceLine: number; creates: TicketId };

export type Level = {
  /** The program file, next to the level file. Must be `.cjs` (ADR 0003). */
  program: string;
  openingDish: OpeningLine[];
  tickets: Record<TicketId, Ticket>;
  acceptedOutputs: string[][];
};
