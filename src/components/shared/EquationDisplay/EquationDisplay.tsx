import styles from './EquationDisplay.module.scss';

export interface EquationSegment {
  text: string;
  isSubscript?: boolean;
  isState?: boolean;
  isCoefficient?: boolean;
  emphasize?: boolean;
}

interface EquationDisplayProps {
  segments: EquationSegment[];
}

function renderSegment(segment: EquationSegment, index: number) {
  const classes: string[] = [];

  if (segment.isState) classes.push(styles.state);
  if (segment.isCoefficient) classes.push(styles.coefficient);
  if (segment.emphasize) classes.push(styles.emphasize);

  if (segment.isSubscript) {
    return (
      <sub key={index} className={classes.join(' ') || undefined}>
        {segment.text}
      </sub>
    );
  }

  return (
    <span key={index} className={classes.join(' ') || undefined}>
      {segment.text}
    </span>
  );
}

export default function EquationDisplay({ segments }: EquationDisplayProps) {
  return (
    <div className={styles.equation} role="math">
      {segments.map((segment, i) => renderSegment(segment, i))}
    </div>
  );
}
