import { type ReactNode, useRef, useCallback } from 'react';
import { Beaker, type BeakerProps } from './Beaker';
import styles from './Beaker.module.scss';

interface FillableBeakerProps extends Omit<BeakerProps, 'liquidLevel'> {
  /** Current water level from 0 to 1 */
  waterLevel: number;
  /** Called when the slider changes the water level */
  onWaterLevelChange: (level: number) => void;
  /** Whether the slider is disabled */
  disabled?: boolean;
  /** Minimum slider value (iOS parity: 0.1 for precipitation). Defaults to 0. */
  minWaterLevel?: number;
  /** Maximum slider value (iOS parity: 0.7 for precipitation). Defaults to 1. */
  maxWaterLevel?: number;
  /** Formats the slider value label. Defaults to showing the raw level in liters. */
  formatValue?: (value: number) => string;
  /** Content rendered inside the liquid area */
  children?: ReactNode;
}

interface VerticalSliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled: boolean;
  formatValue: (value: number) => string;
}

function VerticalSlider({ value, min, max, onChange, disabled, formatValue }: VerticalSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const range = max - min;
  const fillPct = range === 0 ? 0 : Math.max(0, Math.min(100, ((value - min) / range) * 100));
  const emptyPct = 100 - fillPct;

  const computeValue = useCallback(
    (clientY: number): number => {
      const el = trackRef.current;
      if (!el) return value;
      const rect = el.getBoundingClientRect();
      const fraction = 1 - (clientY - rect.top) / rect.height;
      const clamped = Math.max(0, Math.min(1, fraction));
      return parseFloat((min + clamped * range).toFixed(3));
    },
    [value, min, range],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      dragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      onChange(computeValue(e.clientY));
    },
    [disabled, onChange, computeValue],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current || disabled) return;
      onChange(computeValue(e.clientY));
    },
    [disabled, onChange, computeValue],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  return (
    <div
      ref={trackRef}
      className={`${styles.sliderZone} ${disabled ? styles.sliderZoneDisabled : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label="Water level"
      tabIndex={disabled ? -1 : 0}
    >
      {/* Two-tone vertical track: gray above thumb, orange below */}
      <div className={styles.sliderRail}>
        <div className={styles.sliderRailGray} style={{ flex: Math.max(0.001, emptyPct) }} />
        <div className={styles.sliderRailOrange} style={{ flex: Math.max(0.001, fillPct) }} />
      </div>

      {/* Thumb + value label, positioned at the correct Y along the track */}
      <div
        className={styles.sliderThumbRow}
        style={{ top: `${emptyPct}%` }}
      >
        <span className={styles.sliderValueLabel}>{formatValue(value)}</span>
        <div className={styles.sliderThumb} />
      </div>
    </div>
  );
}

export function FillableBeaker({
  waterLevel,
  onWaterLevelChange,
  disabled = false,
  minWaterLevel = 0,
  maxWaterLevel = 1,
  formatValue = (v: number) => `${v.toFixed(3)}L`,
  children,
  ...beakerProps
}: FillableBeakerProps) {
  const resolvedWaterLevel = Math.max(minWaterLevel, Math.min(maxWaterLevel, waterLevel));

  return (
    <div className={styles.fillableWrapper}>
      <div className={styles.sliderTrack}>
        <VerticalSlider
          value={resolvedWaterLevel}
          min={minWaterLevel}
          max={maxWaterLevel}
          onChange={onWaterLevelChange}
          disabled={disabled}
          formatValue={formatValue}
        />
      </div>
      <Beaker {...beakerProps} liquidLevel={resolvedWaterLevel}>
        {children}
      </Beaker>
    </div>
  );
}

export type { FillableBeakerProps };
export default FillableBeaker;
