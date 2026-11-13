/**
 * Who keeps Hairline drawing. Tiers match the GitHub Sponsors tiers one to one; a sponsor added here shows on the
 * home, and the same list goes in the README by hand. A logo is a file in public/sponsors/, drawn in one colour on
 * transparent, ideally an SVG.
 */

export const SPONSOR_URL = "https://github.com/sponsors/lucasmarkes";

export type TierId = "featured" | "sponsor" | "supporter" | "backer";

export type Tier = {
  id: TierId;
  name: string;
  /** US dollars a month. */
  price: number;
  /** How many places the tier has, when it is limited. */
  slots?: number;
  perks: string[];
};

export const TIERS: Tier[] = [
  {
    id: "featured",
    name: "Featured",
    price: 250,
    slots: 2,
    perks: ["Logo in the hero, the first thing on the site", "Logo at the top of the README"],
  },
  {
    id: "sponsor",
    name: "Sponsor",
    price: 100,
    perks: ["Logo on the home page, in the sponsors section", "Logo in the README"],
  },
  {
    id: "supporter",
    name: "Supporter",
    price: 50,
    perks: ["Name and link on the home page", "Name in the README"],
  },
  {
    id: "backer",
    name: "Backer",
    price: 25,
    perks: ["Name in the README", "Our thanks, every release"],
  },
];

export type Sponsor = {
  name: string;
  url: string;
  tier: TierId;
  /** A path under public/, e.g. "/sponsors/acme.svg". Without one the name is set in type. */
  logo?: string;
};

export const SPONSORS: Sponsor[] = [];

export const tier = (id: TierId) => TIERS.find((t) => t.id === id)!;
/** Places still open in a limited tier, or undefined for a tier without a limit. */
export const placesLeft = (id: TierId) => {
  const t = tier(id);
  return t.slots === undefined ? undefined : Math.max(0, t.slots - sponsorsIn(id).length);
};
export const sponsorsIn = (id: TierId) => SPONSORS.filter((s) => s.tier === id);
