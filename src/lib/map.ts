// Natural Earth 110m land → an SVG path string, projected once at build time.
// Equirectangular everywhere, so bbox rectangles and the catalog's
// drag-to-select stay simple linear lon/lat <-> pixel math.
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import topo from "@/assets/ne_110m_land.json";

const world = topo as unknown as Topology<{ ne_110m_land: GeometryCollection }>;
const land = feature(world, world.objects.ne_110m_land);

export function landPath(width: number, height: number) {
  const proj = geoEquirectangular().fitExtent(
    [
      [0, 0],
      [width, height],
    ],
    { type: "Sphere" },
  );
  // Whole-pixel coordinates: ~38% smaller, invisible at these display sizes
  return geoPath(proj).digits(0)(land) ?? "";
}
