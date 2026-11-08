interface Chip<T> {
  value: T;
  label: string;
  count: number;
  color?: string;
}
interface Props<T> {
  title: string;
  hint?: string;
  chips: Chip<T>[];
  selected: ReadonlySet<T>;
  onToggle: (v: T) => void;
}

export function ChipGroup<T extends string | number>({ title, hint, chips, selected, onToggle }: Props<T>) {
  return (
    <fieldset className="group">
      <legend>
        {title}
        {hint && <span className="hint"> · {hint}</span>}
      </legend>
      <div className="chips">
        {chips.map((c) => (
          <button
            key={String(c.value)}
            type="button"
            className="chip"
            aria-pressed={selected.has(c.value)}
            onClick={() => onToggle(c.value)}
          >
            {c.color && <span className="dot" style={{ background: c.color }} aria-hidden />}
            {c.label}
            <span className="count">{c.count}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
