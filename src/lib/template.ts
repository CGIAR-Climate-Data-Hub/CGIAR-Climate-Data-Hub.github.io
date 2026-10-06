// href_template filling, shared by the build and the record page's picker.
// Dates are handled as text parts, never local time, so no timezone shifts.

export interface Axis {
  values?: string[];
  extent?: string[];
  step?: string;
}

// {token} or {token:strftime}, as the standard's cross-field check reads it
const TOKEN = /\{([^}:]+)(?::([^}]*))?\}/g;

// Year, month, day, hour, minute, second, plus any offset suffix ("Z", "+01:00")
const ISO =
  /^(\d{4})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2}))?)?)?(.*)$/;
const DURATION =
  /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
// ISO string length per precision: year, month, date, -, -, date-time
const WIDTH = [4, 7, 10, 10, 10, 19];

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

// An axis's values: listed, or [first, last] expanded by step
export function axisValues({ values = [], extent, step }: Axis) {
  if (values.length > 0 || !extent || !step) return values;
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
  const width = WIDTH[start.nums.length - 1];
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

// Only the directives the standard allows: %Y %m %d %H %M %j
export function strftime(iso: string, spec: string) {
  const [y, mo = 1, d = 1, h = 0, mi = 0] = parts(iso)?.nums ?? [];
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  const doy = (Date.UTC(y, mo - 1, d) - Date.UTC(y, 0, 1)) / 864e5 + 1;
  const by: Record<string, string> = {
    Y: pad(y, 4),
    m: pad(mo),
    d: pad(d),
    H: pad(h),
    M: pad(mi),
    j: pad(doy, 3),
  };
  return spec.replace(/%([YmdHMj])/g, (_, c) => by[c]);
}

// Fill each token with its picked value, formatted where the token says so
export const fillTemplate = (template: string, pick: Record<string, string>) =>
  template.replace(TOKEN, (_, name, spec) =>
    spec ? strftime(pick[name], spec) : pick[name],
  );
