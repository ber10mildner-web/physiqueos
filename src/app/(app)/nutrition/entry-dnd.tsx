"use client";
import { createPortal } from "react-dom";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { DiaryEntry, MealSlot } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n/client";
import { formatNumber } from "@/lib/format";
import { FoodIcon } from "@/components/food-icon";
import { MEAL_COLORS } from "@/lib/meal-colors";

/**
 * Drag a diary entry with the finger (after a long press on the row): to re-sort
 * it inside its meal or to drop it into another meal of the day.
 *
 * Drop zones are found in the DOM: every meal card carries `data-drop-meal`, its
 * header `data-drop-anchor`, and every row `data-entry-id`.
 */

type Drag = { entry: DiaryEntry; y: number; startY: number; grabY: number; left: number; width: number };
type Target = { meal: MealSlot; index: number; lineY: number; left: number; width: number };

type Dnd = {
  /** Starts dragging `entry`; `row` is the row element, y the finger. */
  begin: (entry: DiaryEntry, row: HTMLElement, y: number) => void;
  draggingId: string | null;
  /** True while this entry is being dragged (read in touch handlers, no re-render needed). */
  isDragging: (id: string) => boolean;
  /** Time of the last drop: the click that may follow it must not open a row. */
  lastDropAt: () => number;
};

const DndContext = createContext<Dnd | null>(null);

export function useEntryDnd() {
  return useContext(DndContext);
}

/** Distance from the screen edges (px) where dragging scrolls the page. */
const EDGE = 90;
/** The finger must move this far (px) before dragging can scroll the page. */
const START_SCROLL = 24;
/** Height kept free for the bottom navigation. */
const BOTTOM_NAV = 80;

function rowsOf(card: HTMLElement) {
  return Array.from(card.querySelectorAll<HTMLElement>("[data-entry-id]"));
}

function findTarget(dragId: string, y: number): Target | null {
  const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-drop-meal]"));
  if (!cards.length) return null;
  // The card under the finger, otherwise the closest one.
  let best = cards[0];
  let bestDist = Infinity;
  for (const c of cards) {
    const r = c.getBoundingClientRect();
    const dist = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
    if (dist < bestDist) [best, bestDist] = [c, dist];
  }
  const card = best.getBoundingClientRect();
  const rows = rowsOf(best).filter((r) => r.dataset.entryId !== dragId);
  const index = rows.filter((r) => {
    const b = r.getBoundingClientRect();
    return b.top + b.height / 2 < y;
  }).length;
  let lineY: number;
  if (rows.length === 0) lineY = (best.querySelector("[data-drop-anchor]") ?? best).getBoundingClientRect().bottom;
  else if (index === 0) lineY = rows[0].getBoundingClientRect().top;
  else lineY = rows[index - 1].getBoundingClientRect().bottom;
  return { meal: best.dataset.dropMeal as MealSlot, index, lineY, left: card.left, width: card.width };
}

export function EntryDndProvider({
  onDrop,
  children,
}: {
  /** Called with the meal's complete new order (including the moved entry). */
  onDrop: (id: string, meal: MealSlot, orderedIds: string[]) => void;
  children: ReactNode;
}) {
  const { locale } = useI18n();
  const [drag, setDrag] = useState<Drag | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const targetRef = useRef<Target | null>(null);
  const droppedAt = useRef(0);
  const onDropRef = useRef(onDrop);
  useEffect(() => {
    onDropRef.current = onDrop;
  });

  const begin = useCallback((entry: DiaryEntry, row: HTMLElement, y: number) => {
    const r = row.getBoundingClientRect();
    const d = { entry, y, startY: y, grabY: y - r.top, left: r.left, width: r.width };
    dragRef.current = d;
    setDrag(d);
    const t = findTarget(entry.id, y);
    targetRef.current = t;
    setTarget(t);
    navigator.vibrate?.(15);
  }, []);

  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    let raf = 0;
    const update = () => {
      const d = dragRef.current;
      if (!d) return;
      const t = findTarget(d.entry.id, d.y);
      targetRef.current = t;
      setTarget(t);
    };
    const tick = () => {
      const d = dragRef.current;
      if (!d) return;
      const bottom = window.innerHeight - BOTTOM_NAV;
      let speed = 0;
      // Only once the finger has moved: a row picked up near the edge must not scroll by itself.
      if (Math.abs(d.y - d.startY) < START_SCROLL) speed = 0;
      else if (d.y < EDGE) speed = -Math.ceil(((EDGE - d.y) / EDGE) * 14);
      else if (d.y > bottom - EDGE) speed = Math.ceil((Math.min(EDGE, d.y - (bottom - EDGE)) / EDGE) * 14);
      if (speed) {
        window.scrollBy(0, speed);
        update();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const next = { ...d, y: e.clientY };
      dragRef.current = next;
      setDrag(next);
      update();
    };
    const finish = (drop: boolean) => {
      const d = dragRef.current;
      const t = targetRef.current;
      dragRef.current = null;
      targetRef.current = null;
      setDrag(null);
      setTarget(null);
      droppedAt.current = Date.now();
      if (!drop || !d || !t) return;
      const card = document.querySelector<HTMLElement>(`[data-drop-meal="${t.meal}"]`);
      if (!card) return;
      const before = rowsOf(card).map((r) => r.dataset.entryId!);
      const ids = before.filter((id) => id !== d.entry.id);
      ids.splice(t.index, 0, d.entry.id);
      if (t.meal === d.entry.meal && ids.join() === before.join()) return; // dropped where it was
      onDropRef.current(d.entry.id, t.meal, ids);
    };
    const up = () => finish(true);
    const cancel = () => finish(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [dragging]);

  const api: Dnd = {
    begin,
    draggingId: drag?.entry.id ?? null,
    isDragging: (id) => dragRef.current?.entry.id === id,
    lastDropAt: () => droppedAt.current,
  };

  return (
    <DndContext value={api}>
      {children}
      {/* In a portal: the meal list's spacing must not shift these fixed overlays. */}
      {drag &&
        createPortal(
          <>
            {target && (
              <div
                aria-hidden
                className="pointer-events-none fixed z-40 h-[3px] rounded-full"
                style={{ top: target.lineY - 1.5, left: target.left + 12, width: target.width - 24, background: MEAL_COLORS[target.meal] }}
              />
            )}
            <div
              aria-hidden
              className="pointer-events-none fixed z-50 flex scale-[1.03] items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-2.5 shadow-2xl"
              style={{ top: drag.y - drag.grabY, left: drag.left, width: drag.width }}
            >
              <FoodIcon name={drag.entry.food_name} kind={drag.entry.source} />
              <div className="min-w-0 flex-1 truncate text-[15px]">{drag.entry.food_name}</div>
              <div className="num shrink-0 text-right text-[15px]">{formatNumber(drag.entry.amount_g, locale)} g</div>
            </div>
          </>,
          document.body,
        )}
    </DndContext>
  );
}
