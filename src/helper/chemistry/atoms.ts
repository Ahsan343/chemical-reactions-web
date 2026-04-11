import { Atom } from './types';
import { AtomColors } from '../../constants/colors';

export interface AtomInfo {
  symbol: string;
  name: string;
  color: string;
}

export const atomInfoMap: Record<Atom, AtomInfo> = {
  [Atom.Carbon]: {
    symbol: 'C',
    name: 'Carbon',
    color: AtomColors.carbon,
  },
  [Atom.Hydrogen]: {
    symbol: 'H',
    name: 'Hydrogen',
    color: AtomColors.hydrogen,
  },
  [Atom.Nitrogen]: {
    symbol: 'N',
    name: 'Nitrogen',
    color: AtomColors.nitrogen,
  },
  [Atom.Oxygen]: {
    symbol: 'O',
    name: 'Oxygen',
    color: AtomColors.oxygen,
  },
};
