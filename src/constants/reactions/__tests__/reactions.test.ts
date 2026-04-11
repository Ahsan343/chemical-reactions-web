import { balancedReactions } from '../balancedReactions';
import { limitingReagentReactions } from '../limitingReagentReactions';
import { precipitationReactions } from '../precipitationReactions';
import { Atom, ElementType, Metal } from '../../../helper/chemistry/types';
import { ReactionBalancer } from '../../../helper/chemistry/reactionBalancer';
import {
  getUnknownReactantMolarMass,
  replaceMetalInFormula,
} from '../../../helper/chemistry/molarMass';

describe('Reactions Data Integrity', () => {
  describe('Balanced Reactions', () => {
    it('should have exactly 5 balanced reactions', () => {
      expect(balancedReactions).toHaveLength(5);
    });

    it('should have unique IDs', () => {
      const ids = balancedReactions.map((r) => r.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(balancedReactions.length);
    });

    it('should have valid names for all reactions', () => {
      balancedReactions.forEach((reaction) => {
        expect(reaction.name).toBeDefined();
        expect(reaction.name.length).toBeGreaterThan(0);
      });
    });

    describe('Combustion of Methane', () => {
      let reaction = balancedReactions[0];

      beforeAll(() => {
        reaction = balancedReactions.find((r) => r.id === 'combustion')!;
      });

      it('should have correct stoichiometry', () => {
        expect(reaction.reactants).toHaveLength(2);
        expect(reaction.products).toHaveLength(2);
      });

      it('should be atom-balanced', () => {
        const balancer = new ReactionBalancer(reaction);

        // CH4 + 2O2 → CO2 + 2H2O
        reaction.reactants.forEach((entry) => {
          for (let i = 0; i < entry.coefficient; i++) {
            balancer.add(entry.molecule, ElementType.Reactant);
          }
        });

        reaction.products.forEach((entry) => {
          for (let i = 0; i < entry.coefficient; i++) {
            balancer.add(entry.molecule, ElementType.Product);
          }
        });

        expect(balancer.isAtomCountsBalanced).toBe(true);

        for (const atom of balancer.allAtoms) {
          expect(balancer.atomIsBalanced(atom)).toBe(true);
        }
      });
    });

    describe('Electrolysis of Water', () => {
      let reaction = balancedReactions[1];

      beforeAll(() => {
        reaction = balancedReactions.find((r) => r.id === 'electrolysis')!;
      });

      it('should be atom-balanced', () => {
        const balancer = new ReactionBalancer(reaction);

        // 2H2O → 2H2 + O2
        reaction.reactants.forEach((entry) => {
          for (let i = 0; i < entry.coefficient; i++) {
            balancer.add(entry.molecule, ElementType.Reactant);
          }
        });

        reaction.products.forEach((entry) => {
          for (let i = 0; i < entry.coefficient; i++) {
            balancer.add(entry.molecule, ElementType.Product);
          }
        });

        expect(balancer.isAtomCountsBalanced).toBe(true);
      });
    });

    describe('Haber Process', () => {
      let reaction = balancedReactions[2];

      beforeAll(() => {
        reaction = balancedReactions.find((r) => r.id === 'haber')!;
      });

      it('should be atom-balanced', () => {
        const balancer = new ReactionBalancer(reaction);

        // N2 + 3H2 → 2NH3
        reaction.reactants.forEach((entry) => {
          for (let i = 0; i < entry.coefficient; i++) {
            balancer.add(entry.molecule, ElementType.Reactant);
          }
        });

        reaction.products.forEach((entry) => {
          for (let i = 0; i < entry.coefficient; i++) {
            balancer.add(entry.molecule, ElementType.Product);
          }
        });

        expect(balancer.isAtomCountsBalanced).toBe(true);
      });
    });

    describe('Nitrogen Oxidation', () => {
      let reaction = balancedReactions[3];

      beforeAll(() => {
        reaction = balancedReactions.find((r) => r.id === 'nitrogenOxidation')!;
      });

      it('should be atom-balanced', () => {
        const balancer = new ReactionBalancer(reaction);

        // 2N2 + 6H2O → 4NH3 + 3O2
        reaction.reactants.forEach((entry) => {
          for (let i = 0; i < entry.coefficient; i++) {
            balancer.add(entry.molecule, ElementType.Reactant);
          }
        });

        reaction.products.forEach((entry) => {
          for (let i = 0; i < entry.coefficient; i++) {
            balancer.add(entry.molecule, ElementType.Product);
          }
        });

        expect(balancer.isAtomCountsBalanced).toBe(true);
      });
    });

    describe('Ostwald Process', () => {
      let reaction = balancedReactions[4];

      beforeAll(() => {
        reaction = balancedReactions.find((r) => r.id === 'ostwald')!;
      });

      it('should be atom-balanced', () => {
        const balancer = new ReactionBalancer(reaction);

        // 4NH3 + 7O2 → 4NO2 + 6H2O
        reaction.reactants.forEach((entry) => {
          for (let i = 0; i < entry.coefficient; i++) {
            balancer.add(entry.molecule, ElementType.Reactant);
          }
        });

        reaction.products.forEach((entry) => {
          for (let i = 0; i < entry.coefficient; i++) {
            balancer.add(entry.molecule, ElementType.Product);
          }
        });

        expect(balancer.isAtomCountsBalanced).toBe(true);
      });
    });

    it('should have all reactions atom-balanced', () => {
      balancedReactions.forEach((reaction) => {
        const balancer = new ReactionBalancer(reaction);

        reaction.reactants.forEach((entry) => {
          for (let i = 0; i < entry.coefficient; i++) {
            balancer.add(entry.molecule, ElementType.Reactant);
          }
        });

        reaction.products.forEach((entry) => {
          for (let i = 0; i < entry.coefficient; i++) {
            balancer.add(entry.molecule, ElementType.Product);
          }
        });

        expect(balancer.isAtomCountsBalanced).toBe(true);
      });
    });
  });

  describe('Limiting Reagent Reactions', () => {
    it('should have exactly 2 limiting reagent reactions', () => {
      expect(limitingReagentReactions).toHaveLength(2);
    });

    it('should have unique IDs', () => {
      const ids = limitingReagentReactions.map((r) => r.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(limitingReagentReactions.length);
    });

    it('should have valid yields (0 < yield < 1)', () => {
      limitingReagentReactions.forEach((reaction) => {
        expect(reaction.yield).toBeGreaterThan(0);
        expect(reaction.yield).toBeLessThan(1);
      });
    });

    it('should have realistic yield values', () => {
      limitingReagentReactions.forEach((reaction) => {
        // Realistic yields are typically 50-99%
        expect(reaction.yield).toBeGreaterThanOrEqual(0.5);
        expect(reaction.yield).toBeLessThanOrEqual(0.99);
      });
    });

    it('should have valid molar masses for products', () => {
      limitingReagentReactions.forEach((reaction) => {
        expect(reaction.product.molarMass).toBeGreaterThan(0);
        expect(reaction.excessReactant.molarMass).toBeGreaterThan(0);
      });
    });

    it('should have positive coefficients for excess reactants', () => {
      limitingReagentReactions.forEach((reaction) => {
        expect(reaction.excessReactant.coefficient).toBeGreaterThan(0);
      });
    });

    it('should have at least one byproduct', () => {
      limitingReagentReactions.forEach((reaction) => {
        expect(reaction.byProducts.length).toBeGreaterThan(0);
      });
    });

    it('should have valid colors for all reactants and products', () => {
      limitingReagentReactions.forEach((reaction) => {
        expect(reaction.limitingReactant.color).toMatch(/^rgb\(/);
        expect(reaction.excessReactant.color).toMatch(/^rgb\(/);
        expect(reaction.product.color).toMatch(/^rgb\(/);
      });
    });

    describe('Oxalic Acid Reaction', () => {
      let reaction = limitingReagentReactions[0];

      beforeAll(() => {
        reaction = limitingReagentReactions.find((r) => r.id === 'oxalic-acid')!;
      });

      it('should have H2C2O4 as limiting reactant', () => {
        expect(reaction.limitingReactant.formula).toBe('H₂C₂O₄');
      });

      it('should have NaHCO3 as excess reactant with coefficient 2', () => {
        expect(reaction.excessReactant.formula).toBe('NaHCO₃');
        expect(reaction.excessReactant.coefficient).toBe(2);
      });

      it('should have Na2C2O4 as product', () => {
        expect(reaction.product.formula).toBe('Na₂C₂O₄');
      });

      it('should have realistic yield around 98%', () => {
        expect(reaction.yield).toBe(0.98);
      });
    });

    describe('Nitric Acid Reaction', () => {
      let reaction = limitingReagentReactions[1];

      beforeAll(() => {
        reaction = limitingReagentReactions.find((r) => r.id === 'nitric-acid')!;
      });

      it('should have HNO3 as limiting reactant', () => {
        expect(reaction.limitingReactant.formula).toBe('HNO₃');
      });

      it('should have NaOH as excess reactant with coefficient 1', () => {
        expect(reaction.excessReactant.formula).toBe('NaOH');
        expect(reaction.excessReactant.coefficient).toBe(1);
      });

      it('should have NaNO3 as product', () => {
        expect(reaction.product.formula).toBe('NaNO₃');
      });

      it('should have realistic yield around 96%', () => {
        expect(reaction.yield).toBe(0.96);
      });
    });
  });

  describe('Precipitation Reactions', () => {
    it('should have exactly 2 precipitation reactions', () => {
      expect(precipitationReactions).toHaveLength(2);
    });

    it('should have unique IDs', () => {
      const ids = precipitationReactions.map((r) => r.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(precipitationReactions.length);
    });

    it('should have valid product molar masses', () => {
      precipitationReactions.forEach((reaction) => {
        expect(reaction.product.molarMass).toBeGreaterThan(0);
      });
    });

    it('should include all three metals', () => {
      precipitationReactions.forEach((reaction) => {
        expect(reaction.metals).toContain(Metal.Sodium);
        expect(reaction.metals).toContain(Metal.Lithium);
        expect(reaction.metals).toContain(Metal.Potassium);
      });
    });

    it('should have valid colors for known and unknown reactants', () => {
      precipitationReactions.forEach((reaction) => {
        expect(reaction.knownReactant.color).toBeDefined();
        expect(reaction.unknownReactant.color).toBeDefined();
        expect(reaction.product.color).toBeDefined();
      });
    });

    it('should have valid metalAtomCount for unknown reactants', () => {
      precipitationReactions.forEach((reaction) => {
        expect(reaction.unknownReactant.metalAtomCount).toBeGreaterThan(0);
      });
    });

    it('should have valid latterPartMolarMass', () => {
      precipitationReactions.forEach((reaction) => {
        expect(reaction.unknownReactant.latterPartMolarMass).toBeGreaterThan(0);
      });
    });

    describe('Carbonate Precipitation', () => {
      let reaction = precipitationReactions[0];

      beforeAll(() => {
        reaction = precipitationReactions.find((r) => r.id === 'calcium-carbonate')!;
      });

      it('should have CaCl2 as known reactant', () => {
        expect(reaction.knownReactant.formula).toBe('CaCl₂');
      });

      it('should have M2CO3 as unknown reactant template', () => {
        expect(reaction.unknownReactant.formulaTemplate).toBe('M₂CO₃');
      });

      it('should produce CaCO3 precipitate', () => {
        expect(reaction.product.formula).toBe('CaCO₃');
        expect(reaction.product.molarMass).toBe(100);
      });

      it('should have metalAtomCount = 2 for carbonates', () => {
        expect(reaction.unknownReactant.metalAtomCount).toBe(2);
      });

      it('should have correct CO3 molar mass contribution', () => {
        expect(reaction.unknownReactant.latterPartMolarMass).toBe(60);
      });

      it('should have secondary product MCl template', () => {
        expect(reaction.secondaryProduct.formulaTemplate).toBe('MCl');
      });

      it('should calculate correct molar mass for all metals', () => {
        const sodium = getUnknownReactantMolarMass(reaction, Metal.Sodium);
        expect(sodium).toBe(106); // 2*23 + 60

        const lithium = getUnknownReactantMolarMass(reaction, Metal.Lithium);
        expect(lithium).toBe(74); // 2*7 + 60

        const potassium = getUnknownReactantMolarMass(reaction, Metal.Potassium);
        expect(potassium).toBe(138); // 2*39 + 60
      });
    });

    describe('Iodide Precipitation', () => {
      let reaction = precipitationReactions[1];

      beforeAll(() => {
        reaction = precipitationReactions.find((r) => r.id === 'lead-iodide')!;
      });

      it('should have Pb(NO3)2 as known reactant', () => {
        expect(reaction.knownReactant.formula).toBe('Pb(NO₃)₂');
      });

      it('should have MI as unknown reactant template', () => {
        expect(reaction.unknownReactant.formulaTemplate).toBe('MI');
      });

      it('should produce PbI2 precipitate', () => {
        expect(reaction.product.formula).toBe('PbI₂');
        expect(reaction.product.molarMass).toBe(334);
      });

      it('should have metalAtomCount = 1 for iodides', () => {
        expect(reaction.unknownReactant.metalAtomCount).toBe(1);
      });

      it('should have correct iodine molar mass', () => {
        expect(reaction.unknownReactant.latterPartMolarMass).toBe(127);
      });

      it('should have secondary product MNO3 template', () => {
        expect(reaction.secondaryProduct.formulaTemplate).toBe('MNO₃');
      });

      it('should calculate correct molar mass for all metals', () => {
        const sodium = getUnknownReactantMolarMass(reaction, Metal.Sodium);
        expect(sodium).toBe(150); // 23 + 127

        const lithium = getUnknownReactantMolarMass(reaction, Metal.Lithium);
        expect(lithium).toBe(134); // 7 + 127

        const potassium = getUnknownReactantMolarMass(reaction, Metal.Potassium);
        expect(potassium).toBe(166); // 39 + 127
      });
    });

    it('should generate valid formulas after metal substitution', () => {
      precipitationReactions.forEach((reaction) => {
        [Metal.Sodium, Metal.Lithium, Metal.Potassium].forEach((metal) => {
          const formula = replaceMetalInFormula(
            reaction.unknownReactant.formulaTemplate,
            metal,
          );
          expect(formula).not.toContain('M');
          expect(formula.length).toBeGreaterThan(0);
        });
      });
    });

    it('should generate valid secondary product formulas', () => {
      precipitationReactions.forEach((reaction) => {
        [Metal.Sodium, Metal.Lithium, Metal.Potassium].forEach((metal) => {
          const formula = replaceMetalInFormula(
            reaction.secondaryProduct.formulaTemplate,
            metal,
          );
          expect(formula).not.toContain('M');
          expect(formula.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Cross-Reaction Consistency', () => {
    it('should reuse common molecules across reactions', () => {
      // Water and other common molecules are reused across reactions
      const moleculeIds = new Map<string, number>();

      balancedReactions.forEach((reaction) => {
        reaction.reactants.forEach((entry) => {
          moleculeIds.set(entry.molecule.id, (moleculeIds.get(entry.molecule.id) || 0) + 1);
        });

        reaction.products.forEach((entry) => {
          moleculeIds.set(entry.molecule.id, (moleculeIds.get(entry.molecule.id) || 0) + 1);
        });
      });

      // Water should appear multiple times
      expect(moleculeIds.get('water')).toBeGreaterThan(1);
      expect(moleculeIds.get('ammonia')).toBeGreaterThan(1);
    });

    it('should maintain consistent molecule definitions across reactions', () => {
      const moleculeMap = new Map<string, any>();

      balancedReactions.forEach((reaction) => {
        [...reaction.reactants, ...reaction.products].forEach((entry) => {
          const id = entry.molecule.id;
          if (moleculeMap.has(id)) {
            // Check that the molecule definition is identical
            const existing = moleculeMap.get(id);
            expect(entry.molecule.id).toBe(existing.id);
            expect(entry.molecule.name).toBe(existing.name);
            expect(entry.molecule.formula).toBe(existing.formula);
          } else {
            moleculeMap.set(id, entry.molecule);
          }
        });
      });
    });
  });
});
