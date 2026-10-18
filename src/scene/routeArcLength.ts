/** Numeric route measurements only: no Three objects or recording state live in
 * this cache. Local-map routes replace their array when geometry changes; their
 * source vectors remain unchanged while that array is being sampled. Weak keys
 * let obsolete routes go with the scene rather than accumulating globally. */
export type RoutePoint3D = Readonly<{ x: number; y: number; z: number }>;
type RoutePoints = readonly RoutePoint3D[];
export type RouteArcLengths = Readonly<{
  cumulative: Readonly<Float64Array>;
  total: number;
}>;

const measurements = new WeakMap<RoutePoints, RouteArcLengths>();

export function routeArcLengths(points: RoutePoints): RouteArcLengths {
  const cached = measurements.get(points);
  if (cached) return cached;
  const cumulative = new Float64Array(points.length);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    // Match Vector3.distanceTo's arithmetic and the old accumulated route path.
    cumulative[i] = cumulative[i - 1] + Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  const result = { cumulative, total: cumulative.at(-1) ?? 0 };
  measurements.set(points, result);
  return result;
}

/** Same lower-bound segment as the former findIndex, with arbitrary forward or
 * backward seeks. At a repeated point or an exact boundary, prefer its first
 * matching segment; do not carry a cursor across playback or manual changes. */
export function routeSampleSegment(points: RoutePoints, progress: number) {
  if (points.length < 2) return { index: 0, fraction: 0 };
  const { cumulative, total } = routeArcLengths(points);
  const distance = total * Math.max(0, Math.min(1, progress));
  let low = 0, high = cumulative.length - 1;
  if (Number.isNaN(distance)) high = 1;
  else while (low < high) {
    const middle = (low + high) >>> 1;
    if (cumulative[middle] >= distance) high = middle;
    else low = middle + 1;
  }
  const index = Math.max(1, Number.isNaN(distance) ? 1 : low);
  return { index, fraction: (distance - cumulative[index - 1]) / Math.max(1e-12, cumulative[index] - cumulative[index - 1]) };
}

/** A recorded leg boundary is an index into the same untouched source route. */
export function routeLegFraction(points: RoutePoints, lastPointIndex: number) {
  if (points.length < 2) return 0;
  const { cumulative, total } = routeArcLengths(points);
  const index = Math.max(0, Math.min(points.length - 1, Math.floor(lastPointIndex)));
  return cumulative[index] / Math.max(total, 1e-12);
}
