import { describe, expect, it } from 'vitest';
import { FURNITURE, TILE, type FurnitureKind, type RoomTheme } from '../../art/api';
import { COL_W, CORRIDOR_DY, FLOOR_H, ROOMS_PER_FLOOR, SOUTH_DY, TOTAL_COLS, buildingH } from '../constants';
import { assembleBuilding, coreAreas } from './building';
import { floorY, floorsFor, slotAt, slotColumn, slotFloor, slotRect, slotSide } from './geometry';
import { layoutProjectRoom, roomVariant } from './room';
import { layoutExterior, shellKind, slotShell } from './exterior';
import type { AreaLayout } from './types';

const theme: RoomTheme = {
  carpet: '#4f6d8f',
  carpet2: '#486685',
  wall: { base: '#e6e2da', trim: '#9a8f80', pattern: 'plain' },
  accent: '#3f7fd8',
  deskVariant: 'wood',
  chairVariant: 'black',
};

function roomsFor(slots: number[], floors = floorsFor(slots)): AreaLayout[] {
  return slots.map((slot) => layoutProjectRoom({ id: `/proj/${slot}`, slot, seed: 1000 + slot * 77, floors }, theme));
}

/** Spot de elevador de um andar (recepção no térreo, hall nos de cima). */
function elevatorsOf(b: ReturnType<typeof assembleBuilding>, floor: number) {
  const hall = b.core.find((a) => a.floor === floor && (a.kind === 'reception' || a.kind === 'lobby'))!;
  return hall.spots.filter((s) => s.kind === 'elevator');
}

describe('mapeamento de vagas', () => {
  it('as primeiras ROOMS_PER_FLOOR vagas ficam no térreo; depois o prédio sobe', () => {
    expect(slotFloor(0)).toBe(0);
    expect(slotFloor(ROOMS_PER_FLOOR - 1)).toBe(0);
    expect(slotFloor(ROOMS_PER_FLOOR)).toBe(1);
    expect(slotFloor(ROOMS_PER_FLOOR * 3 + 2)).toBe(3);
  });

  it('coluna = núcleo + floor(índice no andar / 2); par = norte, ímpar = sul', () => {
    expect(slotColumn(0)).toBe(2);
    expect(slotColumn(1)).toBe(2);
    expect(slotColumn(2)).toBe(3);
    expect(slotColumn(7)).toBe(5);
    // a vaga seguinte recomeça na primeira coluna de projeto, um andar acima
    expect(slotColumn(ROOMS_PER_FLOOR)).toBe(2);
    expect(slotSide(0)).toBe('north');
    expect(slotSide(1)).toBe('south');
    expect(slotSide(6)).toBe('north');
    expect(slotAt(0, 3, 'south')).toBe(3);
    expect(slotAt(1, 2, 'north')).toBe(ROOMS_PER_FLOOR);
    for (const slot of [0, 3, 7, 9, 17]) expect(slotAt(slotFloor(slot), slotColumn(slot), slotSide(slot))).toBe(slot);
  });

  it('num andar só, os retângulos respeitam o corredor', () => {
    const a = slotRect(0, 1);
    const b = slotRect(1, 1);
    expect(a).toEqual({ x: 2 * COL_W, y: 0, w: COL_W, h: 12 });
    expect(b.y).toBe(SOUTH_DY);
    expect(a.y + a.h).toBe(CORRIDOR_DY);
    expect(b.y + b.h).toBe(buildingH(1));
  });

  it('o térreo fica sempre embaixo: ganhar um andar empurra todos pelo mesmo tanto', () => {
    expect(floorY(0, 1)).toBe(0);
    expect(floorY(0, 3)).toBe(2 * FLOOR_H);
    expect(floorY(2, 3)).toBe(0);
    // o deslocamento ao ganhar um andar não depende do andar
    for (const f of [0, 1, 2]) expect(floorY(f, 4) - floorY(f, 3)).toBe(FLOOR_H);
    // o pé do térreo é o pé do prédio, em qualquer altura
    for (const n of [1, 2, 5]) expect(floorY(0, n) + FLOOR_H).toBe(buildingH(n));
  });

  it('andares do prédio: 1 + o maior andar usado', () => {
    expect(floorsFor([])).toBe(1);
    expect(floorsFor([0, 1])).toBe(1);
    expect(floorsFor([ROOMS_PER_FLOOR - 1])).toBe(1);
    expect(floorsFor([ROOMS_PER_FLOOR])).toBe(2);
    expect(floorsFor([2, ROOMS_PER_FLOOR * 2 + 1])).toBe(3);
  });

  it('vaga vazia: jardim só na periferia (norte do topo, sul do térreo); o resto é sala vaga', () => {
    // num prédio de 1 andar, as duas faces são periferia
    expect(shellKind(0, 1)).toBe('garden_north');
    expect(shellKind(1, 1)).toBe('garden_south');
    // com 2 andares, o norte do térreo passa a ser miolo (tem andar em cima)
    expect(shellKind(0, 2)).toBe('vacant');
    expect(shellKind(1, 2)).toBe('garden_south');
    expect(shellKind(ROOMS_PER_FLOOR, 2)).toBe('garden_north');
    expect(shellKind(ROOMS_PER_FLOOR + 1, 2)).toBe('vacant');
  });
});

describe('layout do prédio', () => {
  // vagas em dois andares: o térreo cheio pela metade e uma sala no andar de cima
  const slots = [0, 1, 2, 3, 4, 7, ROOMS_PER_FLOOR, ROOMS_PER_FLOOR + 3];
  const floors = floorsFor(slots);
  const rooms = roomsFor(slots, floors);
  const b = assembleBuilding(floors, rooms);
  /** Alcance a pé a partir dos elevadores de cada andar (não há caminho entre andares). */
  const reachOf = Array.from({ length: floorsFor(slots) }, (_, f) => {
    const e = elevatorsOf(b, f)[0];
    return b.grid.reachableFrom(e.tx, e.ty);
  });
  const reachable = (floor: number, x: number, y: number) => reachOf[floor][y * b.grid.w + x] === 1;

  it('o prédio tem os andares pedidos e um corredor em cada', () => {
    expect(b.floors).toBe(2);
    expect(b.corridors).toHaveLength(2);
    expect(b.cols).toBe(TOTAL_COLS);
    expect(b.rect.h).toBe(buildingH(2));
  });

  it('cada andar tem dois elevadores, com tiles de aproximação caminháveis', () => {
    for (let f = 0; f < b.floors; f++) {
      const elevators = elevatorsOf(b, f);
      expect(elevators, `andar ${f}`).toHaveLength(2);
      for (const e of elevators) expect(b.grid.walkable(e.tx, e.ty), `andar ${f}`).toBe(true);
    }
  });

  it('os poços dos elevadores ficam alinhados de um andar para o outro', () => {
    const xs = Array.from({ length: b.floors }, (_, f) => elevatorsOf(b, f).map((e) => e.tx).sort((p, q) => p - q));
    for (const col of xs) expect(col).toEqual(xs[0]);
  });

  it('cada andar tem copa, lounge e banheiros próprios', () => {
    for (let f = 0; f < b.floors; f++) {
      const kinds = b.core.filter((a) => a.floor === f).map((a) => a.kind).sort();
      expect(kinds, `andar ${f}`).toEqual([f === 0 ? 'reception' : 'lobby', 'restroom', 'cafe', 'lounge'].sort());
    }
  });

  it('dentro de um andar, tudo é alcançável a pé a partir dos elevadores dele', () => {
    for (let f = 0; f < b.floors; f++) {
      const unreachable = b.spots.filter((s) => s.floor === f && !reachable(f, s.tx, s.ty)).map((s) => s.id);
      expect(unreachable, `andar ${f}`).toEqual([]);
    }
  });

  it('um andar NÃO se liga ao outro a pé: quem troca de andar vai de elevador', () => {
    const outros = b.spots.filter((s) => s.floor !== 0 && reachable(0, s.tx, s.ty)).map((s) => s.id);
    expect(outros).toEqual([]);
  });

  it('as portas conectam cada sala ao corredor', () => {
    for (const room of rooms) {
      const door = room.door!;
      expect(door).toBeDefined();
      for (let x = door.x; x < door.x + door.w; x++) {
        for (let y = door.y; y < door.y + door.h; y++) expect(b.grid.walkable(x, y)).toBe(true);
        // tile do corredor imediatamente fora da porta
        const outside = room.side === 'north' ? door.y + door.h : door.y - 1;
        const fy = floorY(room.floor, b.floors);
        expect(outside >= fy + CORRIDOR_DY && outside < fy + SOUTH_DY, `${room.id}: porta não dá no corredor do andar`).toBe(true);
        expect(reachable(room.floor, x, outside), room.id).toBe(true);
      }
      // o interior inteiro (fora móveis) é alcançável
      const r = room.rect;
      for (let y = r.y + 2; y < r.y + 11; y++)
        for (let x = r.x + 1; x < r.x + 15; x++) if (b.grid.walkable(x, y)) expect(reachable(room.floor, x, y)).toBe(true);
    }
  });

  it('cada sala tem 6 mesas, ao menos 4 lugares extras sentados, interruptor e quadro', () => {
    for (const room of rooms) {
      const desks = room.spots.filter((s) => s.kind === 'desk');
      expect(desks).toHaveLength(6);
      expect(new Set(desks.map((d) => d.rank))).toEqual(new Set([0, 1, 2, 3, 4, 5]));
      expect(desks.filter((d) => d.side === 'N')).toHaveLength(3);
      expect(room.spots.filter((s) => s.kind === 'stool' || s.kind === 'nook').length).toBeGreaterThanOrEqual(4);
      expect(room.spots.filter((s) => s.kind === 'stand').length).toBeGreaterThanOrEqual(3);
      expect(room.spots.filter((s) => s.kind === 'switch')).toHaveLength(1);
      expect(room.wallItems.some((w) => w.kind === 'whiteboard')).toBe(true);
      expect(room.wallItems.some((w) => w.kind === 'sign')).toBe(true);
      expect(room.wallItems.some((w) => w.kind === 'light_switch')).toBe(true);
      for (const d of desks) expect(room.furniture.some((f) => f.id === d.deskId)).toBe(true);
    }
  });

  it('móveis bloqueantes não se sobrepõem e ficam dentro da área', () => {
    for (const area of [...b.core, ...b.corridors, ...rooms]) {
      const used = new Map<string, string>();
      for (const f of area.furniture) {
        const def = FURNITURE[f.kind];
        expect(def.mount).toBe('floor');
        for (let y = f.ty; y < f.ty + def.footprint.h; y++) {
          for (let x = f.tx; x < f.tx + def.footprint.w; x++) {
            expect(x >= area.rect.x && x < area.rect.x + area.rect.w && y >= area.rect.y && y < area.rect.y + area.rect.h).toBe(true);
            const key = `${x},${y}`;
            if (def.blocks) {
              expect(used.get(key), `${f.id} sobre ${used.get(key)}`).toBeUndefined();
              used.set(key, f.id);
            }
          }
        }
      }
      for (const w of area.wallItems) expect(FURNITURE[w.kind].mount).toBe('wall');
    }
  });

  it('spots têm ids únicos', () => {
    const ids = b.spots.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('pontos de conversa e ping-pong vêm em pares', () => {
    const groups = new Map<string, number>();
    for (const s of b.spots) if (s.group && (s.kind === 'talk' || s.kind === 'pingpong')) groups.set(s.group, (groups.get(s.group) ?? 0) + 1);
    for (const [, n] of groups) expect(n).toBe(2);
  });

  it('corredor alterna bebedouro e banco nas colunas de projeto, sem excesso de plantas', () => {
    for (const corr of b.corridors) {
      const coolers = corr.furniture.filter((f) => f.kind === 'water_cooler');
      expect(coolers.length).toBeGreaterThanOrEqual(Math.ceil((TOTAL_COLS - 2) / 2));
      const benches = corr.furniture.filter((f) => f.kind === 'bench');
      expect(benches.length).toBeGreaterThanOrEqual(Math.floor((TOTAL_COLS - 2) / 2));
      const plants = corr.furniture.filter((f) => f.kind === 'plant_tall' || f.kind === 'plant_small');
      expect(plants.length).toBeLessThanOrEqual(TOTAL_COLS * 2);
    }
  });

  it('a área externa e os pátios cobrem o prédio', () => {
    const ext = layoutExterior(floors);
    expect(ext.bounds.x).toBeLessThan(0);
    expect(ext.bounds.x + ext.bounds.w).toBeGreaterThan(TOTAL_COLS * COL_W);
    // a área desenhada cobre todo o empilhamento, e a rua fica no pé do prédio
    expect(ext.bounds.y + ext.bounds.h).toBeGreaterThan(buildingH(floors));
    expect(ext.streetY).toBeGreaterThan(buildingH(floors) * TILE);
    const shell = slotShell(5, floors, true);
    expect(shell.walls.length).toBeGreaterThan(0);
    expect(shell.props.every((p) => p.slot === 5)).toBe(true);
  });
});

/** Móveis de chão altos que escondem o que está pendurado na parede logo atrás. */
const TALL_FLOOR = new Set<FurnitureKind>(['plant_tall', 'bookshelf', 'binder_shelf', 'fridge', 'vending_machine', 'arcade', 'water_cooler', 'floor_lamp', 'toilet_stall']);
const WALL_DECOR = new Set<FurnitureKind>(['painting', 'poster', 'window', 'tv', 'whiteboard', 'sign', 'clock', 'mirror', 'door_frame']);

/** Itens de parede decorativos com algum móvel alto encostado na frente (ids). */
function hiddenWallItems(area: AreaLayout): string[] {
  const out: string[] = [];
  for (const w of area.wallItems) {
    if (w.on !== 'face' || !WALL_DECOR.has(w.kind)) continue;
    const half = (FURNITURE[w.kind].footprint.w * TILE) / 2 - 2;
    const wy = w.baseY / TILE;
    for (const f of area.furniture) {
      if (!TALL_FLOOR.has(f.kind) || f.ty !== wy) continue;
      const fx0 = f.tx * TILE + (f.dx ?? 0);
      const fx1 = fx0 + FURNITURE[f.kind].footprint.w * TILE;
      if (fx0 < w.cx + half && fx1 > w.cx - half) out.push(`${w.id} atrás de ${f.id}`);
    }
  }
  return out;
}

describe('variações das salas de projeto', () => {
  const seeds = Array.from({ length: 90 }, (_, i) => (i * 7919 + 13) >>> 0);

  it('toda variação é válida: sem sobreposição, tudo alcançável, lugares suficientes', () => {
    for (const slot of [0, 1]) {
      for (const seed of seeds) {
        const room = layoutProjectRoom({ id: `/v/${seed}`, slot, seed, floors: 1 }, theme);
        const b = assembleBuilding(1, [room]);
        const used = new Map<string, string>();
        for (const f of room.furniture) {
          const def = FURNITURE[f.kind];
          for (let y = f.ty; y < f.ty + def.footprint.h; y++)
            for (let x = f.tx; x < f.tx + def.footprint.w; x++) {
              expect(x >= room.rect.x + 1 && x < room.rect.x + 15 && y >= room.rect.y + 2 && y < room.rect.y + 11, `${f.id} fora do piso`).toBe(true);
              if (!def.blocks) continue;
              expect(used.get(`${x},${y}`), `${f.id} sobre ${used.get(`${x},${y}`)}`).toBeUndefined();
              used.set(`${x},${y}`, f.id);
            }
        }
        const door = room.door!;
        const reach = b.grid.reachableFrom(door.x, door.y);
        for (const sp of room.spots) expect(reach[sp.ty * b.grid.w + sp.tx], `${sp.id} inalcançável (semente ${seed})`).toBe(1);
        const r = room.rect;
        for (let y = r.y + 2; y < r.y + 11; y++)
          for (let x = r.x + 1; x < r.x + 15; x++) if (b.grid.walkable(x, y)) expect(reach[y * b.grid.w + x], `tile ${x},${y} isolado (semente ${seed})`).toBe(1);
        expect(room.spots.filter((sp) => sp.kind === 'desk')).toHaveLength(6);
        expect(room.spots.filter((sp) => sp.kind === 'stool' || sp.kind === 'nook').length).toBeGreaterThanOrEqual(4);
        // spots de uso não podem cair em cima de móvel que bloqueia
        for (const sp of room.spots) expect(b.grid.walkable(sp.tx, sp.ty), `${sp.id} sobre móvel`).toBe(true);
        expect(hiddenWallItems(room)).toEqual([]);
      }
    }
  });

  it('as salas não são todas iguais: espelhamento, canto de reunião e cantos variam', () => {
    const vs = seeds.map(roomVariant);
    expect(new Set(vs.map((v) => v.mirror)).size).toBe(2);
    expect(new Set(vs.map((v) => v.meeting)).size).toBe(3);
    expect(new Set(vs.map((v) => v.left)).size).toBeGreaterThan(1);
    expect(new Set(vs.map((v) => v.right)).size).toBeGreaterThan(1);
    // o piso é porcelanato (azulejo é do banheiro) com um leve tom da sala
    const room = layoutProjectRoom({ id: '/v/x', slot: 0, seed: 42, floors: 1 }, theme);
    expect(room.floors.every((f) => f.kind !== 'tile_white')).toBe(true);
    expect(room.floorTint).toBe(theme.carpet);
  });
});

describe('itens de parede', () => {
  it('quadros, janelas, TV, placas e espelhos não ficam atrás de móveis altos', () => {
    for (const area of [...coreAreas(2), ...roomsFor([0, 1, 2, 3, 4, 7])]) expect(hiddenWallItems(area), area.id).toEqual([]);
  });

  it('passagens nas faces das paredes têm batente', () => {
    const restroom = coreAreas(1).find((a) => a.kind === 'restroom')!;
    expect(restroom.wallItems.some((w) => w.kind === 'door_frame')).toBe(true);
    for (const room of roomsFor([1, 3, 7])) expect(room.wallItems.some((w) => w.kind === 'door_frame'), room.id).toBe(true);
  });
});
