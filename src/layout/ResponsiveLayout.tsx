import { useEffect, useState, ReactNode } from 'react';
import styles from './ResponsiveLayout.module.scss';

interface Props {
  children: ReactNode;
}

export function ResponsiveLayout({ children }: Props) {
  const [scale, setScale] = useState(1);
  const [isPortrait, setIsPortrait] = useState(false);
  const [dims, setDims] = useState({ w: 1420, h: 780 });

  useEffect(() => {
    function updateScale() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const scaleX = w / 1420;
      const scaleY = h / 780;
      setScale(Math.min(scaleX, scaleY, 1));
      setIsPortrait(w < h && w < 1024);
      setDims({ w, h });
    }
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div className={styles.container}>
      {isPortrait && (
        <div className={styles.portraitWarning}>
          <div className={styles.portraitContent}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="4" width="32" height="40" rx="4" stroke="white" strokeWidth="2" fill="none" />
              <path d="M20 38h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <path d="M36 20l6-6M36 20l-6-6" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p>Please rotate your device to landscape mode for the best experience.</p>
          </div>
        </div>
      )}
      <div
        className={styles.scaler}
        style={{
          transform: `scale(${scale})`,
          width: dims.w / scale,
          height: dims.h / scale,
        }}
      >
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}
