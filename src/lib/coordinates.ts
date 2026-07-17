export const projectLonLat = (
  lon: number,
  lat: number,
  width: number,
  height: number,
) => [((lon + 180) / 360) * width, ((90 - lat) / 180) * height] as const;

export const unprojectPoint = (
  x: number,
  y: number,
  width: number,
  height: number,
) => [-180 + (x / width) * 360, 90 - (y / height) * 180] as const;
