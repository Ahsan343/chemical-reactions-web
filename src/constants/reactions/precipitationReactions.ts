import {
  ElementState,
  Metal,
  PrecipitationReactionDef,
} from '../../helper/chemistry/types';
import { PrecipitationColors } from '../colors';

export const precipitationReactions: PrecipitationReactionDef[] = [
  {
    id: 'calcium-carbonate',
    name: 'Carbonate Precipitation',
    knownReactant: {
      formula: 'CaCl₂',
      state: ElementState.Aqueous,
      color: PrecipitationColors.reaction1.knownReactant,
    },
    unknownReactant: {
      formulaTemplate: 'M₂CO₃',
      state: ElementState.Aqueous,
      color: PrecipitationColors.reaction1.unknownReactant,
      latterPartMolarMass: 60,
      metalAtomCount: 2,
      coefficient: 1,
    },
    product: {
      formula: 'CaCO₃',
      state: ElementState.Solid,
      color: PrecipitationColors.reaction1.product,
      molarMass: 100,
    },
    secondaryProduct: {
      formulaTemplate: 'MCl',
      state: ElementState.Aqueous,
      coefficient: 2,
    },
    metals: [Metal.Sodium, Metal.Lithium, Metal.Potassium],
  },
  {
    id: 'lead-iodide',
    name: 'Iodide Precipitation',
    knownReactant: {
      formula: 'Pb(NO₃)₂',
      state: ElementState.Aqueous,
      color: PrecipitationColors.reaction2.knownReactant,
    },
    unknownReactant: {
      formulaTemplate: 'MI',
      state: ElementState.Aqueous,
      color: PrecipitationColors.reaction2.unknownReactant,
      latterPartMolarMass: 127,
      metalAtomCount: 1,
      coefficient: 2,
    },
    product: {
      formula: 'PbI₂',
      state: ElementState.Solid,
      color: PrecipitationColors.reaction2.product,
      molarMass: 334,
    },
    secondaryProduct: {
      formulaTemplate: 'MNO₃',
      state: ElementState.Aqueous,
      coefficient: 2,
    },
    metals: [Metal.Sodium, Metal.Lithium, Metal.Potassium],
  },
];
