import { useRef } from "react";
import type { Place } from "../types";
import { PlaceCard } from "./PlaceCard";

interface Props {
  places: Place[];
  selectedId: number | null;
  shortlist: ReadonlySet<number>;
  onSelect: (id: number) => void;
  onCollapse: () => void;
  onStar: (id: number) => void;
  onClear: () => void;
}

export function PlaceList({ places, selectedId, shortlist, onSelect, onCollapse, onStar, onClear }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Arrow keys move between card headers; Escape collapses.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return onCollapse();
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const heads = [...(ref.current?.querySelectorAll<HTMLElement>("[data-card-head]") ?? [])];
    const i = heads.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    heads[Math.min(heads.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))]?.focus();
  };

  if (places.length === 0) {
    return (
      <div className="empty">
        <p>No places match these filters.</p>
        <button type="button" className="btn" onClick={onClear}>Clear filters</button>
      </div>
    );
  }
  return (
    <div className="list" ref={ref} onKeyDown={onKeyDown}>
      {places.map((p) => (
        <PlaceCard
          key={p.id}
          place={p}
          expanded={p.id === selectedId}
          starred={shortlist.has(p.id)}
          onSelect={onSelect}
          onCollapse={onCollapse}
          onStar={onStar}
        />
      ))}
    </div>
  );
}
