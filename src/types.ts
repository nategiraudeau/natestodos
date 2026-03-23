export type TodoLine =
  | { kind: "divider"; label: string }
  | { kind: "todo"; done: boolean; text: string };

export type TodoItem = Extract<TodoLine, { kind: "todo" }>;
export type DragState = { from: number; to: number; startY: number; y: number; h: number; cuts: number[] };
export type EditState = { list: "open" | "done"; i: number; value: string };
export type EditSel = { list: "open" | "done"; i: number; start: number; end: number };
