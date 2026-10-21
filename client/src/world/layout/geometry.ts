// Geometria do prédio: mapeamento de vagas, andares, colunas e retângulos. Puro e testável.
//
// O prédio é um EMPILHAMENTO de andares de altura fixa (`FLOOR_H`), todos com a mesma largura
// (`TOTAL_COLS`). Cada andar tem o seu núcleo nas colunas 0–1 (recepção no térreo ou hall de
// elevadores nos de cima, + banheiros, copa e lounge) e `PROJECT_COLS_PER_FLOOR` colunas de
// projeto depois dele, com uma sala ao norte e uma ao sul do corredor.
//
// O TÉRREO FICA SEMPRE EMBAIXO (colado na calçada e na rua) e os andares de cima empilham para o
// topo. Por isso o y absoluto de um andar depende de QUANTOS andares o prédio tem no momento:
// `floorY(andar, andares)`. Quando o prédio ganha (ou perde) um andar, todos os andares já
// existentes mudam de y — a simulação refaz os layouts e reposiciona quem está dentro.
import {
  COL_W,
  CORE_COLS,
  CORRIDOR_DY,
  CORRIDOR_H,
  FLOOR_H,
  NORTH_DY,
  PROJECT_COLS_PER_FLOOR,
  ROOMS_PER_FLOOR,
  ROOM_H,
  SOUTH_DY,
  TILE,
  TOTAL_COLS,
  buildingH,
} from '../constants';
import type { TileRect } from './types';

export type Side = 'north' | 'south';

/** Onde uma vaga fica: andar, coluna do prédio e lado do corredor. */
export interface SlotPos {
  floor: number;
  col: number;
  side: Side;
}

/** Andares necessários para um número de andares pedido (nunca menos de 1). */
export function clampFloors(floors: number): number {
  return Math.max(1, Math.floor(floors));
}

/** y (tiles) do topo de um andar, dado o total de andares do prédio. Térreo = andar 0 = embaixo. */
export function floorY(floor: number, floors: number): number {
  return (clampFloors(floors) - 1 - Math.max(0, floor)) * FLOOR_H;
}

/** Andar a que pertence um y absoluto (tiles). */
export function floorAtY(y: number, floors: number): number {
  const n = clampFloors(floors);
  const f = n - 1 - Math.floor(y / FLOOR_H);
  return Math.max(0, Math.min(n - 1, f));
}

/** Andar de uma vaga: as primeiras `ROOMS_PER_FLOOR` ficam no térreo, as seguintes sobem. */
export function slotFloor(slot: number): number {
  return Math.floor(Math.max(0, slot) / ROOMS_PER_FLOOR);
}

/** Índice da vaga dentro do seu andar (0..ROOMS_PER_FLOOR-1). */
export function slotIndexInFloor(slot: number): number {
  return Math.max(0, slot) % ROOMS_PER_FLOOR;
}

/** Coluna do prédio ocupada por uma vaga de projeto (as colunas 0–1 são o núcleo do andar). */
export function slotColumn(slot: number): number {
  return CORE_COLS + Math.floor(slotIndexInFloor(slot) / 2);
}

/** Vaga par = norte do corredor; ímpar = sul. */
export function slotSide(slot: number): Side {
  return slotIndexInFloor(slot) % 2 === 0 ? 'north' : 'south';
}

/** Andar, coluna e lado de uma vaga. */
export function slotPos(slot: number): SlotPos {
  return { floor: slotFloor(slot), col: slotColumn(slot), side: slotSide(slot) };
}

/** Vaga correspondente a um andar/coluna/lado de projeto (inverso de `slotPos`). */
export function slotAt(floor: number, col: number, side: Side): number {
  return Math.max(0, floor) * ROOMS_PER_FLOOR + (col - CORE_COLS) * 2 + (side === 'north' ? 0 : 1);
}

/** Retângulo (tiles) de uma célula de sala, dado o total de andares do prédio. */
export function cellRect(floor: number, col: number, side: Side, floors: number): TileRect {
  return {
    x: col * COL_W,
    y: floorY(floor, floors) + (side === 'north' ? NORTH_DY : SOUTH_DY),
    w: COL_W,
    h: ROOM_H,
  };
}

/** Retângulo (tiles) de uma vaga, dado o total de andares do prédio. */
export function slotRect(slot: number, floors: number): TileRect {
  const p = slotPos(slot);
  return cellRect(p.floor, p.col, p.side, floors);
}

/** Total de andares do prédio para um conjunto de vagas em uso (mínimo: 1). */
export function floorsFor(slots: Iterable<number>): number {
  let max = 0;
  for (const s of slots) max = Math.max(max, slotFloor(s));
  return max + 1;
}

/** Todas as vagas de projeto de um andar, na ordem (norte/sul por coluna). */
export function slotsOfFloor(floor: number): number[] {
  const base = Math.max(0, floor) * ROOMS_PER_FLOOR;
  return Array.from({ length: ROOMS_PER_FLOOR }, (_, i) => base + i);
}

export function corridorRect(floor: number, floors: number): TileRect {
  return { x: 0, y: floorY(floor, floors) + CORRIDOR_DY, w: TOTAL_COLS * COL_W, h: CORRIDOR_H };
}

/** Retângulo de um andar inteiro (a largura é fixa). */
export function floorRect(floor: number, floors: number): TileRect {
  return { x: 0, y: floorY(floor, floors), w: TOTAL_COLS * COL_W, h: FLOOR_H };
}

export function buildingRect(floors: number): TileRect {
  return { x: 0, y: 0, w: TOTAL_COLS * COL_W, h: buildingH(floors) };
}

/** Largura do prédio em tiles (fixa). */
export function buildingW(): number {
  return TOTAL_COLS * COL_W;
}

export function rectPx(r: TileRect): { x: number; y: number; w: number; h: number } {
  return { x: r.x * TILE, y: r.y * TILE, w: r.w * TILE, h: r.h * TILE };
}

export function inRect(r: TileRect, tx: number, ty: number): boolean {
  return tx >= r.x && ty >= r.y && tx < r.x + r.w && ty < r.y + r.h;
}

export { PROJECT_COLS_PER_FLOOR, ROOMS_PER_FLOOR, TOTAL_COLS };
