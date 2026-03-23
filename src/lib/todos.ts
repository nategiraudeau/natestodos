import type { TodoItem, TodoLine } from "../types";

export function cleanupDividers(open: TodoLine[]) {
  const out: TodoLine[] = [];
  for (let i = 0; i < open.length; i += 1) {
    const it = open[i];
    if (it.kind !== "divider") {
      out.push(it);
      continue;
    }
    let keep = false;
    for (let j = i + 1; j < open.length; j += 1) {
      const next = open[j];
      if (next.kind === "divider") break;
      keep = true;
      break;
    }
    if (!keep && i === open.length - 1) keep = true;
    if (keep) out.push(it);
  }
  return out;
}

export function splitTodos(items: TodoLine[]) {
  const open = cleanupDividers(items.filter((x) => x.kind === "divider" || (x.kind === "todo" && !x.done)));
  const done = items.filter((x): x is TodoItem => x.kind === "todo" && x.done);
  return { open, done };
}

export function moveItem<T>(arr: T[], from: number, to: number) {
  if (from === to) return arr;
  const next = arr.slice();
  const [m] = next.splice(from, 1);
  next.splice(to, 0, m);
  return next;
}
