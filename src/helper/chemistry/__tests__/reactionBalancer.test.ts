import { ReactionBalancer } from '../reactionBalancer';
import { balancedReactions } from '../../../constants/reactions/balancedReactions';
import { Atom, ElementType } from '../types';
import {
  methane,
  dioxygen,
  carbonDioxide,
  water,
  dihydrogen,
  dinitrogen,
  ammonia,
  nitrogenDioxide,
} from '../molecules';

describe('ReactionBalancer', () => {
  describe('add/remove molecules', () => {
    let balancer: ReactionBalancer;

    beforeEach(() => {
      balancer = new ReactionBalancer(balancedReactions[0]);
    });

    it('should add molecules to reactants', () => {
      balancer.add(methane, ElementType.Reactant);
      balancer.add(methane, ElementType.Reactant);

      expect(balancer.getMoleculeCount(methane.id, ElementType.Reactant)).toBe(2);
    });

    it('should add molecules to products', () => {
      balancer.add(carbonDioxide, ElementType.Product);
      expect(balancer.getMoleculeCount(carbonDioxide.id, ElementType.Product)).toBe(1);
    });

    it('should remove molecules from reactants', () => {
      balancer.add(methane, ElementType.Reactant);
      balancer.add(methane, ElementType.Reactant);
      balancer.remove(methane, ElementType.Reactant);

      expect(balancer.getMoleculeCount(methane.id, ElementType.Reactant)).toBe(1);
    });

    it('should remove molecules from products', () => {
      balancer.add(water, ElementType.Product);
      balancer.add(water, ElementType.Product);
      balancer.add(water, ElementType.Product);
      balancer.remove(water, ElementType.Product);
      balancer.remove(water, ElementType.Product);

      expect(balancer.getMoleculeCount(water.id, ElementType.Product)).toBe(1);
    });

    it('should delete molecule entry when count reaches zero', () => {
      balancer.add(methane, ElementType.Reactant);
      balancer.remove(methane, ElementType.Reactant);

      expect(balancer.getMoleculeCount(methane.id, ElementType.Reactant)).toBe(0);
    });

    it('should not error when removing non-existent molecule', () => {
      expect(() => {
        balancer.remove(methane, ElementType.Reactant);
      }).not.toThrow();
    });

    it('should handle adding molecules of different types', () => {
      balancer.add(methane, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);

      expect(balancer.getMoleculeCount(methane.id, ElementType.Reactant)).toBe(1);
      expect(balancer.getMoleculeCount(dioxygen.id, ElementType.Reactant)).toBe(1);
    });
  });

  describe('atom counting', () => {
    let balancer: ReactionBalancer;

    beforeEach(() => {
      balancer = new ReactionBalancer(balancedReactions[0]); // Combustion of Methane
    });

    it('should count atoms in reactants correctly', () => {
      balancer.add(methane, ElementType.Reactant); // C: 1, H: 4
      balancer.add(dioxygen, ElementType.Reactant); // O: 2

      expect(balancer.getAtomCount(Atom.Carbon, ElementType.Reactant)).toBe(1);
      expect(balancer.getAtomCount(Atom.Hydrogen, ElementType.Reactant)).toBe(4);
      expect(balancer.getAtomCount(Atom.Oxygen, ElementType.Reactant)).toBe(2);
    });

    it('should count atoms in products correctly', () => {
      balancer.add(carbonDioxide, ElementType.Product); // C: 1, O: 2
      balancer.add(water, ElementType.Product); // H: 2, O: 1

      expect(balancer.getAtomCount(Atom.Carbon, ElementType.Product)).toBe(1);
      expect(balancer.getAtomCount(Atom.Hydrogen, ElementType.Product)).toBe(2);
      expect(balancer.getAtomCount(Atom.Oxygen, ElementType.Product)).toBe(3);
    });

    it('should correctly count atoms with multiple molecules', () => {
      balancer.add(methane, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant); // 2 O2 molecules

      expect(balancer.getAtomCount(Atom.Oxygen, ElementType.Reactant)).toBe(4); // 2 + 2
    });

    it('should return zero for atoms not present', () => {
      balancer.add(methane, ElementType.Reactant);

      expect(balancer.getAtomCount(Atom.Nitrogen, ElementType.Reactant)).toBe(0);
    });

    it('should count atoms after removals', () => {
      balancer.add(water, ElementType.Product);
      balancer.add(water, ElementType.Product);
      balancer.remove(water, ElementType.Product);

      expect(balancer.getAtomCount(Atom.Hydrogen, ElementType.Product)).toBe(2);
      expect(balancer.getAtomCount(Atom.Oxygen, ElementType.Product)).toBe(1);
    });
  });

  describe('isBalanced', () => {
    it('should return false for empty balancer', () => {
      const balancer = new ReactionBalancer(balancedReactions[0]);
      expect(balancer.isBalanced).toBe(false);
    });

    it('should return true for combustion of methane when correctly balanced', () => {
      const reaction = balancedReactions[0]; // CH4 + 2O2 → CO2 + 2H2O
      const balancer = new ReactionBalancer(reaction);

      balancer.add(methane, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);

      balancer.add(carbonDioxide, ElementType.Product);
      balancer.add(water, ElementType.Product);
      balancer.add(water, ElementType.Product);

      expect(balancer.isBalanced).toBe(true);
    });

    it('should return true for electrolysis of water', () => {
      const reaction = balancedReactions[1]; // 2H2O → 2H2 + O2
      const balancer = new ReactionBalancer(reaction);

      balancer.add(water, ElementType.Reactant);
      balancer.add(water, ElementType.Reactant);

      balancer.add(dihydrogen, ElementType.Product);
      balancer.add(dihydrogen, ElementType.Product);
      balancer.add(dioxygen, ElementType.Product);

      expect(balancer.isBalanced).toBe(true);
    });

    it('should return true for Haber process', () => {
      const reaction = balancedReactions[2]; // N2 + 3H2 → 2NH3
      const balancer = new ReactionBalancer(reaction);

      balancer.add(dinitrogen, ElementType.Reactant);
      balancer.add(dihydrogen, ElementType.Reactant);
      balancer.add(dihydrogen, ElementType.Reactant);
      balancer.add(dihydrogen, ElementType.Reactant);

      balancer.add(ammonia, ElementType.Product);
      balancer.add(ammonia, ElementType.Product);

      expect(balancer.isBalanced).toBe(true);
    });

    it('should return true for nitrogen oxidation', () => {
      const reaction = balancedReactions[3]; // 2N2 + 6H2O → 4NH3 + 3O2
      const balancer = new ReactionBalancer(reaction);

      balancer.add(dinitrogen, ElementType.Reactant);
      balancer.add(dinitrogen, ElementType.Reactant);
      balancer.add(water, ElementType.Reactant);
      balancer.add(water, ElementType.Reactant);
      balancer.add(water, ElementType.Reactant);
      balancer.add(water, ElementType.Reactant);
      balancer.add(water, ElementType.Reactant);
      balancer.add(water, ElementType.Reactant);

      balancer.add(ammonia, ElementType.Product);
      balancer.add(ammonia, ElementType.Product);
      balancer.add(ammonia, ElementType.Product);
      balancer.add(ammonia, ElementType.Product);
      balancer.add(dioxygen, ElementType.Product);
      balancer.add(dioxygen, ElementType.Product);
      balancer.add(dioxygen, ElementType.Product);

      expect(balancer.isBalanced).toBe(true);
    });

    it('should return true for Ostwald process', () => {
      const reaction = balancedReactions[4]; // 4NH3 + 7O2 → 4NO2 + 6H2O
      const balancer = new ReactionBalancer(reaction);

      balancer.add(ammonia, ElementType.Reactant);
      balancer.add(ammonia, ElementType.Reactant);
      balancer.add(ammonia, ElementType.Reactant);
      balancer.add(ammonia, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);

      balancer.add(nitrogenDioxide, ElementType.Product);
      balancer.add(nitrogenDioxide, ElementType.Product);
      balancer.add(nitrogenDioxide, ElementType.Product);
      balancer.add(nitrogenDioxide, ElementType.Product);
      balancer.add(water, ElementType.Product);
      balancer.add(water, ElementType.Product);
      balancer.add(water, ElementType.Product);
      balancer.add(water, ElementType.Product);
      balancer.add(water, ElementType.Product);
      balancer.add(water, ElementType.Product);

      expect(balancer.isBalanced).toBe(true);
    });

    it('should return false for partially balanced reaction', () => {
      const reaction = balancedReactions[0];
      const balancer = new ReactionBalancer(reaction);

      balancer.add(methane, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant); // Only 1 O2, should be 2

      balancer.add(carbonDioxide, ElementType.Product);
      balancer.add(water, ElementType.Product);
      balancer.add(water, ElementType.Product);

      expect(balancer.isBalanced).toBe(false);
    });
  });

  describe('isMultipleOfBalanced', () => {
    it('should return false if atoms are not balanced', () => {
      const reaction = balancedReactions[0];
      const balancer = new ReactionBalancer(reaction);

      balancer.add(methane, ElementType.Reactant);
      // Missing dioxygen molecules

      expect(balancer.isMultipleOfBalanced).toBe(false);
    });

    it('should return false if atoms are balanced but multiple is 1', () => {
      const reaction = balancedReactions[0];
      const balancer = new ReactionBalancer(reaction);

      balancer.add(methane, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);

      balancer.add(carbonDioxide, ElementType.Product);
      balancer.add(water, ElementType.Product);
      balancer.add(water, ElementType.Product);

      // This is the basic balanced reaction, multiple = 1
      expect(balancer.isMultipleOfBalanced).toBe(false);
    });

    it('should return true if atoms are balanced with multiple = 2', () => {
      const reaction = balancedReactions[0];
      const balancer = new ReactionBalancer(reaction);

      // Double the coefficients: 2CH4 + 4O2 → 2CO2 + 4H2O
      balancer.add(methane, ElementType.Reactant);
      balancer.add(methane, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);

      balancer.add(carbonDioxide, ElementType.Product);
      balancer.add(carbonDioxide, ElementType.Product);
      balancer.add(water, ElementType.Product);
      balancer.add(water, ElementType.Product);
      balancer.add(water, ElementType.Product);
      balancer.add(water, ElementType.Product);

      expect(balancer.isMultipleOfBalanced).toBe(true);
    });

    it('should return true if atoms are balanced with multiple = 3', () => {
      const reaction = balancedReactions[0];
      const balancer = new ReactionBalancer(reaction);

      // Triple the coefficients: 3CH4 + 6O2 → 3CO2 + 6H2O
      for (let i = 0; i < 3; i++) balancer.add(methane, ElementType.Reactant);
      for (let i = 0; i < 6; i++) balancer.add(dioxygen, ElementType.Reactant);
      for (let i = 0; i < 3; i++) balancer.add(carbonDioxide, ElementType.Product);
      for (let i = 0; i < 6; i++) balancer.add(water, ElementType.Product);

      expect(balancer.isMultipleOfBalanced).toBe(true);
    });

    it('should return false if multiples differ across molecules', () => {
      const reaction = balancedReactions[0];
      const balancer = new ReactionBalancer(reaction);

      // Inconsistent: 2CH4, 2O2 (should be 4)
      balancer.add(methane, ElementType.Reactant);
      balancer.add(methane, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);

      balancer.add(carbonDioxide, ElementType.Product);
      balancer.add(carbonDioxide, ElementType.Product);
      balancer.add(water, ElementType.Product);
      balancer.add(water, ElementType.Product);

      expect(balancer.isMultipleOfBalanced).toBe(false);
    });
  });

  describe('atomIsBalanced', () => {
    it('should return true when atom is balanced on both sides', () => {
      const reaction = balancedReactions[0];
      const balancer = new ReactionBalancer(reaction);

      balancer.add(methane, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);

      balancer.add(carbonDioxide, ElementType.Product);
      balancer.add(water, ElementType.Product);
      balancer.add(water, ElementType.Product);

      expect(balancer.atomIsBalanced(Atom.Carbon)).toBe(true);
      expect(balancer.atomIsBalanced(Atom.Hydrogen)).toBe(true);
      expect(balancer.atomIsBalanced(Atom.Oxygen)).toBe(true);
    });

    it('should return false when atom is unbalanced', () => {
      const reaction = balancedReactions[0];
      const balancer = new ReactionBalancer(reaction);

      balancer.add(methane, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant); // Only 1 O2

      balancer.add(carbonDioxide, ElementType.Product);
      balancer.add(water, ElementType.Product);
      balancer.add(water, ElementType.Product);

      expect(balancer.atomIsBalanced(Atom.Oxygen)).toBe(false);
    });

    it('should return false for atoms with zero count', () => {
      const reaction = balancedReactions[0];
      const balancer = new ReactionBalancer(reaction);

      // Empty beaker
      expect(balancer.atomIsBalanced(Atom.Carbon)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle zero molecules', () => {
      const balancer = new ReactionBalancer(balancedReactions[0]);

      expect(balancer.getMoleculeCount(methane.id, ElementType.Reactant)).toBe(0);
      expect(balancer.getAtomCount(Atom.Carbon, ElementType.Reactant)).toBe(0);
      expect(balancer.isBalanced).toBe(false);
    });

    it('should reset state correctly', () => {
      const balancer = new ReactionBalancer(balancedReactions[0]);

      balancer.add(methane, ElementType.Reactant);
      balancer.add(water, ElementType.Product);

      balancer.reset();

      expect(balancer.getMoleculeCount(methane.id, ElementType.Reactant)).toBe(0);
      expect(balancer.getMoleculeCount(water.id, ElementType.Product)).toBe(0);
    });

    it('should handle getMolecule for molecules in reactants', () => {
      const balancer = new ReactionBalancer(balancedReactions[0]);
      balancer.add(methane, ElementType.Reactant);

      expect(balancer.getMolecule(methane.id)).toEqual(methane);
    });

    it('should handle getMolecule for molecules in products', () => {
      const balancer = new ReactionBalancer(balancedReactions[0]);
      balancer.add(water, ElementType.Product);

      expect(balancer.getMolecule(water.id)).toEqual(water);
    });

    it('should return null for non-existent molecule', () => {
      const balancer = new ReactionBalancer(balancedReactions[0]);

      expect(balancer.getMolecule('non-existent-id')).toBeNull();
    });

    it('should calculate atom surplus correctly', () => {
      const reaction = balancedReactions[0];
      const balancer = new ReactionBalancer(reaction);

      balancer.add(methane, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);
      balancer.add(dioxygen, ElementType.Reactant);

      balancer.add(carbonDioxide, ElementType.Product);
      balancer.add(water, ElementType.Product);
      balancer.add(water, ElementType.Product);

      expect(balancer.getAtomSurplus(Atom.Carbon)).toBe(0); // Balanced
      expect(balancer.getAtomSurplus(Atom.Oxygen)).toBe(0); // Balanced
    });

    it('should calculate atom surplus for unbalanced reactions', () => {
      const reaction = balancedReactions[0];
      const balancer = new ReactionBalancer(reaction);

      balancer.add(methane, ElementType.Reactant);
      // Only 1 O2 instead of 2
      balancer.add(dioxygen, ElementType.Reactant);

      balancer.add(carbonDioxide, ElementType.Product);
      balancer.add(water, ElementType.Product);
      balancer.add(water, ElementType.Product);

      // Oxygen surplus: 4 (products) - 2 (reactants) = 2
      expect(balancer.getAtomSurplus(Atom.Oxygen)).toBe(2);
    });
  });

  describe('allAtoms getter', () => {
    it('should return all atoms used in reaction', () => {
      const reaction = balancedReactions[0];
      const balancer = new ReactionBalancer(reaction);

      const allAtoms = balancer.allAtoms;
      expect(allAtoms).toContain(Atom.Carbon);
      expect(allAtoms).toContain(Atom.Hydrogen);
      expect(allAtoms).toContain(Atom.Oxygen);
      expect(allAtoms.length).toBe(3);
    });
  });
});
