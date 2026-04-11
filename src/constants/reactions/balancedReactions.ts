import { BalancedReactionDef } from '../../helper/chemistry/types';
import {
  methane,
  dioxygen,
  carbonDioxide,
  water,
  dihydrogen,
  dinitrogen,
  ammonia,
  nitrogenDioxide,
} from '../../helper/chemistry/molecules';

export const balancedReactions: BalancedReactionDef[] = [
  {
    id: 'combustion',
    name: 'Combustion of Methane',
    reactants: [
      { molecule: methane, coefficient: 1 },
      { molecule: dioxygen, coefficient: 2 },
    ],
    products: [
      { molecule: carbonDioxide, coefficient: 1 },
      { molecule: water, coefficient: 2 },
    ],
  },
  {
    id: 'electrolysis',
    name: 'Electrolysis of Water',
    reactants: [{ molecule: water, coefficient: 2 }],
    products: [
      { molecule: dihydrogen, coefficient: 2 },
      { molecule: dioxygen, coefficient: 1 },
    ],
  },
  {
    id: 'haber',
    name: 'Haber Process',
    reactants: [
      { molecule: dinitrogen, coefficient: 1 },
      { molecule: dihydrogen, coefficient: 3 },
    ],
    products: [{ molecule: ammonia, coefficient: 2 }],
  },
  {
    id: 'nitrogenOxidation',
    name: 'Nitrogen Oxidation',
    reactants: [
      { molecule: dinitrogen, coefficient: 2 },
      { molecule: water, coefficient: 6 },
    ],
    products: [
      { molecule: ammonia, coefficient: 4 },
      { molecule: dioxygen, coefficient: 3 },
    ],
  },
  {
    id: 'ostwald',
    name: 'Ostwald Process',
    reactants: [
      { molecule: ammonia, coefficient: 4 },
      { molecule: dioxygen, coefficient: 7 },
    ],
    products: [
      { molecule: nitrogenDioxide, coefficient: 4 },
      { molecule: water, coefficient: 6 },
    ],
  },
];
