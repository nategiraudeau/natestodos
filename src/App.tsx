import { FormEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { getTodos, putTodos } from "./api/todos";
import DoneList from "./components/DoneList";
import OpenList from "./components/OpenList";
import { cleanupDividers, moveItem, splitTodos } from "./lib/todos";
import type { DragState, EditSel, EditState, TodoItem, TodoLine } from "./types";

const DONE_PAGE = 5;
type SelectionSource = { list: "open" | "done"; i: number; value: string; host: HTMLElement };

export default function App() {
  const [items, setItems] = useState<TodoLine[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [doneOpen, setDoneOpen] = useState(false);
  const [doneCount, setDoneCount] = useState(DONE_PAGE);
  const [pendingDrag, setPendingDrag] = useState<{ i: number; x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [editSel, setEditSel] = useState<EditSel | null>(null);

  const listRef = useRef<HTMLUListElement | null>(null);
  const rowRefs = useRef<Array<HTMLLIElement | null>>([]);
  const suppressEditClick = useRef(false);
  const suppressRowClick = useRef(false);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const selectionSourceRef = useRef<SelectionSource | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const stored = localStorage.getItem("theme_override");
    if (stored === "light" || stored === "dark") root.setAttribute("data-theme", stored);

    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "d") return;
      e.preventDefault();
      const current = root.getAttribute("data-theme");
      const baseDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const next = current ? (current === "dark" ? "light" : "dark") : baseDark ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem("theme_override", next);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const load = async () => {
    try {
      setError("");
      setItems(await getTodos());
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const { open, done } = useMemo(() => splitTodos(items), [items]);

  const save = async (nextOpen: TodoLine[], nextDone: TodoItem[]) => {
    try {
      setError("");
      const next = [...cleanupDividers(nextOpen), ...nextDone];
      await putTodos(next);
      setItems(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    }
  };

  const onAdd = async (e: FormEvent) => {
    e.preventDefault();
    const raw = text.trim();
    if (!raw) return;

    if (raw.startsWith(">")) {
      const label = raw.slice(1).trim();
      if (!label) {
        setError("divider needs text");
        return;
      }
      await save([...open, { kind: "divider", label }], done);
    } else {
      await save([...open, { kind: "todo", done: false, text: raw }], done);
    }

    setText("");
  };

  const setDone = async (openIndex: number) => {
    const it = open[openIndex];
    if (!it || it.kind !== "todo") return;
    const nextOpen = open.slice();
    nextOpen.splice(openIndex, 1);
    await save(nextOpen, [{ ...it, done: true }, ...done]);
  };

  const setOpen = async (doneIndex: number) => {
    const it = done[doneIndex];
    if (!it) return;
    const nextDone = done.slice();
    nextDone.splice(doneIndex, 1);
    await save([...open, { ...it, done: false }], nextDone);
  };

  const dropDrag = async (d: DragState | null) => {
    if (!d) return;
    suppressEditClick.current = true;
    if (d.from === d.to) {
      setDrag(null);
      return;
    }
    await save(moveItem(open, d.from, d.to), done);
    setDrag(null);
  };

  useEffect(() => {
    const onMove = (e: globalThis.PointerEvent) => {
      if (pendingDrag && !drag) {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) {
          setPendingDrag(null);
          return;
        }
        const dx = Math.abs(e.clientX - pendingDrag.x);
        const dy = Math.abs(e.clientY - pendingDrag.y);
        if (dy < 4 || dy <= dx) return;
        const listRect = listRef.current?.getBoundingClientRect();
        if (!listRect) return;
        const mids = rowRefs.current.map((el) => {
          const r = el?.getBoundingClientRect();
          return r ? r.top + r.height * 0.35 : 0;
        });
        const h = rowRefs.current[pendingDrag.i]?.getBoundingClientRect().height ?? 24;
        setDrag({ from: pendingDrag.i, to: pendingDrag.i, startY: pendingDrag.y, y: e.clientY, h, cuts: mids });
        selectionSourceRef.current = null;
        return;
      }

      if (!drag) return;
      const listRect = listRef.current?.getBoundingClientRect();
      if (!listRect) return;
      if (e.clientX < listRect.left || e.clientX > listRect.right) return;

      let to = 0;
      for (let i = 0; i < drag.cuts.length; i += 1) if (e.clientY >= drag.cuts[i]) to = i;
      setDrag({ ...drag, to, y: e.clientY });
    };

    const onUp = () => {
      setPendingDrag(null);
      if (drag) {
        selectionSourceRef.current = null;
        void dropDrag(drag);
        return;
      }
      const src = selectionSourceRef.current;
      selectionSourceRef.current = null;
      if (!src) return;
      maybeEditFromSelectionHost(src);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [pendingDrag, drag, open, done]);

  const getOffset = (i: number) => {
    if (!drag) return 0;
    if (i === drag.from) return drag.y - drag.startY;
    if (drag.from < drag.to && i > drag.from && i <= drag.to) return -drag.h;
    if (drag.to < drag.from && i >= drag.to && i < drag.from) return drag.h;
    return 0;
  };

  const getSelectionIn = (el: HTMLElement) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.anchorNode || !sel.focusNode) return null;
    if (!el.contains(sel.anchorNode) || !el.contains(sel.focusNode)) return null;

    const toChar = (node: Node, offset: number) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.setEnd(node, offset);
      return r.toString().length;
    };

    const a = toChar(sel.anchorNode, sel.anchorOffset);
    const b = toChar(sel.focusNode, sel.focusOffset);
    return { start: Math.min(a, b), end: Math.max(a, b) };
  };

  const beginEdit = (list: "open" | "done", i: number, value: string) => {
    if (suppressRowClick.current) {
      suppressRowClick.current = false;
      return;
    }
    if (suppressEditClick.current) {
      suppressEditClick.current = false;
      return;
    }
    setEditSel(null);
    setEditing({ list, i, value });
  };

  const charAtPoint = (textEl: HTMLElement, x: number, y: number, len: number) => {
    const doc = document as Document & {
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };

    let node: Node | null = null;
    let off = 0;

    const pos = doc.caretPositionFromPoint?.(x, y);
    if (pos) {
      node = pos.offsetNode;
      off = pos.offset;
    } else {
      const range = doc.caretRangeFromPoint?.(x, y);
      if (range) {
        node = range.startContainer;
        off = range.startOffset;
      }
    }

    if (node && textEl.contains(node)) {
      const r = document.createRange();
      r.selectNodeContents(textEl);
      r.setEnd(node, off);
      return Math.max(0, Math.min(r.toString().length, len));
    }

    const rect = textEl.getBoundingClientRect();
    if (x <= rect.left) return 0;
    if (x >= rect.right) return len;
    return len;
  };

  const beginEditAtPoint = (e: ReactMouseEvent<HTMLElement>, list: "open" | "done", i: number, value: string) => {
    if (suppressRowClick.current) {
      suppressRowClick.current = false;
      return;
    }
    if (suppressEditClick.current) {
      suppressEditClick.current = false;
      return;
    }
    const host = e.currentTarget;
    const textEl = (host.querySelector("[data-edit-text]") as HTMLElement | null) ?? host;
    const p = charAtPoint(textEl, e.clientX, e.clientY, value.length);
    setEditSel({ list, i, start: p, end: p });
    setEditing({ list, i, value });
  };

  const maybeEditFromSelection = (e: ReactMouseEvent<HTMLElement>, list: "open" | "done", i: number, value: string) => {
    selectionSourceRef.current = null;
    if (suppressEditClick.current) return;
    const host = e.currentTarget;
    const textEl = (host.querySelector("[data-edit-text]") as HTMLElement | null) ?? host;
    const hit = getSelectionIn(textEl);
    if (!hit) return;
    suppressRowClick.current = true;
    setEditSel({ list, i, ...hit });
    setEditing({ list, i, value });
  };

  const maybeEditFromSelectionHost = (src: SelectionSource) => {
    if (suppressEditClick.current) return;
    const textEl = (src.host.querySelector("[data-edit-text]") as HTMLElement | null) ?? src.host;
    const hit = getSelectionIn(textEl);
    if (!hit) return;
    suppressRowClick.current = true;
    setEditSel({ list: src.list, i: src.i, ...hit });
    setEditing({ list: src.list, i: src.i, value: src.value });
  };

  useEffect(() => {
    if (!editing || !editSel) return;
    if (editing.list !== editSel.list || editing.i !== editSel.i) return;
    const input = editInputRef.current;
    if (!input) return;
    const len = input.value.length;
    const start = Math.max(0, Math.min(editSel.start, len));
    const end = Math.max(0, Math.min(editSel.end, len));
    requestAnimationFrame(() => input.setSelectionRange(start, end));
    setEditSel(null);
  }, [editing, editSel]);

  const finishEdit = async () => {
    if (!editing) return;
    const value = editing.value.trim();
    if (!value) {
      await deleteEditing();
      return;
    }

    if (editing.list === "open") {
      const next = open.slice();
      const it = next[editing.i];
      if (!it) return;
      next[editing.i] = it.kind === "divider" ? { ...it, label: value } : { ...it, text: value };
      await save(next, done);
    } else {
      const next = done.slice();
      const it = next[editing.i];
      if (!it) return;
      next[editing.i] = { ...it, text: value };
      await save(open, next);
    }

    setEditing(null);
  };

  const deleteEditing = async () => {
    if (!editing) return;

    if (editing.list === "open") {
      const next = open.slice();
      if (!next[editing.i]) return;
      next.splice(editing.i, 1);
      await save(next, done);
    } else {
      const next = done.slice();
      if (!next[editing.i]) return;
      next.splice(editing.i, 1);
      await save(open, next);
    }

    setEditing(null);
    setEditSel(null);
  };

  return (
    <main>
      <form onSubmit={onAdd}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="todo or > divider" />
      </form>

      {error ? <p>{error}</p> : null}

      <OpenList
        open={open}
        drag={drag}
        editing={editing}
        listRef={listRef}
        rowRefs={rowRefs}
        editInputRef={editInputRef}
        getOffset={getOffset}
        onRowPointerDown={(e: ReactPointerEvent<HTMLLIElement>, i, value) => {
          const t = e.target as HTMLElement;
          if (t.closest("button") || t.closest("input")) return;
          selectionSourceRef.current = { list: "open", i, value, host: e.currentTarget };
          setPendingDrag({ i, x: e.clientX, y: e.clientY });
        }}
        onRowMouseUp={(e: ReactMouseEvent<HTMLLIElement>, i, value) => {
          const t = e.target as HTMLElement;
          if (t.closest("button") || t.closest("input")) return;
          maybeEditFromSelection(e, "open", i, value);
        }}
        onRowClick={(e: ReactMouseEvent<HTMLLIElement>, i, value) => {
          const t = e.target as HTMLElement;
          if (t.closest("button") || t.closest("input")) return;
          beginEditAtPoint(e, "open", i, value);
        }}
        onSetDone={(i) => void setDone(i)}
        onEditValueChange={(value) =>
          setEditing((prev) => {
            if (!prev) return prev;
            return { ...prev, value };
          })
        }
        onFinishEdit={() => void finishEdit()}
        onDeleteEdit={() => void deleteEditing()}
      />

      <DoneList
        done={done}
        doneOpen={doneOpen}
        doneCount={doneCount}
        editing={editing}
        editInputRef={editInputRef}
        onToggleDoneOpen={() => setDoneOpen((v) => !v)}
        onRowPointerDown={(e: ReactPointerEvent<HTMLLIElement>, i, value) => {
          const t = e.target as HTMLElement;
          if (t.closest("button") || t.closest("input")) return;
          selectionSourceRef.current = { list: "done", i, value, host: e.currentTarget };
        }}
        onRowMouseUp={(e: ReactMouseEvent<HTMLLIElement>, i, value) => {
          const t = e.target as HTMLElement;
          if (t.closest("button") || t.closest("input")) return;
          maybeEditFromSelection(e, "done", i, value);
        }}
        onRowClick={(e: ReactMouseEvent<HTMLLIElement>, i, value) => {
          const t = e.target as HTMLElement;
          if (t.closest("button") || t.closest("input")) return;
          beginEditAtPoint(e, "done", i, value);
        }}
        onSetOpen={(i) => void setOpen(i)}
        onEditValueChange={(value) =>
          setEditing((prev) => {
            if (!prev) return prev;
            return { ...prev, value };
          })
        }
        onFinishEdit={() => void finishEdit()}
        onDeleteEdit={() => void deleteEditing()}
        onLoadMore={() => setDoneCount((n) => n + DONE_PAGE)}
      />
    </main>
  );
}
