// Montagem do prédio: para CADA ANDAR, núcleo + corredor + salas de projeto -> grade de
// caminhabilidade e spots. Os andares são faixas empilhadas numa grade plana só; não há tiles
// ligando um andar ao outro — quem troca de andar vai pelo elevador.
import { FURNITURE } from '../../art/api';
import { COL_W, TOTAL_COLS, buildingH } from '../constants';
import { BLOCKED, FREE, SEAT, WalkGrid } from '../path/grid';
import { furnitureBlocks, furnitureIsSeat } from './builder';
import { layoutCafe, layoutLobby, layoutLounge, layoutReception, layoutRestroom } from './core';
import { layoutCorridor } from './corridor';
import { buildingRect, clampFloors } from './geometry';
import type { AreaLayout, SpotDef, TileRect } from './types';

export interface BuildingLayout {
  /** Quantidade de andares (>= 1). */
  floors: number;
  /** Largura em colunas (fixa). */
  cols: number;
  rect: TileRect;
  /** Áreas de núcleo de todos os andares (recepção/hall, banheiros, copa, lounge). */
  core: AreaLayout[];
  /** Um corredor por andar, do térreo para cima. */
  corridors: AreaLayout[];
  rooms: AreaLayout[];
  grid: WalkGrid;
  spots: SpotDef[];
}

/** Cache das áreas de núcleo por andar: a posição depende de quantos andares o prédio tem. */
const coreCache = new Map<string, AreaLayout[]>();

/**
 * Áreas fixas do núcleo de um andar. O térreo tem recepção (a entrada do prédio); os andares de
 * cima, um hall de elevadores no mesmo lugar. Todos têm banheiros, copa e lounge próprios.
 */
export function coreAreasOfFloor(floor: number, floors: number): AreaLayout[] {
  const n = clampFloors(floors);
  const key = `${floor}/${n}`;
  let areas = coreCache.get(key);
  if (!areas) {
    areas = [
      floor === 0 ? layoutReception(floor, n) : layoutLobby(floor, n),
      layoutRestroom(floor, n),
      layoutCafe(floor, n),
      layoutLounge(floor, n),
    ];
    // o cache acompanha o prédio: poucas combinações de (andar, andares) ao longo da sessão
    if (coreCache.size > 256) coreCache.clear();
    coreCache.set(key, areas);
  }
  return areas;
}

/** Áreas de núcleo de todos os andares. */
export function coreAreas(floors = 1): AreaLayout[] {
  const n = clampFloors(floors);
  const out: AreaLayout[] = [];
  for (let f = 0; f < n; f++) out.push(...coreAreasOfFloor(f, n));
  return out;
}

/** Marca na grade as células caminháveis de uma área, os bloqueios e os assentos. */
export function paintArea(grid: WalkGrid, area: AreaLayout): void {
  for (const r of area.walkable) grid.fill(r.x, r.y, r.w, r.h, FREE);
  for (const r of area.blocked ?? []) grid.fill(r.x, r.y, r.w, r.h, BLOCKED);
  for (const f of area.furniture) {
    const def = FURNITURE[f.kind];
    if (def.mount !== 'floor') continue;
    const { w, h } = def.footprint;
    if (furnitureBlocks(f.kind)) grid.fill(f.tx, f.ty, w, h, BLOCKED);
    else if (furnitureIsSeat(f.kind)) {
      for (let y = f.ty; y < f.ty + h; y++) for (let x = f.tx; x < f.tx + w; x++) if (grid.get(x, y) === FREE) grid.set(x, y, SEAT);
    }
  }
}

export function buildWalkGrid(floors: number, areas: readonly AreaLayout[], version = 0): WalkGrid {
  const grid = new WalkGrid(TOTAL_COLS * COL_W, buildingH(floors), version);
  for (const a of areas) paintArea(grid, a);
  return grid;
}

export function assembleBuilding(floors: number, rooms: readonly AreaLayout[], version = 0): BuildingLayout {
  const n = clampFloors(floors);
  const core: AreaLayout[] = [];
  const corridors: AreaLayout[] = [];
  for (let f = 0; f < n; f++) {
    core.push(...coreAreasOfFloor(f, n));
    corridors.push(layoutCorridor(f, n));
  }
  const all = [...core, ...corridors, ...rooms];
  const grid = buildWalkGrid(n, all, version);
  const spots: SpotDef[] = [];
  for (const a of all) spots.push(...a.spots);
  return { floors: n, cols: TOTAL_COLS, rect: buildingRect(n), core, corridors, rooms: [...rooms], grid, spots };
}
