// Área externa: grama, árvores, calçada e rua em volta do EMPILHAMENTO de andares.
//
// O térreo fica sempre embaixo, colado na calçada, então a rua acompanha o pé do prédio
// (`buildingH(andares)`) e a entrada principal se alinha ao corredor do TÉRREO.
//
// Vaga sem sala: o que aparece ali depende de onde a vaga está.
//   - norte do ÚLTIMO andar  -> jardim/pátio (dá para a fachada norte, ao ar livre)
//   - sul do TÉRREO          -> jardim/pátio ligado à calçada (como sempre foi)
//   - qualquer outra         -> SALA VAGA: é miolo de prédio, não dá para o lado de fora
import type { WallStyle } from '../../art/api';
import { mulberry32 } from '../../../../shared/hash';
import {
  COL_W,
  CORE_COLS,
  CORRIDOR_DY,
  EXT_EAST,
  EXT_NORTH,
  EXT_SOUTH,
  EXT_WEST,
  ROOM_H,
  TILE,
  TOTAL_COLS,
  buildingH,
} from '../constants';
import { clampFloors, floorY, slotAt, slotFloor, slotRect, slotSide } from './geometry';
import type { ExteriorProp, FloorPatch, TileRect, WallItemPlacement, WallSegment } from './types';

export const EXTERIOR_WALL: WallStyle = { base: '#cfc8bd', trim: '#8a8174', pattern: 'brick', exterior: true };
/** Parede de uma sala vaga: miolo do prédio, acabamento cru. */
export const VACANT_WALL: WallStyle = { base: '#d7d3cb', trim: '#9b9488', pattern: 'plain' };

export interface ExteriorLayout {
  /** Limites da área desenhada (tiles). */
  bounds: TileRect;
  floors: FloorPatch[];
  props: ExteriorProp[];
  /** Faixas da rua (y em px) e sentido (+1 = leste, -1 = oeste). */
  lanes: { y: number; dir: 1 | -1 }[];
  /** Linha central da rua (px), para as faixas tracejadas. */
  streetY: number;
  streetH: number;
}

/** O que mostrar numa vaga sem sala. */
export type ShellKind = 'garden_north' | 'garden_south' | 'vacant';

/** Fechamento do corredor e pátio (ou sala vaga) de um slot sem sala. */
export interface SlotShell {
  slot: number;
  kind: ShellKind;
  rect: TileRect;
  walls: WallSegment[];
  windows: WallItemPlacement[];
  floors: FloorPatch[];
  props: ExteriorProp[];
}

/**
 * Onde a vaga dá: só a face norte do último andar e a face sul do térreo são periferia; o resto
 * é miolo de prédio (sala vaga).
 */
export function shellKind(slot: number, floors: number): ShellKind {
  const n = clampFloors(floors);
  const floor = slotFloor(slot);
  const side = slotSide(slot);
  if (side === 'north' && floor === n - 1) return 'garden_north';
  if (side === 'south' && floor === 0) return 'garden_south';
  return 'vacant';
}

export function layoutExterior(floors: number): ExteriorLayout {
  const n = clampFloors(floors);
  const w = TOTAL_COLS * COL_W;
  const H = buildingH(n);
  const bounds: TileRect = { x: -EXT_WEST, y: -EXT_NORTH, w: w + EXT_WEST + EXT_EAST, h: H + EXT_NORTH + EXT_SOUTH };
  const px = (t: number) => t * TILE;
  const floorPatches: FloorPatch[] = [];
  const props: ExteriorProp[] = [];
  const rng = mulberry32(0xc0de + n * 131);

  floorPatches.push({ kind: 'grass', x: px(bounds.x), y: px(bounds.y), w: px(bounds.w), h: px(bounds.h), seed: 11 });
  // calçada e rua no pé do prédio (sul do térreo)
  const south = H;
  floorPatches.push({ kind: 'sidewalk', x: px(bounds.x), y: px(south + 2), w: px(bounds.w), h: px(2), seed: 12 });
  floorPatches.push({ kind: 'street', x: px(bounds.x), y: px(south + 4), w: px(bounds.w), h: px(5), seed: 13 });
  floorPatches.push({ kind: 'sidewalk', x: px(bounds.x), y: px(south + 9), w: px(bounds.w), h: px(2), seed: 14 });
  // entrada principal: alinhada ao corredor do TÉRREO
  const entryY = floorY(0, n) + CORRIDOR_DY;
  floorPatches.push({ kind: 'sidewalk', x: px(-3), y: px(entryY), w: px(3), h: px(5), seed: 15 });
  floorPatches.push({ kind: 'sidewalk', x: px(-3), y: px(entryY + 5), w: px(2), h: px(south + 2 - entryY - 5), seed: 16 });

  // árvores ao norte (fileira com variação)
  for (let x = bounds.x + 1; x < bounds.x + bounds.w - 1; x += 4 + Math.floor(rng() * 3)) {
    props.push({ kind: rng() < 0.25 ? 'pine' : 'tree', x: px(x) + Math.floor(rng() * 8), y: px(-3) - Math.floor(rng() * 20), seed: Math.floor(rng() * 1e9) });
    if (rng() < 0.6) props.push({ kind: 'bush', x: px(x + 2), y: px(-1) - 2, seed: Math.floor(rng() * 1e9) });
  }
  // bosque ao norte: fileiras irregulares cada vez mais esparsas
  for (const [row, gap] of [
    [-6, 5],
    [-10, 6],
    [-14, 8],
  ] as const) {
    for (let x = bounds.x + 2; x < bounds.x + bounds.w - 1; x += gap + Math.floor(rng() * 4)) {
      props.push({ kind: rng() < 0.3 ? 'pine' : 'tree', x: px(x) + Math.floor(rng() * 8), y: px(row) - Math.floor(rng() * 12), seed: Math.floor(rng() * 1e9) });
    }
  }
  // árvores a oeste e a leste, ao longo de TODA a altura do empilhamento
  for (const side of [-1, 1]) {
    for (const band of [0, 7, 13]) {
      const baseX = side < 0 ? -6 - band : w + 4 + band;
      for (let y = 1; y < H; y += 3 + Math.floor(rng() * 3)) {
        // não tapar a entrada principal (oeste, no térreo)
        if (side < 0 && band === 0 && y >= entryY - 1 && y <= south + 1) continue;
        props.push({ kind: rng() < 0.3 ? 'pine' : 'tree', x: px(baseX + Math.floor(rng() * 5)), y: px(y + 1), seed: Math.floor(rng() * 1e9) });
        if (band === 0 && rng() < 0.5) props.push({ kind: 'bush', x: px(side < 0 ? -2 : w + 1), y: px(y + 2), seed: Math.floor(rng() * 1e9) });
      }
    }
  }
  // cerca viva + flores ao longo da fachada sul; diante de cada vaga de projeto do TÉRREO, o
  // trecho do caminho do jardim só tem cerca quando há sala ali
  for (let x = 0; x < w; x += 2) {
    const col = Math.floor(x / COL_W);
    const lx = x - col * COL_W;
    const gate = col >= CORE_COLS && (lx === 6 || lx === 8) ? slotAt(0, col, 'south') : undefined;
    props.push({ kind: (x / 2) % 3 === 1 ? 'flowers' : 'hedge', x: px(x) + TILE, y: px(south + 1) + 10, seed: x * 7 + 3, whenRoom: gate });
  }
  for (let x = bounds.x + 4; x < bounds.x + bounds.w; x += 10) {
    props.push({ kind: 'lamp', x: px(x), y: px(south + 3) + 6, seed: x });
  }
  for (const row of [13, 17, 21]) {
    for (let x = bounds.x + 3; x < bounds.x + bounds.w - 2; x += 6 + Math.floor(rng() * 5)) {
      props.push({ kind: rng() < 0.2 ? 'pine' : 'tree', x: px(x) + Math.floor(rng() * 10), y: px(south + row) + Math.floor(rng() * 10), seed: Math.floor(rng() * 1e9) });
      if (rng() < 0.3) props.push({ kind: 'bush', x: px(x + 3), y: px(south + row + 1), seed: Math.floor(rng() * 1e9) });
    }
  }
  props.push({ kind: 'bench', x: px(-4), y: px(entryY + 3) + 6, seed: 1 });
  // totem com a marca na entrada principal (oeste, no térreo)
  props.push({ kind: 'totem', x: px(-3) + 6, y: px(entryY + 1), seed: 2 });

  const streetY = px(south + 4);
  const streetH = px(5);
  return {
    bounds,
    floors: floorPatches,
    props,
    lanes: [
      { y: streetY + Math.round(streetH * 0.36), dir: 1 },
      { y: streetY + Math.round(streetH * 0.86), dir: -1 },
    ],
    streetY,
    streetH,
  };
}

/**
 * Fechamento de uma vaga sem sala. Na periferia, parede externa + jardim (deck de madeira com
 * mesas e guarda-sóis, canteiros e caminho); no miolo do prédio, uma sala vaga de obra crua.
 */
export function slotShell(slot: number, floors: number, lastColumn: boolean): SlotShell {
  const n = clampFloors(floors);
  const kind = shellKind(slot, n);
  const rect = slotRect(slot, n);
  const x0 = rect.x * TILE;
  const rng = mulberry32(0x9a7d + slot * 31);
  const walls: WallSegment[] = [];
  const windows: WallItemPlacement[] = [];
  const floorPatches: FloorPatch[] = [];
  const props: ExteriorProp[] = [];
  const W = COL_W * TILE;
  const T = (n2: number) => n2 * TILE;
  const seed = () => Math.floor(rng() * 1e9);
  /** Deck de madeira com borda de pedra (tiles locais). */
  const deck = (lx: number, ly: number, w: number, h: number) => {
    floorPatches.push({ kind: 'sidewalk', x: x0 + T(lx), y: T(rect.y + ly), w: T(w), h: T(h), seed: slot + 7 });
    floorPatches.push({ kind: 'wood', x: x0 + T(lx) + 4, y: T(rect.y + ly) + 4, w: T(w) - 8, h: T(h) - 8, seed: slot + 8 });
  };

  if (kind === 'garden_north') {
    // fachada com janelas fechando o corredor (duas últimas linhas da sala ao norte)
    const fy = (rect.y + ROOM_H - 2) * TILE;
    walls.push({ kind: 'face', x: x0, y: fy, w: W, style: EXTERIOR_WALL });
    [3, 8, 13].forEach((cx, i) =>
      windows.push({ id: `shell:${slot}:janela${i}`, kind: 'window', cx: x0 + cx * TILE, baseY: (rect.y + ROOM_H) * TILE, on: 'face', order: 0 }),
    );
    if (lastColumn) walls.push({ kind: 'cap', x: x0 + W - TILE / 2, y: fy, w: TILE / 2, h: 2 * TILE, style: EXTERIOR_WALL });
    // caminho do gramado até o deck, deck no meio e canteiros sob as janelas
    floorPatches.push({ kind: 'sidewalk', x: x0 + T(7), y: T(rect.y), w: T(2), h: T(3), seed: slot });
    deck(3, 3, 10, 5);
    props.push({ kind: 'parasol', x: x0 + T(5.5), y: T(rect.y + 6) + 4, seed: seed(), slot });
    props.push({ kind: 'parasol', x: x0 + T(10.5), y: T(rect.y + 6) + 4, seed: seed(), slot });
    props.push({ kind: 'bush', x: x0 + T(3.5), y: T(rect.y + 3) + 6, seed: seed(), slot });
    props.push({ kind: 'bush', x: x0 + T(12.5), y: T(rect.y + 3) + 6, seed: seed(), slot });
    for (const cx of [3, 8, 13]) props.push({ kind: 'flowers', x: x0 + T(cx), y: T(rect.y + 9) + 12, seed: slot * 3 + cx, slot });
    props.push({ kind: 'tree', x: x0 + T(1) + 4, y: T(rect.y + 3), seed: seed(), slot });
    props.push({ kind: rng() < 0.5 ? 'pine' : 'tree', x: x0 + T(15) - 4, y: T(rect.y + 3) + 6, seed: seed(), slot });
    props.push({ kind: 'bush', x: x0 + T(1) + 8, y: T(rect.y + 8), seed: seed(), slot });
    props.push({ kind: 'bush', x: x0 + T(15) - 8, y: T(rect.y + 8), seed: seed(), slot });
  } else if (kind === 'garden_south') {
    // mureta externa fechando o corredor e jardim abaixo, ligado à calçada da rua
    walls.push({ kind: 'south', x: x0, y: rect.y * TILE, w: W, style: EXTERIOR_WALL });
    if (lastColumn) walls.push({ kind: 'cap', x: x0 + W - TILE / 2, y: rect.y * TILE, w: TILE / 2, h: TILE, style: EXTERIOR_WALL });
    floorPatches.push({ kind: 'sidewalk', x: x0 + T(7), y: T(rect.y + 1), w: T(2), h: T(rect.h - 1), seed: slot });
    // trecho entre a fachada e a calçada: só existe enquanto o slot está vazio (a cerca viva fecha)
    props.push({ kind: 'paving', x: x0 + T(7), y: T(rect.y + rect.h), seed: slot, slot });
    deck(3, 3.5, 10, 5);
    props.push({ kind: 'parasol', x: x0 + T(5.5), y: T(rect.y + 6.5) + 4, seed: seed(), slot });
    props.push({ kind: 'parasol', x: x0 + T(10.5), y: T(rect.y + 6.5) + 4, seed: seed(), slot });
    props.push({ kind: 'bush', x: x0 + T(3.5), y: T(rect.y + 4) + 4, seed: seed(), slot });
    props.push({ kind: 'bush', x: x0 + T(12.5), y: T(rect.y + 4) + 4, seed: seed(), slot });
    for (const cx of [3, 13]) props.push({ kind: 'flowers', x: x0 + T(cx), y: T(rect.y + 2), seed: slot * 3 + cx, slot });
    props.push({ kind: 'bench', x: x0 + T(4), y: T(rect.y + 10) + 6, seed: slot, slot });
    props.push({ kind: 'bench', x: x0 + T(12), y: T(rect.y + 10) + 6, seed: slot + 1, slot });
    props.push({ kind: 'tree', x: x0 + T(1) + 6, y: T(rect.y + 11), seed: seed(), slot });
    props.push({ kind: rng() < 0.5 ? 'pine' : 'tree', x: x0 + T(15) - 6, y: T(rect.y + 11) + 4, seed: seed(), slot });
    props.push({ kind: 'rock', x: x0 + T(14), y: T(rect.y + 2) + 4, seed: slot + 3, slot });
  } else {
    // ---- sala vaga: miolo do prédio. Piso cru, parede de obra fechando o corredor, nada de verde.
    const north = slotSide(slot) === 'north';
    floorPatches.push({ kind: 'concrete', x: x0, y: T(rect.y), w: W, h: T(rect.h), seed: slot + 21 });
    if (north) {
      const fy = (rect.y + ROOM_H - 2) * TILE;
      walls.push({ kind: 'face', x: x0, y: fy, w: W, style: VACANT_WALL });
      if (lastColumn) walls.push({ kind: 'cap', x: x0 + W - TILE / 2, y: fy, w: TILE / 2, h: 2 * TILE, style: VACANT_WALL });
    } else {
      walls.push({ kind: 'south', x: x0, y: rect.y * TILE, w: W, style: VACANT_WALL });
      if (lastColumn) walls.push({ kind: 'cap', x: x0 + W - TILE / 2, y: rect.y * TILE, w: TILE / 2, h: TILE, style: VACANT_WALL });
    }
    // marcação de piso de uma sala ainda não entregue (só pedra, sem jardim)
    floorPatches.push({ kind: 'sidewalk', x: x0 + T(7), y: T(rect.y + (north ? 2 : 1)), w: T(2), h: T(3), seed: slot + 22 });
    props.push({ kind: 'paving', x: x0 + T(4), y: T(rect.y + 6), seed: slot + 31, slot });
    props.push({ kind: 'paving', x: x0 + T(11), y: T(rect.y + 7), seed: slot + 32, slot });
  }
  return { slot, kind, rect, walls, windows, floors: floorPatches, props };
}
