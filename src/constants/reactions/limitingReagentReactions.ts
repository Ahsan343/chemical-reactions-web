import { ElementState, LimitingReagentReactionDef } from '../../helper/chemistry/types';
import { MoleculeColors } from '../colors';

export const limitingReagentReactions: LimitingReagentReactionDef[] = [
  {
    id: 'oxalic-acid',
    name: 'Oxalic Acid + Sodium Bicarbonate',
    limitingReactant: {
      formula: 'H₂C₂O₄',
      state: ElementState.Aqueous,
      color: MoleculeColors.B,
    },
    excessReactant: {
      formula: 'NaHCO₃',
      state: ElementState.Solid,
      color: MoleculeColors.E,
      coefficient: 2,
      molarMass: 84,
    },
    product: {
      formula: 'Na₂C₂O₄',
      state: ElementState.Aqueous,
      color: MoleculeColors.A,
      molarMass: 134,
    },
    byProducts: [
      { formula: 'H₂O', state: ElementState.Liquid, coefficient: 2 },
      { formula: 'CO₂', state: ElementState.Gaseous, coefficient: 2 },
    ],
    yield: 0.98,
  },
  {
    id: 'nitric-acid',
    name: 'Nitric Acid + Sodium Hydroxide',
    limitingReactant: {
      formula: 'HNO₃',
      state: ElementState.Aqueous,
      color: MoleculeColors.B,
    },
    excessReactant: {
      formula: 'NaOH',
      state: ElementState.Aqueous,
      color: MoleculeColors.E,
      coefficient: 1,
      molarMass: 40,
    },
    product: {
      formula: 'NaNO₃',
      state: ElementState.Aqueous,
      color: 'rgb(0, 0, 0)', // iOS .black
      molarMass: 85,
    },
    byProducts: [
      { formula: 'H₂O', state: ElementState.Liquid, coefficient: 1 },
    ],
    yield: 0.96,
  },
];
