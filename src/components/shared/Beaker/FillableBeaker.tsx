import { type ChangeEvent, type ReactNode } from 'react';
import { Beaker, type BeakerProps } from './Beaker';
import styles from './Beaker.module.scss';

interface FillableBeakerProps extends Omit<BeakerProps, 'liquidLevel'> {
  /** Current water level from 0 to 1 */
  waterLevel: number;
  /** Called when the slider changes the water level */
  onWaterLevelChange: (level: number) => void;
  /** Whether the slider is disabled */
  disabled?: boolean;
  /** Content rendered inside the liquid area */
  children?: ReactNode;
}

export function FillableBeaker({
  waterLevel,
  onWaterLevelChange,
  disabled = false,
  children,
  ...beakerProps
}: FillableBeakerProps) {
  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    onWaterLevelChange(parseFloat(e.target.value));
  };

  return (
    <div className={styles.fillableWrapper}>
      <div className={styles.sliderTrack}>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={waterLevel}
          onChange={handleSliderChange}
          disabled={disabled}
          className={styles.verticalSlider}
          aria-label="Water level"
        />
      </div>
      <Beaker {...beakerProps} liquidLevel={waterLevel}>
        {children}
      </Beaker>
    </div>
  );
}

export type { FillableBeakerProps };
export default FillableBeaker;
