import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { places as bundledPlaces, typeColor } from "./data";
import { fetchPlaces } from "./lib/api";
import { FilterPanel } from "./components/FilterPanel";
import { MapView } from "./components/MapView";
import { PlaceList } from "./components/PlaceList";
import { buildIndex, emptyFilters, hasActiveFilters, match } from "./lib/match";
import { tokenize } from "./lib/normalize";
import { copyText, shortlistText } from "./lib/links";
import { loadShortlist, saveShortlist } from "./lib/shortlist";
import { fromSearch, toSearch } from "./lib/urlState";
import type { Filters, Place } from "./types";

type Theme = "auto" | "light" | "dark";
const THEMES: Theme[] = ["auto", "light", "dark"];

function loadTheme(): Theme {
  try {
    const t = localStorage.getItem("kyotoguide.theme");
    return t === "light" || t === "dark" ? t : "auto";
  } catch {
    return "auto";
  }
}

export function App() {
  const initial = useMemo(() => fromSearch(window.location.search), []);
  // Starts from the bundled data so the first paint is instant, then switches to the database.
  const [places, setPlaces] = useState<Place[]>(bundledPlaces);
  const [filters, setFilters] = useState<Filters>(initial.filters);
  const [query, setQuery] = useState(initial.query);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [shortlist, setShortlist] = useState<Set<number>>(() => loadShortlist());
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [filtersOpen, setFiltersOpen] = useState(() => window.matchMedia?.("(min-width: 900px)").matches ?? false);
  const [copied, setCopied] = useState<boolean | null>(null);
  const scrollOnSelect = useRef(false);

  // Search index built once.
  const index = useMemo(() => new Map(places.map((p) => [p.id, buildIndex(p)])), [places]);

  const visible = useMemo(() => {
    const tokens = tokenize(query);
    return places.filter((p) => match(p, filters, tokens, index.get(p.id)!, shortlist));
  }, [places, filters, query, shortlist, index]);
  const visibleIds = useMemo(() => new Set(visible.map((p) => p.id)), [visible]);

  // Load from Supabase when configured; on any failure keep showing the bundled data.
  useEffect(() => {
    let cancelled = false;
    fetchPlaces()
      .then((rows) => { if (!cancelled && rows && rows.length) setPlaces(rows); })
      .catch((e) => console.warn("Could not load places from the database; using bundled data.", e));
    return () => { cancelled = true; };
  }, []);

  // Theme: data-theme attribute; "auto" follows prefers-color-scheme.
  useEffect(() => {
    const el = document.documentElement;
    theme === "auto" ? el.removeAttribute("data-theme") : el.setAttribute("data-theme", theme);
    try { localStorage.setItem("kyotoguide.theme", theme); } catch { /* ignore */ }
  }, [theme]);

  // Filter state in the URL.
  useEffect(() => {
    const s = toSearch(filters, query);
    const url = window.location.pathname + (s ? "?" + s : "") + window.location.hash;
    window.history.replaceState(null, "", url);
  }, [filters, query]);

  useEffect(() => saveShortlist(shortlist), [shortlist]);

  // Drop the selection when it is filtered out.
  useEffect(() => {
    if (selectedId !== null && !visibleIds.has(selectedId)) setSelectedId(null);
  }, [visibleIds, selectedId]);

  // Marker click scrolls the list to the card.
  useEffect(() => {
    if (selectedId !== null && scrollOnSelect.current) {
      document.getElementById(`card-${selectedId}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
    scrollOnSelect.current = false;
  }, [selectedId]);

  const selectFromMap = useCallback((id: number) => { scrollOnSelect.current = true; setSelectedId(id); }, []);
  const selectFromList = useCallback((id: number) => setSelectedId(id), []);
  const collapse = useCallback(() => setSelectedId(null), []);
  const toggleStar = useCallback((id: number) => setShortlist((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  }), []);
  const clear = () => { setFilters(emptyFilters()); setQuery(""); };

  const copyShortlist = async () => {
    const ok = await copyText(shortlistText(places.filter((p) => shortlist.has(p.id))));
    setCopied(ok);
    setTimeout(() => setCopied(null), 2000);
  };

  const selected = places.find((p) => p.id === selectedId) ?? null;
  const active = hasActiveFilters(filters, query);

  return (
    <div className="app">
      <div className={"side" + (filtersOpen ? " filters-open" : "")}>
        <header className="header">
          <h1>Kyoto places</h1>
          <button type="button" className="btn small" onClick={() => setTheme(THEMES[(THEMES.indexOf(theme) + 1) % 3])} aria-label={`Theme: ${theme}. Click to change.`}>
            {theme === "auto" ? "◐ Auto" : theme === "light" ? "☀ Light" : "☾ Dark"}
          </button>
        </header>

        <div className="mapcol mobile-map">
          <MapView places={places} visibleIds={visibleIds} selectedId={selectedId} onSelect={selectFromMap} />
          {selected && (
            <div className="peek">
              <span className="badge" style={{ background: typeColor(selected.type) }}>{selected.id}</span>
              <span><strong>{selected.name}</strong><br /><small>{selected.type} · {selected.area}</small></span>
              <button type="button" className="btn small" onClick={collapse} aria-label="Close">✕</button>
            </div>
          )}
        </div>

        <div className="controls">
          <input
            type="search"
            className="search"
            placeholder="Search places, dishes, text…"
            aria-label="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="status">
            <span aria-live="polite">{visible.length} of {places.length} places</span>
            <button type="button" className="link" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen} aria-controls="filters" id="filters-toggle">
              {filtersOpen ? "Hide filters" : "Filters"}
            </button>
            <button type="button" className="link" onClick={clear} disabled={!active}>Clear</button>
          </div>
          <div id="filters" className={"filters-wrap" + (filtersOpen ? " open" : "")}>
            <FilterPanel places={places} filters={filters} onChange={setFilters} shortlistSize={shortlist.size} />
          </div>
          {shortlist.size > 0 && (
            <div className="shortlist-bar">
              <span>★ {shortlist.size} saved</span>
              <button type="button" className="btn small" onClick={copyShortlist}>
                {copied === null ? "Copy shortlist" : copied ? "Copied" : "Copy failed"}
              </button>
              <button type="button" className="btn small" onClick={() => window.print()}>Print</button>
            </div>
          )}
        </div>

        <PlaceList
          places={visible}
          selectedId={selectedId}
          shortlist={shortlist}
          onSelect={selectFromList}
          onCollapse={collapse}
          onStar={toggleStar}
          onClear={clear}
        />
      </div>
    </div>
  );
}
