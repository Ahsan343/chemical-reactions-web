import {
  getUnknownReactantMolarMass,
  getRandomMetal,
  replaceMetalInFormula,
} from '../molarMass';
import { Metal, MetalAtomicWeights } from '../types';
import { precipitationReactions } from '../../../constants/reactions/precipitationReactions';

describe('molarMass', () => {
  describe('getUnknownReactantMolarMass', () => {
    it('should calculate molar mass with sodium for carbonate precipitation', () => {
      const reaction = precipitationReactions[0]; // M2CO3
      const mass = getUnknownReactantMolarMass(reaction, Metal.Sodium);

      // M2CO3: 2*Na(23) + CO3(60) = 46 + 60 = 106
      expect(mass).toBe(106);
    });

    it('should calculate molar mass with lithium for carbonate precipitation', () => {
      const reaction = precipitationReactions[0]; // M2CO3
      const mass = getUnknownReactantMolarMass(reaction, Metal.Lithium);

      // M2CO3: 2*Li(7) + CO3(60) = 14 + 60 = 74
      expect(mass).toBe(74);
    });

    it('should calculate molar mass with potassium for carbonate precipitation', () => {
      const reaction = precipitationReactions[0]; // M2CO3
      const mass = getUnknownReactantMolarMass(reaction, Metal.Potassium);

      // M2CO3: 2*K(39) + CO3(60) = 78 + 60 = 138
      expect(mass).toBe(138);
    });

    it('should calculate molar mass with sodium for iodide precipitation', () => {
      const reaction = precipitationReactions[1]; // MI
      const mass = getUnknownReactantMolarMass(reaction, Metal.Sodium);

      // MI: Na(23) + I(127) = 23 + 127 = 150
      expect(mass).toBe(150);
    });

    it('should calculate molar mass with lithium for iodide precipitation', () => {
      const reaction = precipitationReactions[1]; // MI
      const mass = getUnknownReactantMolarMass(reaction, Metal.Lithium);

      // MI: Li(7) + I(127) = 7 + 127 = 134
      expect(mass).toBe(134);
    });

    it('should calculate molar mass with potassium for iodide precipitation', () => {
      const reaction = precipitationReactions[1]; // MI
      const mass = getUnknownReactantMolarMass(reaction, Metal.Potassium);

      // MI: K(39) + I(127) = 39 + 127 = 166
      expect(mass).toBe(166);
    });

    it('should handle metalAtomCount > 1 for carbonates', () => {
      const reaction = precipitationReactions[0];
      expect(reaction.unknownReactant.metalAtomCount).toBe(2);

      const mass = getUnknownReactantMolarMass(reaction, Metal.Sodium);
      expect(mass).toBe(2 * 23 + 60);
    });

    it('should handle metalAtomCount = 1 for iodides', () => {
      const reaction = precipitationReactions[1];
      expect(reaction.unknownReactant.metalAtomCount).toBe(1);

      const mass = getUnknownReactantMolarMass(reaction, Metal.Sodium);
      expect(mass).toBe(1 * 23 + 127);
    });

    it('should use correct latterPartMolarMass from reaction definition', () => {
      const reaction = precipitationReactions[0];
      expect(reaction.unknownReactant.latterPartMolarMass).toBe(60);

      const reaction2 = precipitationReactions[1];
      expect(reaction2.unknownReactant.latterPartMolarMass).toBe(127);
    });
  });

  describe('replaceMetalInFormula', () => {
    it('should replace M with Na in template', () => {
      const template = 'M₂CO₃';
      const result = replaceMetalInFormula(template, Metal.Sodium);

      expect(result).toBe('Na₂CO₃');
    });

    it('should replace M with Li in template', () => {
      const template = 'M₂CO₃';
      const result = replaceMetalInFormula(template, Metal.Lithium);

      expect(result).toBe('Li₂CO₃');
    });

    it('should replace M with K in template', () => {
      const template = 'M₂CO₃';
      const result = replaceMetalInFormula(template, Metal.Potassium);

      expect(result).toBe('K₂CO₃');
    });

    it('should replace M in iodide formula', () => {
      const template = 'MI';
      const result = replaceMetalInFormula(template, Metal.Sodium);

      expect(result).toBe('NaI');
    });

    it('should replace multiple M occurrences', () => {
      const template = 'MCl';
      const result = replaceMetalInFormula(template, Metal.Lithium);

      expect(result).toBe('LiCl');
    });

    it('should handle secondary product templates', () => {
      const template = 'MNO₃';
      const result = replaceMetalInFormula(template, Metal.Potassium);

      expect(result).toBe('KNO₃');
    });
  });

  describe('getRandomMetal', () => {
    it('should return one of the provided metals', () => {
      const metals = [Metal.Sodium, Metal.Lithium, Metal.Potassium];
      const result = getRandomMetal(metals);

      expect(metals).toContain(result);
    });

    it('should handle single metal array', () => {
      const metals = [Metal.Sodium];
      const result = getRandomMetal(metals);

      expect(result).toBe(Metal.Sodium);
    });

    it('should be able to return any metal from full array', () => {
      const metals = [Metal.Sodium, Metal.Lithium, Metal.Potassium];
      const results = new Set<Metal>();

      for (let i = 0; i < 100; i++) {
        results.add(getRandomMetal(metals));
      }

      // With 100 iterations, we should get at least 2 different metals
      expect(results.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('MetalAtomicWeights', () => {
    it('should have correct sodium weight', () => {
      expect(MetalAtomicWeights[Metal.Sodium]).toBe(23);
    });

    it('should have correct lithium weight', () => {
      expect(MetalAtomicWeights[Metal.Lithium]).toBe(7);
    });

    it('should have correct potassium weight', () => {
      expect(MetalAtomicWeights[Metal.Potassium]).toBe(39);
    });

    it('should have all three metals defined', () => {
      const metals = [Metal.Sodium, Metal.Lithium, Metal.Potassium];

      metals.forEach((metal) => {
        expect(MetalAtomicWeights[metal]).toBeDefined();
        expect(typeof MetalAtomicWeights[metal]).toBe('number');
        expect(MetalAtomicWeights[metal]).toBeGreaterThan(0);
      });
    });
  });

  describe('precipitation reaction molar masses', () => {
    it('should have valid product molar masses', () => {
      precipitationReactions.forEach((reaction) => {
        expect(reaction.product.molarMass).toBeGreaterThan(0);
        expect(typeof reaction.product.molarMass).toBe('number');
      });
    });

    it('should have consistent carbonate product mass', () => {
      const reaction = precipitationReactions[0]; // CaCO3
      expect(reaction.product.molarMass).toBe(100);
    });

    it('should have consistent iodide product mass', () => {
      const reaction = precipitationReactions[1]; // PbI2
      expect(reaction.product.molarMass).toBe(334);
    });

    it('should have valid latterPartMolarMass for carbonates', () => {
      const reaction = precipitationReactions[0];
      expect(reaction.unknownReactant.latterPartMolarMass).toBe(60); // CO3
    });

    it('should have valid latterPartMolarMass for iodides', () => {
      const reaction = precipitationReactions[1];
      expect(reaction.unknownReactant.latterPartMolarMass).toBe(127); // I
    });
  });
});
