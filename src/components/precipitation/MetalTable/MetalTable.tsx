import { Metal, type PrecipitationReactionDef } from '../../../helper/chemistry/types';
import { getUnknownReactantMolarMass, replaceMetalInFormula } from '../../../helper/chemistry/molarMass';
import styles from './MetalTable.module.scss';

interface MetalTableProps {
  reaction: PrecipitationReactionDef;
  revealedMetal: Metal | null;
  showHighlight: boolean;
}

const METALS = [Metal.Sodium, Metal.Lithium, Metal.Potassium];

export default function MetalTable({ reaction, revealedMetal, showHighlight }: MetalTableProps) {
  return (
    <table className={styles.table} aria-label="Metal molar mass reference">
      <thead>
        <tr className={styles.headerRow}>
          <th className={styles.headerCell}>Compound</th>
          <th className={styles.headerCell}>Molar Mass (g/mol)</th>
        </tr>
      </thead>
      <tbody>
        {METALS.map((metal, index) => {
          const isCorrect = showHighlight && revealedMetal === metal;
          const formula = replaceMetalInFormula(reaction.unknownReactant.formulaTemplate, metal);
          const molarMass = getUnknownReactantMolarMass(reaction, metal);
          const isOdd = index % 2 === 0;

          return (
            <tr
              key={metal}
              className={`${styles.row} ${isOdd ? styles.oddRow : styles.evenRow} ${isCorrect ? styles.highlighted : ''}`}
            >
              <td className={styles.cell}>{formula}</td>
              <td className={styles.cell}>{molarMass}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
