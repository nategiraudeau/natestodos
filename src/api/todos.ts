import type { TodoLine } from "../types";

export async function getTodos(): Promise<TodoLine[]> {
  const res = await fetch("/api/todos");
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "load failed");
  return json.items;
}

export async function putTodos(items: TodoLine[]) {
  const res = await fetch("/api/todos", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "save failed");
}
