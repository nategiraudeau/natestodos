import type { MutableRefObject, MouseEvent, PointerEvent, RefObject } from "react";
import type { DragState, EditState, TodoLine } from "../types";

type OpenListProps = {
  open: TodoLine[];
  drag: DragState | null;
  editing: EditState | null;
  listRef: RefObject<HTMLUListElement | null>;
  rowRefs: MutableRefObject<Array<HTMLLIElement | null>>;
  editInputRef: RefObject<HTMLInputElement | null>;
  getOffset: (i: number) => number;
  onRowPointerDown: (e: PointerEvent<HTMLLIElement>, i: number, value: string) => void;
  onRowMouseUp: (e: MouseEvent<HTMLLIElement>, i: number, value: string) => void;
  onRowClick: (e: MouseEvent<HTMLLIElement>, i: number, value: string) => void;
  onSetDone: (i: number) => void;
  onEditValueChange: (value: string) => void;
  onFinishEdit: () => void;
  onDeleteEdit: () => void;
};

export default function OpenList({
  open,
  drag,
  editing,
  listRef,
  rowRefs,
  editInputRef,
  getOffset,
  onRowPointerDown,
  onRowMouseUp,
  onRowClick,
  onSetDone,
  onEditValueChange,
  onFinishEdit,
  onDeleteEdit
}: OpenListProps) {
  return (
    <ul ref={listRef} className={drag ? "open-list dragging" : "open-list"}>
      {open.map((it, i) => {
        const value = it.kind === "divider" ? it.label : it.text;
        const isEditing = editing?.list === "open" && editing.i === i;
        const liClassName = [
          drag?.from === i ? "drag-source" : "",
          it.kind === "divider" ? "divider-row" : "",
          isEditing ? "item-edit" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <li
            key={`o-${i}-${it.kind === "divider" ? it.label : it.text}`}
            ref={(el) => {
              rowRefs.current[i] = el;
            }}
            className={liClassName || undefined}
            onPointerDown={(e) => onRowPointerDown(e, i, value)}
            onMouseUp={(e) => onRowMouseUp(e, i, value)}
            onClick={(e) => onRowClick(e, i, value)}
            style={{
              transform: `translateY(${getOffset(i)}px)`,
              zIndex: drag?.from === i ? 50 : 1
            }}
          >
            {it.kind === "divider" ? (
              isEditing ? (
                <input
                  ref={editInputRef}
                  autoFocus
                  value={editing.value}
                  onChange={(e) => onEditValueChange(e.target.value)}
                  onBlur={onFinishEdit}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                      e.preventDefault();
                      onDeleteEdit();
                      return;
                    }
                    if (e.key === "Enter") onFinishEdit();
                  }}
                />
              ) : (
                <strong data-edit-text>{it.label}</strong>
              )
            ) : (
              <>
                <button type="button" className="dot" aria-label="mark done" onClick={() => onSetDone(i)}>
                  <span className="dot-circle" aria-hidden="true" />
                </button>
                {isEditing ? (
                  <input
                    ref={editInputRef}
                    autoFocus
                    value={editing.value}
                    onChange={(e) => onEditValueChange(e.target.value)}
                    onBlur={onFinishEdit}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                        e.preventDefault();
                        onDeleteEdit();
                        return;
                      }
                      if (e.key === "Enter") onFinishEdit();
                    }}
                  />
                ) : (
                  <span data-edit-text>{it.text}</span>
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
