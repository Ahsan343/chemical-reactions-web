import styles from './BeakerToggle.module.scss';

type BeakerView = 'microscopic' | 'macroscopic';

interface BeakerToggleProps {
  view: BeakerView;
  onChange: (view: BeakerView) => void;
  disabled: boolean;
}

export default function BeakerToggle({ view, onChange, disabled }: BeakerToggleProps) {
  return (
    <div
      className={`${styles.toggle} ${disabled ? styles.disabled : ''}`}
      role="radiogroup"
      aria-label="Beaker view mode"
    >
      <button
        type="button"
        role="radio"
        aria-checked={view === 'microscopic'}
        className={`${styles.option} ${view === 'microscopic' ? styles.selected : ''}`}
        onClick={() => onChange('microscopic')}
        disabled={disabled}
      >
        Microscopic
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={view === 'macroscopic'}
        className={`${styles.option} ${view === 'macroscopic' ? styles.selected : ''}`}
        onClick={() => onChange('macroscopic')}
        disabled={disabled}
      >
        Macroscopic
      </button>
    </div>
  );
}
