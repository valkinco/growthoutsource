import type { Axial } from './types';

export const HEX_NEIGHBORS: Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function neighbors(a: Axial): Axial[] {
  return HEX_NEIGHBORS.map((d) => ({ q: a.q + d.q, r: a.r + d.r }));
}

export function cubeDistance(a: Axial, b: Axial): number {
  const ax = a.q, az = a.r, ay = -ax - az;
  const bx = b.q, bz = b.r, by = -bx - bz;
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
}

export function axialToPixel(a: Axial, size: number): { x: number; y: number } {
  const x = size * Math.sqrt(3) * (a.q + a.r / 2);
  const y = size * 1.5 * a.r;
  return { x, y };
}

export function pixelToAxial(x: number, y: number, size: number): Axial {
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / size;
  const r = ((2 / 3) * y) / size;
  return axialRound({ q, r });
}

function axialRound(a: Axial): Axial {
  const x = a.q, z = a.r, y = -x - z;
  let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
  const dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx, r: rz };
}

export function tilesInRadius(center: Axial, radius: number): Axial[] {
  const results: Axial[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const cand = { q: center.q + q, r: center.r + r };
      if (cubeDistance(center, cand) <= radius) results.push(cand);
    }
  }
  return results;
}
