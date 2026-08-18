export interface ShipDef {
  id: number; // 1..12 (matches picture ids)
  name: string;
  cargo: number; // tons
  seats: number; // passengers
  fuel: number; // tank tons
  kuarps: number; // engine speed
  crew: number;
  /** insurance risk multiplier (1 = average) */
  risk: number;
}

export const SHIPS: readonly ShipDef[] = [
  { id: 1, name: 'Stinger XII', cargo: 100, seats: 8, fuel: 20, kuarps: 7, crew: 4, risk: 1.0 },
  { id: 2, name: 'Fly Catcher', cargo: 120, seats: 8, fuel: 40, kuarps: 5, crew: 5, risk: 1.1 },
  { id: 3, name: 'Le Rock', cargo: 80, seats: 8, fuel: 65, kuarps: 5, crew: 3, risk: 0.6 },
  { id: 4, name: 'Whaler 2000', cargo: 130, seats: 11, fuel: 50, kuarps: 2, crew: 6, risk: 1.2 },
  { id: 5, name: 'Retina', cargo: 100, seats: 6, fuel: 40, kuarps: 5, crew: 3, risk: 0.9 },
  { id: 6, name: 'Cerebralis', cargo: 100, seats: 8, fuel: 40, kuarps: 5, crew: 4, risk: 1.0 },
  { id: 7, name: 'The Globulizer', cargo: 80, seats: 7, fuel: 30, kuarps: 7, crew: 4, risk: 1.1 },
  { id: 8, name: 'Locomotis', cargo: 110, seats: 5, fuel: 40, kuarps: 6, crew: 4, risk: 1.0 },
  { id: 9, name: 'Mantagon', cargo: 90, seats: 10, fuel: 40, kuarps: 4, crew: 3, risk: 0.9 },
  { id: 10, name: 'Kegger', cargo: 150, seats: 1, fuel: 35, kuarps: 3, crew: 2, risk: 1.5 },
  { id: 11, name: 'Worm Shuttle', cargo: 75, seats: 16, fuel: 30, kuarps: 6, crew: 12, risk: 0.6 },
  { id: 12, name: 'Squidocity', cargo: 110, seats: 8, fuel: 40, kuarps: 6, crew: 6, risk: 1.0 },
];

export const SHIP_BY_ID = (id: number): ShipDef => SHIPS.find((s) => s.id === id)!;
