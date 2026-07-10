// CDH controlled vocabularies, vendored from the published standard.
// To bump: re-download VOCAB_URL/its geography sibling and update the version.
import commodityVocab from "@/assets/commodity-vocab.json";
import geoBboxes from "@/assets/geo-bboxes.json";
import geographyVocab from "@/assets/geography-vocab.json";

export const VOCAB_URL =
  "https://cgiar-climate-data-hub.github.io/cdh-metadata-standard/v0.0.2/vocab/commodity.json";

const byId = new Map(commodityVocab.concepts.map((c) => [c.id, c]));

// Resolve a record's commodity id to its concept (label, AGROVOC code/uri,
// broader parents); undefined for ids the vocabulary doesn't know.
export function commodity(id: string) {
  return byId.get(id);
}

// UN M49 tree: World → regions → sub-regions → countries. Not every concept
// carries every field (world has no parents; only countries have iso3).
interface GeoConcept {
  id: string;
  label: string;
  code: string;
  iso3?: string;
  parents?: string[];
  groups?: string[];
}

const geoById = new Map(
  (geographyVocab.concepts as GeoConcept[]).map((c) => [c.id, c]),
);

export function geography(id: string) {
  return geoById.get(id);
}

// A geography plus all its M49 ancestors, for roll-up filtering
// (kenya → kenya, eastern-africa, sub-saharan-africa, africa, world)
export function geographyWithParents(id: string) {
  const c = geoById.get(id);
  return c ? [c.id, ...(c.parents ?? [])] : [id];
}

const bboxes = geoBboxes.bboxes as Record<string, number[][]>;

// The tags' Natural-Earth-derived boxes: the spatial-search fallback for
// records with geography tags but no explicit bbox. A list, not a union —
// antimeridian countries carry two boxes, multi-tag records several.
// Concepts NE doesn't model (micro-territories) borrow a parent's boxes.
export function geographyBboxes(ids: string[]) {
  const boxes = ids.flatMap((id) => {
    const own = bboxes[id];
    if (own) return own;
    const parent = geoById.get(id)?.parents?.find((p) => bboxes[p]);
    return parent ? bboxes[parent] : [];
  });
  return boxes.length > 0 ? boxes : undefined;
}
