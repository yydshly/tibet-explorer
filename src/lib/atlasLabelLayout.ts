export type AtlasLabelBox = { x: number; y: number; width: number; height: number };

/** Labels may yield to a dense neighbourhood; a leader is not a new location. */
export function placeAtlasLabel(options: {
  anchorX: number; anchorY: number; width: number; height: number;
  viewportWidth: number; minY: number; maxY: number;
  occupied: AtlasLabelBox[]; selected: boolean;
}): { x: number; y: number } | null {
  const { anchorX, anchorY, width, height, viewportWidth, minY, maxY, occupied, selected } = options;
  const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
  const maxDistance = selected ? 88 : 75;
  const preferredX = clamp(anchorX, width / 2 + 9, viewportWidth - width / 2 - 9);
  const preferredY = clamp(anchorY - height / 2 - 12, minY, maxY);
  const xs = [preferredX, preferredX - 36, preferredX + 36, preferredX - 60, preferredX + 60]
    .map(x => clamp(x, width / 2 + 9, viewportWidth - width / 2 - 9));
  const ys = [preferredY, anchorY + height / 2 + 12, preferredY - 32, preferredY + 32, preferredY - 56, preferredY + 56]
    .map(y => clamp(y, minY, maxY));
  let best: { x: number; y: number; cost: number } | null = null;
  for (const x of xs) for (const y of ys) {
    if (Math.hypot(x - anchorX, y - anchorY) > maxDistance) continue;
    if (occupied.some(box => Math.abs(x - box.x) < (width + box.width) / 2 + 5 && Math.abs(y - box.y) < (height + box.height) / 2 + 5)) continue;
    const cost = (x - preferredX) ** 2 + (y - preferredY) ** 2;
    if (!best || cost < best.cost) best = { x, y, cost };
  }
  return best ? { x: best.x, y: best.y } : null;
}
