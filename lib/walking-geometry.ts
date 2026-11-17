export type LngLat = [number, number];
export function metres(a: LngLat, b: LngLat): number {
    const rad = Math.PI / 180, dlat = (b[1] - a[1]) * rad, dlng = (b[0] - a[0]) * rad;
    const h = Math.sin(dlat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dlng / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
function lengths(line: LngLat[]) {
    const values = [0];
    for (let i = 1; i < line.length; i++) values.push(values[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
    return values;
}
export function pointAt(line: LngLat[], fraction: number): LngLat {
    const values = lengths(line), target = values.at(-1)! * Math.max(0, Math.min(1, fraction));
    for (let i = 1; i < line.length; i++) if (values[i] >= target) {
        const t = (target - values[i - 1]) / (values[i] - values[i - 1] || 1);
        return [line[i - 1][0] + t * (line[i][0] - line[i - 1][0]), line[i - 1][1] + t * (line[i][1] - line[i - 1][1])];
    }
    return line.at(-1)!;
}
export function sliceLine(line: LngLat[], start: number, end: number): LngLat[] {
    const values = lengths(line), total = values.at(-1)! || 1;
    return [pointAt(line, start), ...line.filter((_, i) => values[i] / total > start && values[i] / total < end), pointAt(line, end)];
}
export function projectPoint(line: LngLat[], point: LngLat) {
    const values = lengths(line), total = values.at(-1)! || 1;
    let best = { fraction: 0, point: line[0], distance: Infinity };
    for (let i = 1; i < line.length; i++) {
        const a = line[i - 1], b = line[i], dx = b[0] - a[0], dy = b[1] - a[1];
        const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
        const projected: LngLat = [a[0] + t * dx, a[1] + t * dy];
        const distance = metres(point, projected);
        if (distance < best.distance) best = { fraction: (values[i - 1] + t * (values[i] - values[i - 1])) / total, point: projected, distance };
    }
    return best;
}
