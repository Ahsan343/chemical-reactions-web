import { Atom, Molecule } from './types';

export const methane: Molecule = {
  id: 'methane',
  name: 'Methane',
  formula: 'CH₄',
  atoms: [
    { atom: Atom.Carbon, count: 1 },
    { atom: Atom.Hydrogen, count: 4 },
  ],
};

export const dioxygen: Molecule = {
  id: 'dioxygen',
  name: 'Dioxygen',
  formula: 'O₂',
  atoms: [{ atom: Atom.Oxygen, count: 2 }],
};

export const carbonDioxide: Molecule = {
  id: 'carbonDioxide',
  name: 'Carbon Dioxide',
  formula: 'CO₂',
  atoms: [
    { atom: Atom.Carbon, count: 1 },
    { atom: Atom.Oxygen, count: 2 },
  ],
};

export const water: Molecule = {
  id: 'water',
  name: 'Water',
  formula: 'H₂O',
  atoms: [
    { atom: Atom.Hydrogen, count: 2 },
    { atom: Atom.Oxygen, count: 1 },
  ],
};

export const dihydrogen: Molecule = {
  id: 'dihydrogen',
  name: 'Dihydrogen',
  formula: 'H₂',
  atoms: [{ atom: Atom.Hydrogen, count: 2 }],
};

export const dinitrogen: Molecule = {
  id: 'dinitrogen',
  name: 'Dinitrogen',
  formula: 'N₂',
  atoms: [{ atom: Atom.Nitrogen, count: 2 }],
};

export const ammonia: Molecule = {
  id: 'ammonia',
  name: 'Ammonia',
  formula: 'NH₃',
  atoms: [
    { atom: Atom.Nitrogen, count: 1 },
    { atom: Atom.Hydrogen, count: 3 },
  ],
};

export const nitrogenDioxide: Molecule = {
  id: 'nitrogenDioxide',
  name: 'Nitrogen Dioxide',
  formula: 'NO₂',
  atoms: [
    { atom: Atom.Nitrogen, count: 1 },
    { atom: Atom.Oxygen, count: 2 },
  ],
};

export const allMolecules: Molecule[] = [
  methane,
  dioxygen,
  carbonDioxide,
  water,
  dihydrogen,
  dinitrogen,
  ammonia,
  nitrogenDioxide,
];
