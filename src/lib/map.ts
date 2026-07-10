// Natural Earth 110m land, projected to SVG path strings once at build time.
import type { GeoPermissibleObjects } from "d3-geo";
import {
  geoEqualEarth,
  geoEquirectangular,
  geoGraticule,
  geoPath,
} from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import topo from "@/assets/ne_110m_land.json";

const world = topo as unknown as Topology<{ ne_110m_land: GeometryCollection }>;
const land: GeoPermissibleObjects = feature(world, world.objects.ne_110m_land);

const frame = (south: number): GeoPermissibleObjects => ({
  type: "Polygon",
  coordinates: [
    [
      [-180, south],
      [180, south],
      [180, 90],
      [-180, 90],
      [-180, south],
    ],
  ],
});

// ---- Record-page extent map: Equal Earth (equal-area), cropped below 60°S
// (nothing but empty ocean and Antarctica down there) ----

const WIDTH = 300;
const crop = frame(-60);
const projection = geoEqualEarth().fitWidth(WIDTH, crop);
const path = geoPath(projection).digits(1);
const HEIGHT = Math.ceil(path.bounds(crop)[1][1]);
projection.clipExtent([
  [0, 0],
  [WIDTH, HEIGHT],
]);

export const extentMap = {
  width: WIDTH,
  height: HEIGHT,
  land: path(land) ?? "",
  graticule: path(geoGraticule().step([30, 30])()) ?? "",
  // Projection outline — the "ocean" shape, and the extent of global datasets
  sphere: path({ type: "Sphere" }) ?? "",
  bbox([w, s, e, n]: number[]) {
    if (e - w >= 360) return this.sphere;
    return (
      path({
        type: "Polygon",
        coordinates: [
          [
            [w, s],
            [e, s],
            [e, n],
            [w, n],
            [w, s],
          ],
        ],
      }) ?? ""
    );
  },
};

// ---- Catalog spatial-search minimap: equirectangular full world, so the
// page's linear lon/lat <-> pixel math stays exact ----

export function equirectLand(width: number, height: number) {
  const proj = geoEquirectangular().fitExtent(
    [
      [0, 0],
      [width, height],
    ],
    frame(-90),
  );
  return geoPath(proj).digits(1)(land) ?? "";
}
