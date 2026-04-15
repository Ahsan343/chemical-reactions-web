export enum Atom {
  Carbon = 'Carbon',
  Hydrogen = 'Hydrogen',
  Nitrogen = 'Nitrogen',
  Oxygen = 'Oxygen',
}

export interface AtomCount {
  atom: Atom;
  count: number;
}

export interface Molecule {
  id: string;
  name: string;
  formula: string;
  atoms: AtomCount[];
}

export interface BalancedReactionDef {
  id: string;
  name: string;
  reactants: { molecule: Molecule; coefficient: number }[];
  products: { molecule: Molecule; coefficient: number }[];
}

export enum ElementState {
  Solid = 's',
  Liquid = 'l',
  Aqueous = 'aq',
  Gaseous = 'g',
}

export enum ElementType {
  Reactant = 'Reactant',
  Product = 'Product',
}

export interface LimitingReagentReactionDef {
  id: string;
  name: string;
  limitingReactant: {
    formula: string;
    state: ElementState;
    color: string;
  };
  excessReactant: {
    formula: string;
    state: ElementState;
    color: string;
    coefficient: number;
    molarMass: number;
  };
  product: {
    formula: string;
    state: ElementState;
    color: string;
    molarMass: number;
  };
  byProducts: {
    formula: string;
    state: ElementState;
    coefficient: number;
  }[];
  yield: number;
}

export enum Metal {
  Sodium = 'Na',
  Lithium = 'Li',
  Potassium = 'K',
}

export const MetalAtomicWeights: Record<Metal, number> = {
  [Metal.Sodium]: 23,
  [Metal.Lithium]: 7,
  [Metal.Potassium]: 39,
};

export interface PrecipitationReactionDef {
  id: string;
  name: string;
  knownReactant: {
    formula: string;
    state: ElementState;
    color: string;
  };
  unknownReactant: {
    formulaTemplate: string;
    state: ElementState;
    color: string;
    latterPartMolarMass: number;
    metalAtomCount: number;
    coefficient: number;
  };
  product: {
    formula: string;
    state: ElementState;
    color: string;
    molarMass: number;
  };
  secondaryProduct: {
    formulaTemplate: string;
    state: ElementState;
    coefficient: number;
  };
  metals: Metal[];
}

export type InputState =
  | 'idle'
  | 'selecting'
  | 'entered'
  | 'correct'
  | 'incorrect'
  | 'revealed';
