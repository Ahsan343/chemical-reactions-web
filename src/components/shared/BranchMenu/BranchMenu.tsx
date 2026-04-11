import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './BranchMenu.module.scss';

interface SubUnit {
  label: string;
  route: string;
  exploreRoute: string;
  filingCabinetRoute: string;
}

const SUB_UNITS: SubUnit[] = [
  {
    label: 'Balanced Reactions',
    route: '/balanced',
    exploreRoute: '/balanced?mode=explore',
    filingCabinetRoute: '/filing-cabinet/balanced',
  },
  {
    label: 'Limiting Reagent',
    route: '/limiting',
    exploreRoute: '/limiting?mode=explore',
    filingCabinetRoute: '/filing-cabinet/limiting',
  },
  {
    label: 'Precipitation',
    route: '/precipitation',
    exploreRoute: '/precipitation?mode=explore',
    filingCabinetRoute: '/filing-cabinet/precipitation',
  },
];

interface BranchMenuProps {
  currentRoute: string;
}

export default function BranchMenu({ currentRoute }: BranchMenuProps) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const togglePanel = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const isActive = (route: string) => currentRoute === route;

  return (
    <div className={styles.wrapper}>
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
                    backgroundColor: isActive(unit.route)
                      ? 'rgb(220, 84, 59)'
                      : 'rgb(68, 150, 247)',
                  }}
                />
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
                style={{ backgroundColor: 'rgb(97, 147, 201)' }}
              />
              <span className={styles.navLabel}>Home</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
