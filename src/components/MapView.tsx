import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { typeColor } from "../data";
import type { Place } from "../types";

interface Props {
  places: Place[]; // all places (markers are created once)
  visibleIds: ReadonlySet<number>;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

// Bundlers need the worker URL spelled out (MapLibre 6 ships it as a separate module).
maplibregl.setWorkerUrl(workerUrl);

const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export function MapView({ places, visibleIds, selectedId, onSelect }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<number, { m: maplibregl.Marker; el: HTMLElement }>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const placesRef = useRef(places);
  placesRef.current = places;

  const fit = (ids: Iterable<number>) => {
    const mp = map.current;
    if (!mp) return;
    const b = new maplibregl.LngLatBounds();
    let n = 0;
    for (const id of ids) {
      const p = placesRef.current.find((x) => x.id === id);
      if (p) { b.extend([p.lng, p.lat]); n++; }
    }
    if (n) mp.fitBounds(b, { padding: 56, maxZoom: 15, duration: 600 });
  };

  // The map is created once and stays mounted.
  useEffect(() => {
    const mp = new maplibregl.Map({ container: box.current!, style: STYLE, center: [135.76, 35.01], zoom: 11.5, attributionControl: { compact: true } });
    mp.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.current = mp;
    return () => { mp.remove(); map.current = null; markers.current.clear(); };
  }, []);

  // Markers follow the places list (it changes when the database data arrives or a place is added).
  useEffect(() => {
    const mp = map.current;
    if (!mp) return;
    markers.current.forEach(({ m }) => m.remove());
    markers.current.clear();
    for (const p of places) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "pin";
      el.textContent = String(p.id);
      el.style.setProperty("--pin", typeColor(p.type));
      el.setAttribute("aria-label", `${p.name}, number ${p.id}`);
      el.addEventListener("click", (e) => { e.stopPropagation(); onSelectRef.current(p.id); });
      const m = new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(mp);
      markers.current.set(p.id, { m, el });
    }
  }, [places]);

  // Show only visible markers and fit to them on every filter change.
  useEffect(() => {
    markers.current.forEach(({ el }, id) => { el.style.display = visibleIds.has(id) ? "" : "none"; });
    fit(visibleIds);
  }, [visibleIds, places]);

  // Selected marker: bigger with halo; pan/zoom to it.
  useEffect(() => {
    markers.current.forEach(({ el }, id) => {
      el.classList.toggle("selected", id === selectedId);
      el.style.zIndex = id === selectedId ? "10" : "";
    });
  }, [selectedId, places]);
  useEffect(() => {
    const p = placesRef.current.find((x) => x.id === selectedId);
    if (p && map.current) {
      // On small screens the info card covers the bottom of the map, so keep the pin above it.
      const small = window.matchMedia("(max-width: 899px)").matches;
      map.current.easeTo({ center: [p.lng, p.lat], zoom: Math.max(map.current.getZoom(), 14), padding: { top: 0, left: 0, right: 0, bottom: small ? 150 : 0 }, duration: 500 });
    }
  }, [selectedId]);

  return (
    <div className="map-wrap">
      <div ref={box} className="map" role="region" aria-label="Map of places" />
      <button type="button" className="fit-all" onClick={() => fit(places.map((p) => p.id))}>
        Fit all
      </button>
    </div>
  );
}
