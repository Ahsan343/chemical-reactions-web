/**
 * Right-edge floating action button cluster: info (teal), play (red), undo
 * (teal). Mirrors the blueprint slide 37 / thermodynamics-unit6 reference.
 *
 * - Info opens the same info page the LeftSidebar does (small redundancy is
 *   intentional to match blueprint).
 * - Play triggers `onPlay` if provided — wired to the screen's Next/Run.
 *   When the screen says "play is the actionable button" the play button
 *   pulses red, otherwise it's a quieter red.
 * - Undo triggers `onUndo` if provided — wired to the screen's reset/run-again.
 */
import { useState } from 'react';
import styles from './RightActionButtons.module.scss';

interface RightActionButtonsProps {
  onPlay?: () => void;
  onUndo?: () => void;
  /** When true, the play button pulses red (matches "Run simulation" state). */
  playActive?: boolean;
  /** Disable the play button (e.g. mid-animation). */
  playDisabled?: boolean;
  /** Disable the undo button (e.g. before any action taken). */
  undoDisabled?: boolean;
}

export default function RightActionButtons({
  onPlay,
  onUndo,
  playActive = false,
  playDisabled = false,
  undoDisabled = false,
}: RightActionButtonsProps) {
  const [showInfoTip, setShowInfoTip] = useState(false);

  return (
    <div className={styles.cluster} aria-label="Action buttons">
      {/* Info — teal */}
      <button
        type="button"
        className={`${styles.button} ${styles.info}`}
        title="Info"
        aria-label="Info"
        onClick={() => setShowInfoTip((v) => !v)}
      >
        <span className={styles.glyph}>i</span>
      </button>

      {/* Play — red, optionally pulsing when actionable */}
      {onPlay !== undefined && (
        <button
          type="button"
          className={`${styles.button} ${styles.play} ${playActive ? styles.pulse : ''}`}
          title={playActive ? 'Run simulation' : 'Play'}
          aria-label={playActive ? 'Run simulation' : 'Play'}
          onClick={onPlay}
          disabled={playDisabled}
        >
          <svg viewBox="0 0 14 14" className={styles.glyphSvg}>
            <path d="M3 1.5 L11 7 L3 12.5 Z" fill="white" />
          </svg>
        </button>
      )}

      {/* Undo — teal */}
      {onUndo !== undefined && (
        <button
          type="button"
          className={`${styles.button} ${styles.undo}`}
          title="Run again / Reset"
          aria-label="Undo"
          onClick={onUndo}
          disabled={undoDisabled}
        >
          <svg viewBox="0 0 14 14" className={styles.glyphSvg}>
            <path
              d="M3 7 a 4 4 0 1 1 1.5 3.1"
              fill="none"
              stroke="white"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path d="M2 4 L3 7 L6 6" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {showInfoTip && (
        <div className={styles.infoTip} onClick={() => setShowInfoTip(false)}>
          Use the slider to set water volume, then click each reactant
          container to add molecules. Watch the bar chart update in real time.
        </div>
      )}
    </div>
  );
}
