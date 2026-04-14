import { useState, useCallback, useEffect, useRef, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './BranchMenu.module.scss';

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 12L12 4l8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12v7a1 1 0 0 0 1 1h4V14h4v6h4a1 1 0 0 0 1-1v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BalancedIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="3" width="4" height="13" rx="1" fill="currentColor" />
      <rect x="3" y="15" width="18" height="3" rx="1.5" fill="currentColor" />
      <circle cx="6" cy="16.5" r="1.5" fill="currentColor" />
      <circle cx="18" cy="16.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

function FlaskIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 3h8v8l4 8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1l4-8V3z" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <rect x="10" y="2" width="4" height="3" rx="1" fill="currentColor" />
    </svg>
  );
}

function BeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3h14v2H7v16a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V5" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <circle cx="9" cy="17" r="1.2" fill="currentColor" />
      <circle cx="14" cy="15" r="1.2" fill="currentColor" />
    </svg>
  );
}

interface SubUnit {
  label: string;
  route: string;
  exploreRoute: string;
  filingCabinetRoute: string;
  Icon: () => ReactElement;
}

const SUB_UNITS: SubUnit[] = [
  {
    label: 'Balanced Reactions',
    route: '/balanced',
    exploreRoute: '/balanced?mode=explore',
    filingCabinetRoute: '/filing-cabinet/balanced',
    Icon: BalancedIcon,
  },
  {
    label: 'Limiting Reagent',
    route: '/limiting',
    exploreRoute: '/limiting?mode=explore',
    filingCabinetRoute: '/filing-cabinet/limiting',
    Icon: FlaskIcon,
  },
  {
    label: 'Precipitation',
    route: '/precipitation',
    exploreRoute: '/precipitation?mode=explore',
    filingCabinetRoute: '/filing-cabinet/precipitation',
    Icon: BeakerIcon,
  },
];

interface BranchMenuProps {
  currentRoute: string;
}

export default function BranchMenu({ currentRoute }: BranchMenuProps) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const togglePanel = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!expanded) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (wrapperRef.current && event.target instanceof Node && !wrapperRef.current.contains(event.target)) {
        setExpanded(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [expanded]);

  const isActive = (route: string) => currentRoute === route;

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button
        type="button"
        className={styles.toggle}
        onClick={togglePanel}
        aria-label={expanded ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={expanded}
      >
        <span className={styles.hamburgerLine} />
        <span className={styles.hamburgerLine} />
        <span className={styles.hamburgerLine} />
      </button>

      <nav
        className={`${styles.panel} ${expanded ? styles.panelOpen : ''}`}
        aria-hidden={!expanded}
      >
        <ul className={styles.navList}>
          {SUB_UNITS.map((unit) => (
            <li key={unit.route} className={styles.navItem}>
              <button
                type="button"
                className={`${styles.navButton} ${isActive(unit.route) ? styles.navButtonActive : ''}`}
                onClick={() => {
                  navigate(unit.route);
                  setExpanded(false);
                }}
              >
                <span
                  className={styles.navIcon}
                  style={{
                    color: isActive(unit.route) ? 'rgb(220, 84, 59)' : 'rgb(68, 150, 247)',
                  }}
                >
                  <unit.Icon />
                </span>
                <span className={styles.navLabel}>{unit.label}</span>
              </button>

              <button
                type="button"
                className={styles.exploreButton}
                onClick={() => {
                  navigate(unit.exploreRoute);
                  setExpanded(false);
                }}
                aria-label={`Free Explore for ${unit.label}`}
                title="Free Explore"
              >
                <svg
                  className={styles.exploreIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>

              <button
                type="button"
                className={styles.cabinetButton}
                onClick={() => {
                  navigate(unit.filingCabinetRoute);
                  setExpanded(false);
                }}
                aria-label={`Filing cabinet for ${unit.label}`}
              >
                <svg
                  className={styles.cabinetIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="3" y="2" width="18" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="10" y="6" width="4" height="2" rx="0.5" stroke="currentColor" strokeWidth="1" />
                  <rect x="10" y="16" width="4" height="2" rx="0.5" stroke="currentColor" strokeWidth="1" />
                </svg>
              </button>
            </li>
          ))}
          <li className={styles.navItem} style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => {
                navigate('/');
                setExpanded(false);
              }}
            >
              <span
                className={styles.navIcon}
                style={{ color: 'rgb(97, 147, 201)' }}
              >
                <HomeIcon />
              </span>
              <span className={styles.navLabel}>Home</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
