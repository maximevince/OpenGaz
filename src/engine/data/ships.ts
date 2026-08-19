export interface ShipDef {
  id: number; // 1..12 (matches picture ids)
  name: string;
  cargo: number; // tons
  seats: number; // passengers
  fuel: number; // tank tons
  kuarps: number; // engine speed
  crew: number;
  /** per-model +200 t upgrade increments */
  up: {
    engine: number;
    fuelCap: number;
    cargo: number;
    seats: number;
    crew: number;
    /** insurancePriceRange increase */
    insurance: number;
  };
}

const U = (
  engine: number,
  fuelCap: number,
  cargo: number,
  seats: number,
  crew: number,
  insurance: number,
) => ({ engine, fuelCap, cargo, seats, crew, insurance });

/** Ship model table + upgrade increments. */
export const SHIPS: readonly ShipDef[] = [
  {
    id: 1,
    name: 'Stinger XII',
    cargo: 100,
    seats: 8,
    fuel: 20,
    kuarps: 7,
    crew: 4,
    up: U(1, 5, 50, 4, 2, 6),
  },
  {
    id: 2,
    name: 'Fly Catcher',
    cargo: 120,
    seats: 8,
    fuel: 40,
    kuarps: 5,
    crew: 5,
    up: U(0, 10, 60, 3, 2, 8),
  },
  {
    id: 3,
    name: 'Le Rock',
    cargo: 80,
    seats: 8,
    fuel: 65,
    kuarps: 5,
    crew: 3,
    up: U(0, 30, 40, 3, 1, 2),
  },
  {
    id: 4,
    name: 'Whaler 2000',
    cargo: 130,
    seats: 11,
    fuel: 50,
    kuarps: 2,
    crew: 6,
    up: U(0, 10, 65, 5, 3, 8),
  },
  {
    id: 5,
    name: 'Retina',
    cargo: 100,
    seats: 6,
    fuel: 40,
    kuarps: 5,
    crew: 3,
    up: U(0, 15, 50, 2, 1, 6),
  },
  {
    id: 6,
    name: 'Cerebralis',
    cargo: 100,
    seats: 8,
    fuel: 40,
    kuarps: 5,
    crew: 4,
    up: U(0, 15, 50, 4, 2, 6),
  },
  {
    id: 7,
    name: 'The Globulizer',
    cargo: 80,
    seats: 7,
    fuel: 30,
    kuarps: 7,
    crew: 4,
    up: U(1, 10, 40, 3, 2, 6),
  },
  {
    id: 8,
    name: 'Locomotis',
    cargo: 110,
    seats: 5,
    fuel: 40,
    kuarps: 6,
    crew: 4,
    up: U(0, 15, 55, 3, 2, 6),
  },
  {
    id: 9,
    name: 'Mantagon',
    cargo: 90,
    seats: 10,
    fuel: 40,
    kuarps: 4,
    crew: 3,
    up: U(0, 15, 45, 5, 2, 4),
  },
  {
    id: 10,
    name: 'Kegger',
    cargo: 150,
    seats: 1,
    fuel: 35,
    kuarps: 3,
    crew: 2,
    up: U(0, 10, 75, 1, 1, 10),
  },
  {
    id: 11,
    name: 'Worm Shuttle',
    cargo: 75,
    seats: 16,
    fuel: 30,
    kuarps: 6,
    crew: 12,
    up: U(0, 10, 40, 8, 6, 2),
  },
  {
    id: 12,
    name: 'Squidocity',
    cargo: 110,
    seats: 8,
    fuel: 40,
    kuarps: 6,
    crew: 6,
    up: U(0, 15, 55, 4, 3, 6),
  },
];

export const SHIP_BY_ID = (id: number): ShipDef => SHIPS.find((s) => s.id === id)!;
