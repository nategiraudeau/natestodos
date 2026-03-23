import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TodoLine } from "./src/types";

const filePath = path.join(process.cwd(), "todos.txt");
const stampPrefixRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}\s+/;

const bad = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" }
  });

function parseTodos(text: string): TodoLine[] {
  const out: TodoLine[] = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const n = i + 1;
    if (!line.trim()) continue;

    if (line.startsWith(">")) {
      const label = line.slice(1).trim();
      if (!label) throw new Error(`line ${n}: divider needs text`);
      out.push({ kind: "divider", label });
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("[ ] ")) {
      const rest = line.startsWith("- ") ? line.slice(2) : line.slice(4);
      const text = rest.replace(stampPrefixRegex, "").trim();
      if (!text) throw new Error(`line ${n}: bad open todo`);
      out.push({ kind: "todo", done: false, text });
      continue;
    }

    if (line.startsWith("x ")) {
      const rest = line.slice(2);
      const text = rest.replace(stampPrefixRegex, "").trim();
      if (!text) throw new Error(`line ${n}: bad done todo`);
      out.push({ kind: "todo", done: true, text });
      continue;
    }

    throw new Error(`line ${n}: parser no like this line`);
  }

  return out;
}

function validTodoLine(item: unknown): item is TodoLine {
  if (!item || typeof item !== "object") return false;
  const it = item as Record<string, unknown>;

  if (it.kind === "divider") {
    return typeof it.label === "string" && it.label.trim().length > 0;
  }

  if (it.kind === "todo") {
    return typeof it.done === "boolean" && typeof it.text === "string" && it.text.trim().length > 0;
  }

  return false;
}

function serializeTodos(items: TodoLine[]): string {
  return (
    items
      .map((item) => {
        if (item.kind === "divider") return `> ${item.label}`;
        return `${item.done ? "x" : "-"} ${item.text}`;
      })
      .join("\n") + "\n"
  );
}

async function readTodos(): Promise<TodoLine[]> {
  const text = await readFile(filePath, "utf8").catch(() => "");
  return parseTodos(text);
}

Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api/todos" && req.method === "GET") {
      try {
        return Response.json({ items: await readTodos() });
      } catch (error) {
        return bad(error instanceof Error ? error.message : "parse failed", 500);
      }
    }

    if (url.pathname === "/api/todos" && req.method === "PUT") {
      const body = await req.json().catch(() => null);
      if (!body || !Array.isArray(body.items)) return bad("body needs items array");
      if (!body.items.every(validTodoLine)) return bad("bad todo shape");

      try {
        await writeFile(filePath, serializeTodos(body.items), "utf8");
        return Response.json({ ok: true });
      } catch {
        return bad("write failed", 500);
      }
    }

    return bad("not found", 404);
  }
});
