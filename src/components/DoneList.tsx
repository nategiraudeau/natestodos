import type { MouseEvent, PointerEvent, RefObject } from "react";
import type { EditState, TodoItem } from "../types";

type DoneListProps = {
  done: TodoItem[];
  doneOpen: boolean;
  doneCount: number;
  editing: EditState | null;
  editInputRef: RefObject<HTMLInputElement | null>;
  onToggleDoneOpen: () => void;
  onRowPointerDown: (e: PointerEvent<HTMLLIElement>, i: number, value: string) => void;
  onRowMouseUp: (e: MouseEvent<HTMLLIElement>, i: number, value: string) => void;
  onRowClick: (e: MouseEvent<HTMLLIElement>, i: number, value: string) => void;
  onSetOpen: (i: number) => void;
  onEditValueChange: (value: string) => void;
  onFinishEdit: () => void;
  onDeleteEdit: () => void;
  onLoadMore: () => void;
};

export default function DoneList({
  done,
  doneOpen,
  doneCount,
  editing,
  editInputRef,
  onToggleDoneOpen,
  onRowPointerDown,
  onRowMouseUp,
  onRowClick,
  onSetOpen,
  onEditValueChange,
  onFinishEdit,
  onDeleteEdit,
  onLoadMore
}: DoneListProps) {
  const hasDoneItems = done.length > 0;

  return (
    <>
      <button className={hasDoneItems ? "done-header" : "done-header stale"} type="button" onClick={hasDoneItems ? onToggleDoneOpen : () => {}}>
        {done.length} done {hasDoneItems ? (doneOpen ? "-" : "+") : ""}
      </button>

      {doneOpen && hasDoneItems ? (
        <ul className="done-list">
          {done.slice(0, doneCount).map((it, i) => {
            const isEditing = editing?.list === "done" && editing.i === i;
            return (
              <li
                key={`d-${i}`}
                className={isEditing ? "item-edit" : undefined}
                onPointerDown={(e) => onRowPointerDown(e, i, it.text)}
                onMouseUp={(e) => onRowMouseUp(e, i, it.text)}
                onClick={(e) => onRowClick(e, i, it.text)}
              >
                <button type="button" className="dot dot-done" aria-label="mark open" onClick={() => onSetOpen(i)}>
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
              </li>
            );
          })}
          {doneCount < done.length ? (
            <li className="load-more">
              <button type="button" onClick={onLoadMore}>
                show more
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </>
  );
}
