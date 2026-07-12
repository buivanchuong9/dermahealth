// Minimal left-to-right DAG auto-layout used by the React Flow workflow
// visualizations (template designer + instance runtime view) — positions
// each node by its dependency depth so prerequisite chains and parallel
// branches read left-to-right without any manually hand-placed coordinates.

export interface LayoutInput {
  code: string;
  prerequisiteCodes: string[];
}

const COLUMN_WIDTH = 240;
const ROW_HEIGHT = 110;

export function layoutByPrerequisites(items: LayoutInput[]): Record<string, { x: number; y: number }> {
  const depth = new Map<string, number>();
  const byCode = new Map(items.map((i) => [i.code, i]));

  const resolveDepth = (code: string, guard = new Set<string>()): number => {
    if (depth.has(code)) return depth.get(code)!;
    if (guard.has(code)) return 0; // cycle guard — should not happen for valid templates
    guard.add(code);
    const item = byCode.get(code);
    if (!item || item.prerequisiteCodes.length === 0) {
      depth.set(code, 0);
      return 0;
    }
    const d = 1 + Math.max(...item.prerequisiteCodes.map((p) => resolveDepth(p, guard)));
    depth.set(code, d);
    return d;
  };

  items.forEach((i) => resolveDepth(i.code));

  const countPerColumn = new Map<number, number>();
  const positions: Record<string, { x: number; y: number }> = {};
  items.forEach((i) => {
    const d = depth.get(i.code) ?? 0;
    const row = countPerColumn.get(d) ?? 0;
    countPerColumn.set(d, row + 1);
    positions[i.code] = { x: d * COLUMN_WIDTH, y: row * ROW_HEIGHT };
  });
  return positions;
}
