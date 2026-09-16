import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameState, TerrainType } from '../game/types';
import { axialKey } from '../game/types';
import { axialToPixel, pixelToAxial, cubeDistance } from '../game/hex';

// Pseudo-3D palette: each terrain gets a top-face color and a darker "side" shade,
// plus how tall its bevel stands. This is a general hex-strategy rendering technique
// (not a specific Polytopia asset) — original color identity, no borrowed art.
const TERRAIN_STYLE: Record<TerrainType, { top: string; side: string; elevation: number }> = {
  plains: { top: '#9fd873', side: '#5f8a3f', elevation: 3 },
  forest: { top: '#3f8f56', side: '#245334', elevation: 7 },
  mountain: { top: '#a8a196', side: '#5f594f', elevation: 13 },
  water: { top: '#4fa3d1', side: '#2c5f7d', elevation: 0 },
  ruins: { top: '#c49a63', side: '#7a5c37', elevation: 5 },
  resource: { top: '#f0c749', side: '#a8842c', elevation: 6 },
  signalTower: { top: '#a58bec', side: '#5f4a97', elevation: 9 },
  beacon: { top: '#ffd863', side: '#b8892a', elevation: 11 },
};

const HEX_SIZE = 34;

interface Props {
  state: GameState;
  onTileClick: (q: number, r: number) => void;
}

export function HexCanvas({ state, onTileClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cam, setCam] = useState({ x: 0, y: 0, zoom: 1 });
  const dragRef = useRef<{ startX: number; startY: number; camX: number; camY: number; moved: boolean } | null>(null);
  const rafRef = useRef<number>(0);
  // Tracks *when* a tile first became revealed / a settlement first reached its
  // current level, purely for one-shot "pop"/"flash" animations — this is local
  // presentation state, not part of GameState, so it never gets serialized or synced.
  const revealedAtRef = useRef<Map<string, number>>(new Map());
  const prevVeilRef = useRef<Map<string, string>>(new Map());
  const levelFlashRef = useRef<Map<string, number>>(new Map());
  const prevLevelRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const founder = state.founders[state.activeSide];
    const p = axialToPixel({ q: founder.q, r: founder.r }, HEX_SIZE);
    setCam((c) => ({ ...c, x: p.x, y: p.y }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activeSide]);

  const draw = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#123049');
      bg.addColorStop(1, '#060f1a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2 - cam.x * cam.zoom, h / 2 - cam.y * cam.zoom);
      ctx.scale(cam.zoom, cam.zoom);

      const size = HEX_SIZE;
      const pulse = (Math.sin(t / 500) + 1) / 2; // 0..1 for clue dots / guardian glow

      // Sort by row so lower tiles draw after (correct overlap for the pseudo-3D sides)
      const tiles = Object.values(state.tiles).sort((a, b) => a.r - b.r || a.q - b.q);

      const POP_MS = 320;
      const FLASH_MS = 550;

      for (const tile of tiles) {
        const { x, y } = axialToPixel(tile, size);
        const key = axialKey(tile);

        // First frame a tile turns 'revealed', stamp its pop-in start time (Polytopia-style
        // fog-lift feedback — a tile that just appeared should visibly announce itself).
        if (tile.veil === 'revealed' && prevVeilRef.current.get(key) !== 'revealed') {
          revealedAtRef.current.set(key, t);
        }
        prevVeilRef.current.set(key, tile.veil);
        const revealAge = t - (revealedAtRef.current.get(key) ?? -Infinity);
        const popping = tile.veil === 'revealed' && revealAge < POP_MS;
        const popScale = popping ? 0.55 + 0.45 * easeOutBack(revealAge / POP_MS) : 1;

        if (popping) {
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(popScale, popScale);
          ctx.translate(-x, -y);
        }

        if (tile.veil === 'hidden') {
          drawHexFace(ctx, x, y, size, '#0c1622', '#070d16', 1);
        } else if (tile.veil === 'clue') {
          drawHexFace(ctx, x, y, size, '#16273c', '#0b1521', 2);
          ctx.fillStyle = `rgba(255,255,255,${0.25 + pulse * 0.35})`;
          ctx.beginPath();
          ctx.arc(x, y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const style = TERRAIN_STYLE[tile.terrain];
          drawHexFace(ctx, x, y, size, style.top, style.side, style.elevation);
          drawTerrainIcon(ctx, x, y - style.elevation, tile.terrain, pulse);

          if (tile.guardianId && !state.guardian.resolved) {
            drawGuardian(ctx, x, y - style.elevation, pulse);
          }

          if (tile.settlementId) {
            const s = state.settlements[tile.settlementId];
            if (s) {
              const levelKey = `${s.id}`;
              if (prevLevelRef.current.get(levelKey) && prevLevelRef.current.get(levelKey) !== s.level) {
                levelFlashRef.current.set(levelKey, t);
              }
              prevLevelRef.current.set(levelKey, s.level);
              const flashAge = t - (levelFlashRef.current.get(levelKey) ?? -Infinity);
              drawSettlement(ctx, x, y - style.elevation, s.owner, s.level, s.specialization);
              if (flashAge < FLASH_MS) drawLevelFlash(ctx, x, y - style.elevation, flashAge / FLASH_MS);
            }
          }
        }

        if (popping) ctx.restore();
      }

      // Routes (drawn above tiles, below founder)
      ctx.strokeStyle = 'rgba(255, 216, 99, 0.85)';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      for (const route of state.routes) {
        const a = state.settlements[route.a];
        const b = state.settlements[route.b];
        if (!a || !b) continue;
        const ta = state.tiles[axialKey(a)];
        const tb = state.tiles[axialKey(b)];
        const pa = axialToPixel(a, size);
        const pb = axialToPixel(b, size);
        const ea = ta ? TERRAIN_STYLE[ta.terrain].elevation : 0;
        const eb = tb ? TERRAIN_STYLE[tb.terrain].elevation : 0;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y - ea);
        ctx.lineTo(pb.x, pb.y - eb);
        ctx.stroke();
      }

      const activeFounder = state.founders[state.activeSide];

      // Reachable-tile highlight ring
      if (activeFounder.movementRemaining > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        for (const tile of tiles) {
          if (cubeDistance(activeFounder, tile) === 1 && tile.terrain !== 'water' && tile.terrain !== 'mountain') {
            const { x, y } = axialToPixel(tile, size);
            const elev = tile.veil === 'revealed' ? TERRAIN_STYLE[tile.terrain].elevation : 0;
            drawHexOutline(ctx, x, y - elev, size);
          }
        }
        ctx.setLineDash([]);
      }

      // Founder marker(s). Solo mode only shows the human Founder — the AI rival has no
      // wandering character. Multiplayer shows both, so you can see where your rival's
      // Founder was last seen (only on tiles you've actually revealed).
      const sidesToDraw = state.mode === 'multiplayer' ? (['player', 'rival'] as const) : (['player'] as const);
      for (const side of sidesToDraw) {
        const f = state.founders[side];
        const tile = state.tiles[axialKey(f)];
        if (tile && tile.veil !== 'revealed') continue;
        const elev = tile ? TERRAIN_STYLE[tile.terrain]?.elevation ?? 0 : 0;
        const fp = axialToPixel(f, size);
        drawFounder(ctx, fp.x, fp.y - elev, state.guilds[side], side !== state.activeSide);
      }

      ctx.restore();
    },
    [state, cam]
  );

  useEffect(() => {
    let running = true;
    function loop(t: number) {
      if (!running) return;
      draw(t);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  useEffect(() => {
    const onResize = () => draw(performance.now());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  function screenToWorld(clientX: number, clientY: number) {
    const container = containerRef.current!;
    const rect = container.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const wx = (sx - w / 2) / cam.zoom + cam.x;
    const wy = (sy - h / 2) / cam.zoom + cam.y;
    return { wx, wy };
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, camX: cam.x, camY: cam.y, moved: false };
  }

  function handlePointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    setCam((c) => ({ ...c, x: d.camX - dx / c.zoom, y: d.camY - dy / c.zoom }));
  }

  function handlePointerUp(e: React.PointerEvent) {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && !d.moved) {
      const { wx, wy } = screenToWorld(e.clientX, e.clientY);
      const a = pixelToAxial(wx, wy, HEX_SIZE);
      onTileClick(a.q, a.r);
    }
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    setCam((c) => ({ ...c, zoom: Math.min(2, Math.max(0.5, c.zoom - e.deltaY * 0.001)) }));
  }

  return (
    <div
      ref={containerRef}
      className="hex-canvas-container"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}

function easeOutBack(t: number): number {
  const c = t - 1;
  return 1 + 2.7 * c * c * c + 1.7 * c * c;
}

function drawLevelFlash(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number) {
  const radius = 6 + progress * 22;
  const alpha = 1 - progress;
  ctx.save();
  ctx.strokeStyle = `rgba(255, 224, 130, ${alpha})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y - 4, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function hexCorner(cx: number, cy: number, size: number, i: number) {
  const angle = (Math.PI / 180) * (60 * i - 30);
  return { x: cx + size * 0.96 * Math.cos(angle), y: cy + size * 0.96 * Math.sin(angle) };
}

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const { x, y } = hexCorner(cx, cy, size, i);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Draws a hex "pillar": a darker base + a raised, lighter top face, giving cheap pseudo-3D depth. */
function drawHexFace(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, topColor: string, sideColor: string, elevation: number) {
  if (elevation > 0) {
    // Side wall: fill the vertical gap between the base hex and the raised top hex
    // on the bottom half of the hexagon (the only edges a top-down-ish camera would see).
    ctx.fillStyle = sideColor;
    for (let i = 1; i <= 4; i++) {
      const c1 = hexCorner(cx, cy, size, i - 1);
      const c2 = hexCorner(cx, cy, size, i);
      ctx.beginPath();
      ctx.moveTo(c1.x, c1.y - elevation);
      ctx.lineTo(c2.x, c2.y - elevation);
      ctx.lineTo(c2.x, c2.y);
      ctx.lineTo(c1.x, c1.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  hexPath(ctx, cx, cy - elevation, size);
  const grad = ctx.createLinearGradient(cx, cy - elevation - size, cx, cy - elevation + size);
  grad.addColorStop(0, lighten(topColor, 12));
  grad.addColorStop(1, topColor);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawHexOutline(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  hexPath(ctx, cx, cy, size);
  ctx.stroke();
}

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + amt);
  const g = Math.min(255, ((n >> 8) & 0xff) + amt);
  const b = Math.min(255, (n & 0xff) + amt);
  return `rgb(${r},${g},${b})`;
}

function drawTerrainIcon(ctx: CanvasRenderingContext2D, x: number, y: number, terrain: TerrainType, pulse: number) {
  ctx.save();
  ctx.translate(x, y);
  switch (terrain) {
    case 'forest':
      for (const [dx, dy, s] of [[-7, 2, 8], [6, 4, 7], [0, -6, 9]] as [number, number, number][]) {
        ctx.fillStyle = '#1f5c33';
        ctx.beginPath();
        ctx.moveTo(dx, dy - s);
        ctx.lineTo(dx - s * 0.6, dy + s * 0.4);
        ctx.lineTo(dx + s * 0.6, dy + s * 0.4);
        ctx.closePath();
        ctx.fill();
      }
      break;
    case 'mountain':
      ctx.fillStyle = '#726b5f';
      ctx.beginPath();
      ctx.moveTo(-14, 8);
      ctx.lineTo(-2, -12);
      ctx.lineTo(8, 4);
      ctx.lineTo(16, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f4f7fb';
      ctx.beginPath();
      ctx.moveTo(-2, -12);
      ctx.lineTo(3, -3);
      ctx.lineTo(-7, -3);
      ctx.closePath();
      ctx.fill();
      break;
    case 'water':
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      for (const dy of [-4, 4]) {
        ctx.beginPath();
        ctx.moveTo(-12, dy);
        ctx.quadraticCurveTo(-6, dy - 5, 0, dy);
        ctx.quadraticCurveTo(6, dy + 5, 12, dy);
        ctx.stroke();
      }
      break;
    case 'resource':
      ctx.fillStyle = '#fff2c2';
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(9, 0);
      ctx.lineTo(0, 10);
      ctx.lineTo(-9, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#a8842c';
      ctx.stroke();
      break;
    case 'ruins':
      ctx.fillStyle = '#e8d3ab';
      ctx.fillRect(-8, -10, 5, 18);
      ctx.fillRect(3, -6, 5, 14);
      break;
    case 'signalTower':
      ctx.strokeStyle = '#efe6ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.lineTo(0, -14);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -14, 3 + pulse * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239,230,255,${0.6 + pulse * 0.4})`;
      ctx.fill();
      break;
    case 'beacon':
      ctx.fillStyle = `rgba(255, 244, 200, ${0.35 + pulse * 0.4})`;
      ctx.beginPath();
      ctx.arc(0, -6, 14 + pulse * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff6d8';
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(6, 0);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      break;
    default:
      break;
  }
  ctx.restore();
}

function drawGuardian(ctx: CanvasRenderingContext2D, x: number, y: number, pulse: number) {
  ctx.save();
  ctx.translate(x, y - 16);
  ctx.fillStyle = `rgba(242, 98, 76, ${0.85 + pulse * 0.15})`;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(12, 6);
  ctx.lineTo(6, 12);
  ctx.lineTo(0, 6);
  ctx.lineTo(-6, 12);
  ctx.lineTo(-12, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3a0e08';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

const OWNER_COLOR: Record<string, { fill: string; stroke: string }> = {
  player: { fill: '#5aa7ff', stroke: '#1c4d80' },
  rival: { fill: '#ff6b6b', stroke: '#7d1f1f' },
};

function drawSettlement(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  owner: string,
  level: string,
  specialization: string | null
) {
  const scale = level === 'city' ? 1.3 : level === 'town' ? 1.05 : 0.8;
  const colors = OWNER_COLOR[owner] ?? OWNER_COLOR.player;
  ctx.save();
  ctx.translate(x, y - 6);
  ctx.scale(scale, scale);

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 9, 9, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // base
  ctx.fillStyle = colors.fill;
  ctx.strokeStyle = colors.stroke;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(-8, -3, 16, 10);
  ctx.fill();
  ctx.stroke();

  // roof
  ctx.beginPath();
  ctx.moveTo(-10, -3);
  ctx.lineTo(0, -14);
  ctx.lineTo(10, -3);
  ctx.closePath();
  ctx.fillStyle = lighten(colors.fill, -20);
  ctx.fill();
  ctx.stroke();

  if (specialization) {
    ctx.fillStyle = '#fff8e0';
    ctx.beginPath();
    ctx.arc(0, 2, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawFounder(ctx: CanvasRenderingContext2D, x: number, y: number, guild: string, dimmed = false) {
  const ring: Record<string, string> = {
    pathfinders: '#7fd1ff',
    forgeborn: '#ffb454',
    unbroken: '#ff7a7a',
    keepers: '#8fe3a8',
  };
  ctx.save();
  ctx.globalAlpha = dimmed ? 0.55 : 1;
  ctx.translate(x, y - 10);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = dimmed ? '#cfd8e2' : '#fff';
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ring[guild] ?? '#5aa7ff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

export { axialKey };
