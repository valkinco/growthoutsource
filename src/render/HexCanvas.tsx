import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameState, TerrainType } from '../game/types';
import { axialKey } from '../game/types';
import { axialToPixel, pixelToAxial, cubeDistance } from '../game/hex';

const TERRAIN_COLOR: Record<TerrainType, string> = {
  plains: '#8fbf6a',
  forest: '#3f7a4d',
  mountain: '#8a8378',
  water: '#3d7fa6',
  ruins: '#b08a5a',
  resource: '#d8ad3f',
  signalTower: '#7a5fc9',
  beacon: '#f2c94c',
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

  // Center camera on founder at mount.
  useEffect(() => {
    const p = axialToPixel({ q: state.founder.q, r: state.founder.r }, HEX_SIZE);
    setCam((c) => ({ ...c, x: p.x, y: p.y }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = useCallback(() => {
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
    ctx.fillStyle = '#0a1420';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2 - cam.x * cam.zoom, h / 2 - cam.y * cam.zoom);
    ctx.scale(cam.zoom, cam.zoom);

    const size = HEX_SIZE;

    for (const tile of Object.values(state.tiles)) {
      const { x, y } = axialToPixel(tile, size);
      drawHex(ctx, x, y, size, tile.veil === 'hidden' ? '#0d1826' : tile.veil === 'clue' ? '#16233a' : TERRAIN_COLOR[tile.terrain]);

      if (tile.veil === 'clue' && tile.clueHint) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      if (tile.veil === 'revealed' && tile.settlementId) {
        const s = state.settlements[tile.settlementId];
        if (s) {
          ctx.fillStyle = s.owner === 'player' ? '#5aa7ff' : '#ff6b6b';
          ctx.beginPath();
          const r = s.level === 'city' ? 12 : s.level === 'town' ? 9 : 6;
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.stroke();
        }
      }

      if (tile.veil === 'revealed' && tile.guardianId && !state.guardian.resolved) {
        ctx.fillStyle = '#f2624c';
        ctx.beginPath();
        ctx.moveTo(x, y - 12);
        ctx.lineTo(x + 10, y + 8);
        ctx.lineTo(x - 10, y + 8);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Founder marker
    const fp = axialToPixel(state.founder, size);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(fp.x, fp.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Routes
    ctx.strokeStyle = 'rgba(255,215,110,0.8)';
    ctx.lineWidth = 3;
    for (const route of state.routes) {
      const a = state.settlements[route.a];
      const b = state.settlements[route.b];
      if (!a || !b) continue;
      const pa = axialToPixel(a, size);
      const pb = axialToPixel(b, size);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }

    // Reachable-tile highlight
    if (state.founder.movementRemaining > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      for (const tile of Object.values(state.tiles)) {
        if (cubeDistance(state.founder, tile) === 1 && tile.terrain !== 'water' && tile.terrain !== 'mountain') {
          const { x, y } = axialToPixel(tile, size);
          drawHexOutline(ctx, x, y, size);
        }
      }
    }

    ctx.restore();
  }, [state, cam]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const onResize = () => draw();
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

function drawHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const x = cx + size * 0.95 * Math.cos(angle);
    const y = cy + size * 0.95 * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawHexOutline(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const x = cx + size * 0.95 * Math.cos(angle);
    const y = cy + size * 0.95 * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

export { axialKey };
