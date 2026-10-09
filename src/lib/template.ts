// href_template filling, shared by the build and the record page's picker.
// Dates are handled as text parts, never local time, so no timezone shifts.

interface Axis {
  values?: string[];
  categories?: { value: string }[];
  extent?: string[] | number[];
  step?: string | number;
}

// {token} or {token:strftime}, as the standard's cross-field check reads it
const TOKEN = /\{([^}:]+)(?::([^}]*))?\}/g;

// Year, month, day, hour, minute, second, plus any offset suffix ("Z", "+01:00")
const ISO =
  /^(\d{4})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2}))?)?)?(.*)$/;
export const DURATION =
  /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

function parts(iso: string) {
  const m = iso.match(ISO);
  if (!m) return undefined;
  const [, ...rest] = m;
  const suffix = rest.pop() ?? "";
  const nums = rest.filter((p) => p !== undefined).map(Number);
  return { nums, suffix };
}

export const tokenNames = (template: string) => [
  ...new Set([...template.matchAll(TOKEN)].map((m) => m[1])),
];

// File coordinates at the precision used by every occurrence of this token.
// Repeated tokens can supply different date parts (year={date:%Y}/{date:%m}).
export function fileCoordinates(
  template: string,
  name: string,
  values: string[],
) {
  const formats = [...template.matchAll(TOKEN)]
    .filter((m) => m[1] === name)
    .map((m) => m[2]);
  if (formats.some((f) => !f)) return { values, column: true };
  const format = formats.join("");
  // Values cut to the finest part used, kept as ISO so they fill the template
  const month = format.includes("%m");
  const day = format.includes("%d");
  const iso = day ? "%Y-%m-%d" : month ? "%Y-%m" : "%Y";
  return {
    values: [...new Set(values.map((v) => strftime(v, iso)))],
    // A month without a year, or a day without a month, is not one ISO period
    column: format.includes("%Y") && (month || !day),
  };
}

// An axis's values: listed, categorised, or [first, last] expanded by step
export function axisValues({ values = [], categories, extent, step }: Axis) {
  if (categories?.length) return categories.map((c) => c.value);
  if (
    values.length > 0
    || !extent
    || typeof extent[0] !== "string"
    || typeof extent[1] !== "string"
    || typeof step !== "string"
  )
    return values;
  const start = parts(extent[0]);
  const end = parts(extent[1]);
  const dur = step
    .match(DURATION)
    ?.slice(1)
    .map((n) => Number(n ?? 0));
  if (!start || !end || !dur) return [];
  const [Y, M, W, D, h, mi, s] = dur;
  const [y0, mo0 = 1, d0 = 1, h0 = 0, mi0 = 0, s0 = 0] = start.nums;
  const [y1, mo1 = 1, d1 = 1, h1 = 0, mi1 = 0, s1 = 0] = end.nums;
  const last = Date.UTC(y1, mo1 - 1, d1, h1, mi1, s1);
  // Each value is written like the start: "2030", "2030-01", …
  const width = extent[0].length - start.suffix.length;
  const out: string[] = [];
  let prev = Number.NEGATIVE_INFINITY;
  // Each value steps from the start, so month ends don't drift
  for (let n = 0; ; n++) {
    const t = Date.UTC(
      y0 + n * Y,
      mo0 - 1 + n * M,
      d0 + n * (D + 7 * W),
      h0 + n * h,
      mi0 + n * mi,
      s0 + n * s,
    );
    // A zero step would never advance
    if (t > last || t <= prev) break;
    prev = t;
    out.push(new Date(t).toISOString().slice(0, width) + start.suffix);
  }
  return out;
}

// Only the directives the standard allows: %Y %m %d
function strftime(iso: string, spec: string) {
  const [y, mo = 1, d = 1] = parts(iso)?.nums ?? [];
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  const by: Record<string, string> = { Y: pad(y, 4), m: pad(mo), d: pad(d) };
  return spec.replace(/%([Ymd])/g, (_, c) => by[c]);
}

// Fill each token with its picked value, formatted where the token says so
export const fillTemplate = (template: string, pick: Record<string, string>) =>
  template.replace(TOKEN, (_, name, spec) =>
    spec ? strftime(pick[name], spec) : pick[name],
  );
