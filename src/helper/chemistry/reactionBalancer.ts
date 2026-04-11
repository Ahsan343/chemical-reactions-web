import { Atom, BalancedReactionDef, ElementType, Molecule } from './types';

interface MoleculeEntry {
  molecule: Molecule;
  count: number;
}

export class ReactionBalancer {
  private readonly reaction: BalancedReactionDef;
  private reactants: Map<string, MoleculeEntry> = new Map();
  private products: Map<string, MoleculeEntry> = new Map();

  constructor(reaction: BalancedReactionDef) {
    this.reaction = reaction;
  }

  add(molecule: Molecule, to: ElementType): void {
    const side = to === ElementType.Reactant ? this.reactants : this.products;
    const existing = side.get(molecule.id);
    if (existing) {
      existing.count += 1;
    } else {
      side.set(molecule.id, { molecule, count: 1 });
    }
  }

  remove(molecule: Molecule, from: ElementType): void {
    const side = from === ElementType.Reactant ? this.reactants : this.products;
    const existing = side.get(molecule.id);
    if (!existing) return;
    existing.count -= 1;
    if (existing.count <= 0) {
      side.delete(molecule.id);
    }
  }

  getMoleculeCount(moleculeId: string, side: ElementType): number {
    const map = side === ElementType.Reactant ? this.reactants : this.products;
    return map.get(moleculeId)?.count ?? 0;
  }

  getMolecule(moleculeId: string): Molecule | null {
    const fromReactants = this.reactants.get(moleculeId)?.molecule;
    if (fromReactants) return fromReactants;
    return this.products.get(moleculeId)?.molecule ?? null;
  }

  getAtomCount(atom: Atom, side: ElementType): number {
    const map = side === ElementType.Reactant ? this.reactants : this.products;
    let total = 0;
    for (const { molecule, count } of Array.from(map.values())) {
      for (const ac of molecule.atoms) {
        if (ac.atom === atom) {
          total += ac.count * count;
        }
      }
    }
    return total;
  }

  atomIsBalanced(atom: Atom): boolean {
    const reactantCount = this.getAtomCount(atom, ElementType.Reactant);
    const productCount = this.getAtomCount(atom, ElementType.Product);
    return reactantCount === productCount && reactantCount > 0;
  }

  get isBalanced(): boolean {
    for (const entry of this.reaction.reactants) {
      if (this.getMoleculeCount(entry.molecule.id, ElementType.Reactant) !== entry.coefficient) {
        return false;
      }
    }
    for (const entry of this.reaction.products) {
      if (this.getMoleculeCount(entry.molecule.id, ElementType.Product) !== entry.coefficient) {
        return false;
      }
    }
    return true;
  }

  get isAtomCountsBalanced(): boolean {
    for (const atom of this.allAtoms) {
      if (!this.atomIsBalanced(atom)) {
        return false;
      }
    }
    return true;
  }

  get isMultipleOfBalanced(): boolean {
    // iOS logic: for each molecule, compute multiple = count / targetCoefficient.
    // All multiples must be the same integer > 1.
    if (!this.isAtomCountsBalanced) {
      return false;
    }

    let commonMultiple: number | null = null;

    // Check reactants
    for (const entry of this.reaction.reactants) {
      const count = this.getMoleculeCount(entry.molecule.id, ElementType.Reactant);
      if (count === 0 || count % entry.coefficient !== 0) return false;
      const multiple = count / entry.coefficient;
      if (commonMultiple === null) {
        commonMultiple = multiple;
      } else if (multiple !== commonMultiple) {
        return false;
      }
    }

    // Check products
    for (const entry of this.reaction.products) {
      const count = this.getMoleculeCount(entry.molecule.id, ElementType.Product);
      if (count === 0 || count % entry.coefficient !== 0) return false;
      const multiple = count / entry.coefficient;
      if (commonMultiple === null) {
        commonMultiple = multiple;
      } else if (multiple !== commonMultiple) {
        return false;
      }
    }

    return commonMultiple !== null && commonMultiple > 1;
  }

  get allAtoms(): Atom[] {
    const atoms = new Set<Atom>();
    const addFromSide = (entries: { molecule: Molecule }[]) => {
      for (const { molecule } of entries) {
        for (const ac of molecule.atoms) {
          atoms.add(ac.atom);
        }
      }
    };
    addFromSide(this.reaction.reactants);
    addFromSide(this.reaction.products);
    return Array.from(atoms);
  }

  getAtomSurplus(atom: Atom): number {
    return this.getAtomCount(atom, ElementType.Product) - this.getAtomCount(atom, ElementType.Reactant);
  }

  reset(): void {
    this.reactants.clear();
    this.products.clear();
  }
}
