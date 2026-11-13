import { SPONSOR_URL, TIERS, placesLeft, sponsorsIn, type Sponsor } from "@/lib/sponsors";

/** A sponsor as it is drawn anywhere: the logo, or the name set in type when there is none. */
function Mark({ s, className }: { s: Sponsor; className: string }) {
  return (
    <a className={className} href={s.url} target="_blank" rel="noopener sponsored">
      {s.logo ? <img src={s.logo} alt={s.name} /> : s.name}
    </a>
  );
}

/**
 * The hero's line: the featured sponsors in a row under the skill link, then an open place while the tier has one.
 * Every item is a 24px box with its content centred, so the words, the logos and the open place share one centre.
 */
export function SponsorLine() {
  const featured = sponsorsIn("featured");
  return (
    <p className="sp-line">
      <span className="sp-line-by">Sponsored by</span>
      {featured.map((s) => <Mark key={s.name} s={s} className="sp-line-mark" />)}
      {(placesLeft("featured") ?? 0) > 0 && <a className="sp-line-open" href="#sponsors">Your logo</a>}
    </p>
  );
}

/**
 * The home's sponsors, under the hero: once there are some, the sponsors' logos in a grid of hairline cells with one
 * cell left open, and the supporters' names under it; then the four tiers on cards, each saying where it puts you.
 * The featured sponsors are not repeated here: the hero already shows them.
 */
export function Sponsors() {
  const logos = sponsorsIn("sponsor");
  const names = sponsorsIn("supporter");
  return (
    <section id="sponsors" aria-labelledby="sponsors-h" className="sp">
      <p className="sp-label">Sponsors</p>
      <h2 id="sponsors-h" className="sp-h">Kept drawing by you</h2>
      <p className="sp-lede">Hairline is MIT and free. Sponsors pay for the next figures, and get a place on this site and in the README.</p>

      {logos.length > 0 && (
        <div className="sp-grid">
          {logos.map((s) => <Mark key={s.name} s={s} className="sp-cell" />)}
          <a className="sp-cell sp-cell-open" href={SPONSOR_URL} target="_blank" rel="noopener">Your logo</a>
        </div>
      )}
      {names.length > 0 && (
        <p className="sp-names">
          With {names.map((s, i) => (
            <span key={s.name}>{i > 0 && (i === names.length - 1 ? " and " : ", ")}<a href={s.url} target="_blank" rel="noopener sponsored">{s.name}</a></span>
          ))}.
        </p>
      )}

      <Tiers />
    </section>
  );
}

/** The four tiers on cards, each saying where it puts you, then the billing note. */
function Tiers() {
  return (
    <>
      <ul className="sp-tiers">
        {TIERS.map((t) => (
          <li key={t.id} className="sp-tier" data-tier={t.id}>
            <div className="sp-tier-h">
              <span className="sp-tier-name">{t.name}</span>
            </div>
            <p className="sp-tier-price">${t.price}<small>/mo</small></p>
            <ul className="sp-perks">
              {t.perks.map((p) => <li key={p}>{p}</li>)}
            </ul>
            <a className="sp-tier-cta press" href={SPONSOR_URL} target="_blank" rel="noopener" aria-label={`Sponsor as ${t.name}, $${t.price} a month`}>
              {t.id === "featured" && <Heart />}
              Sponsor
            </a>
          </li>
        ))}
      </ul>
      <p className="sp-note">Billed monthly through GitHub Sponsors. Cancel at any time.</p>
    </>
  );
}

export function Heart() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 13.5S2 10 2 6a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4-6 7.5-6 7.5z" />
    </svg>
  );
}
