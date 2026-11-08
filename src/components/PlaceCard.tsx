import { useState } from "react";
import { typeColor } from "../data";
import { mapsUrl, priceLabel } from "../lib/links";
import type { Place } from "../types";

interface Props {
  place: Place;
  expanded: boolean;
  starred: boolean;
  onSelect: (id: number) => void;
  onCollapse: () => void;
  onStar: (id: number) => void;
}

export function PlaceCard({ place: p, expanded, starred, onSelect, onCollapse, onStar }: Props) {
  const [showOriginal, setShowOriginal] = useState(false);
  const panelId = `card-${p.id}-panel`;
  return (
    <article className={"card" + (expanded ? " expanded" : "")} id={`card-${p.id}`} data-id={p.id}>
      <div className="card-head">
        <button
          type="button"
          className="card-main"
          data-card-head
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => (expanded ? onCollapse() : onSelect(p.id))}
          onKeyDown={(e) => e.key === "Escape" && expanded && onCollapse()}
        >
          <span className="badge" style={{ background: typeColor(p.type) }}>{p.id}</span>
          <span className="card-text">
            <span className="name">
              {p.name}
              {p.nameJp && <span className="jp"> {p.nameJp}</span>}
              {p.hoursConflict === 2 && <span className="warn-badge" title="Google lists different hours">⚠ check hours</span>}
            </span>
            <span className="meta">{p.type} · {p.area} · {p.station} · {priceLabel(p.priceTier)}</span>
            <span className="meta">
              {p.hoursBook}
              {p.closedDaysBook && <> · <strong>Closed {p.closedDaysBook}</strong></>}
            </span>
            <span className="tags">
              {p.tags.map((t) => <span key={t} className="tag">{t}</span>)}
            </span>
          </span>
        </button>
        <button
          type="button"
          className="star"
          aria-pressed={starred}
          aria-label={starred ? `Remove ${p.name} from shortlist` : `Add ${p.name} to shortlist`}
          onClick={() => onStar(p.id)}
        >
          {starred ? "★" : "☆"}
        </button>
      </div>

      {expanded && (
        <div className="card-body" id={panelId}>
          <p>{p.summary}</p>
          {p.hoursConflict === 2 && (
            <p className="note warn" role="note">
              Google Maps lists different days or hours than the book. Check before you go.
            </p>
          )}
          {p.dataNote && <p className="note warn" role="note">{p.dataNote}</p>}
          <dl>
            {p.bookPicks && (<><dt>Book picks</dt><dd>{p.bookPicks}</dd></>)}
            <dt>Address</dt><dd>{p.address}</dd>
            {p.phone && (<><dt>Phone</dt><dd><a href={`tel:${p.phone.replace(/-/g, "")}`}>{p.phone}</a></dd></>)}
            {p.hoursGoogle && (<><dt>Google hours</dt><dd>{p.hoursGoogle}</dd></>)}
            <dt>Book</dt><dd>{p.bookSection}, p. {p.bookPage}</dd>
          </dl>
          <div className="actions">
            <a className="btn primary" href={mapsUrl(p)} target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
            {p.website && (
              <a className="btn" href={`https://${p.website}`} target="_blank" rel="noopener noreferrer">Website</a>
            )}
          </div>
          {(p.bookTagline || p.bookText) && (
            <div className="original">
              <button
                type="button"
                className="link"
                aria-expanded={showOriginal}
                onClick={() => setShowOriginal((v) => !v)}
              >
                {showOriginal ? "Hide original text" : "See original text"}
              </button>
              {showOriginal && (
                <div className="original-body">
                  <h4>The book, p. {p.bookPage}</h4>
                  {p.bookTagline && <p><strong><em>{p.bookTagline}</em></strong></p>}
                  {p.bookText && <p>{p.bookText}</p>}
                  <p className="small">Text is OCR and may contain typos.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
