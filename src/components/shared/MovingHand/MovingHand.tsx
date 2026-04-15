import { useEffect, useState, useRef } from 'react';
import styles from './MovingHand.module.scss';

interface MovingHandProps {
  /** Ref to the element where the hand starts (precipitate in beaker) */
  startRef: React.RefObject<HTMLElement | null>;
  /** Ref to the element where the hand ends (scales) */
  endRef: React.RefObject<HTMLElement | null>;
  /** Delay before showing the hand (seconds). iOS default: 2s */
  showDelay?: number;
  /** Whether conditions are met to show the hand */
  visible: boolean;
}

/**
 * Animated hand that moves from one element to another, guiding the user
 * to drag. Matches iOS MovingHand.swift behavior:
 *   0.25s wait at start → 1s linear move → 0.25s wait at end → repeat
 */
export default function MovingHand({
  startRef,
  endRef,
  showDelay = 2,
  visible,
}: MovingHandProps) {
  const [show, setShow] = useState(false);
  const [positions, setPositions] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delay showing the hand (iOS: 2s after entering weighProduct)
  useEffect(() => {
    if (visible) {
      timerRef.current = setTimeout(() => setShow(true), showDelay * 1000);
    } else {
      setShow(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, showDelay]);

  // Measure positions of start and end elements
  useEffect(() => {
    if (!show) return;

    const measure = () => {
      const startEl = startRef.current;
      const endEl = endRef.current;
      if (!startEl || !endEl) return;

      const startRect = startEl.getBoundingClientRect();
      const endRect = endEl.getBoundingClientRect();

      setPositions({
        startX: startRect.left + startRect.width / 2,
        startY: startRect.top + startRect.height / 2,
        endX: endRect.left + endRect.width / 2,
        endY: endRect.top + endRect.height / 2,
      });
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [show, startRef, endRef]);

  if (!show || !positions) return null;

  const dx = positions.endX - positions.startX;
  const dy = positions.endY - positions.startY;

  return (
    <div
      className={styles.movingHand}
      style={{
        '--hand-start-x': `${positions.startX}px`,
        '--hand-start-y': `${positions.startY}px`,
        '--hand-dx': `${dx}px`,
        '--hand-dy': `${dy}px`,
      } as React.CSSProperties}
    >
      <img
        src="/assets/closedhand.png"
        alt=""
        className={styles.handImage}
        draggable={false}
      />
    </div>
  );
}
