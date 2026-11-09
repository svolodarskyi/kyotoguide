import { useMemo } from "react";
import { taxonomy, typeColor } from "../data";
import { countBy } from "../lib/match";
import { priceLabel } from "../lib/links";
import type { Filters, Place } from "../types";
import { ChipGroup } from "./ChipGroup";

interface Props {
  places: Place[];
  filters: Filters;
  onChange: (f: Filters) => void;
  shortlistSize: number;
}

function toggled<T>(s: ReadonlySet<T>, v: T): Set<T> {
  const n = new Set(s);
  n.has(v) ? n.delete(v) : n.add(v);
  return n;
}

export function FilterPanel({ places, filters: f, onChange, shortlistSize }: Props) {
  const counts = useMemo(
    () => ({
      area: countBy(places, (p) => [p.area]),
      section: countBy(places, (p) => [p.bookSection]),
      type: countBy(places, (p) => [p.type]),
      price: countBy(places, (p) => [p.priceTier]),
      tag: countBy(places, (p) => p.tags),
    }),
    [places],
  );
  const n = (m: Map<any, number>, k: any) => m.get(k) ?? 0;

  return (
    <div className="filters">
      <ChipGroup
        title="Area"
        chips={taxonomy.areas.map((a) => ({ value: a.name, label: a.name, count: n(counts.area, a.name) }))}
        selected={f.area}
        onToggle={(v) => onChange({ ...f, area: toggled(f.area, v) })}
      />
      <ChipGroup
        title="Book section"
        chips={taxonomy.bookSections.map((s) => ({ value: s.name, label: s.name, count: n(counts.section, s.name) }))}
        selected={f.bookSection}
        onToggle={(v) => onChange({ ...f, bookSection: toggled(f.bookSection, v) })}
      />
      <ChipGroup
        title="Type"
        chips={taxonomy.types.map((t) => ({
          value: t.name,
          label: t.name,
          count: n(counts.type, t.name),
          color: typeColor(t.name),
        }))}
        selected={f.type}
        onToggle={(v) => onChange({ ...f, type: toggled(f.type, v) })}
      />
      <ChipGroup
        title="Price"
        chips={taxonomy.priceTiers.map((t) => ({ value: t.value, label: priceLabel(t.value), count: n(counts.price, t.value) }))}
        selected={f.price}
        onToggle={(v) => onChange({ ...f, price: toggled(f.price, v) })}
      />
      <ChipGroup
        title="Features"
        hint="must have all selected"
        chips={taxonomy.tags.map((t) => ({ value: t.name, label: t.name, count: n(counts.tag, t.name) }))}
        selected={f.tags}
        onToggle={(v) => onChange({ ...f, tags: toggled(f.tags, v) })}
      />
      <fieldset className="group">
        <legend>Hours and list</legend>
        <div className="chips">
          <button type="button" className="chip" aria-pressed={f.opensByNineAm} onClick={() => onChange({ ...f, opensByNineAm: !f.opensByNineAm })}>
            Opens by 9am<span className="count">{places.filter((p) => p.opensByNineAm).length}</span>
          </button>
          <button type="button" className="chip" aria-pressed={f.opensLate} onClick={() => onChange({ ...f, opensLate: !f.opensLate })}>
            Open till 10pm<span className="count">{places.filter((p) => p.opensLate).length}</span>
          </button>
          <button type="button" className="chip" aria-pressed={f.shortlist} onClick={() => onChange({ ...f, shortlist: !f.shortlist })}>
            ★ Shortlist<span className="count">{shortlistSize}</span>
          </button>
        </div>
      </fieldset>
    </div>
  );
}
