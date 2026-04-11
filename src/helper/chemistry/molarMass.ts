import { Metal, MetalAtomicWeights, PrecipitationReactionDef } from './types';

export function getUnknownReactantMolarMass(reaction: PrecipitationReactionDef, metal: Metal): number {
  const { latterPartMolarMass, metalAtomCount } = reaction.unknownReactant;
  return latterPartMolarMass + metalAtomCount * MetalAtomicWeights[metal];
}

export function getRandomMetal(metals: Metal[]): Metal {
  const index = Math.floor(Math.random() * metals.length);
  return metals[index];
}

export function replaceMetalInFormula(template: string, metal: Metal): string {
  return template.replace(/M/g, metal);
}
