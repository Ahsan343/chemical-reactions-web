import { Link } from 'react-router-dom';
import styles from './Home.module.scss';

function BalancedIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="6" width="4" height="22" rx="1" fill="#fff" />
      <rect x="6" y="26" width="28" height="4" rx="2" fill="#fff" />
      <rect x="4" y="14" width="12" height="3" rx="1.5" fill="#fff" />
      <rect x="24" y="14" width="12" height="3" rx="1.5" fill="#fff" />
      <circle cx="10" cy="19" r="3" fill="#fff" />
      <circle cx="30" cy="19" r="3" fill="#fff" />
    </svg>
  );
}

function FlaskIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M15 6h10v12l7 14a2 2 0 0 1-1.8 2.8H9.8A2 2 0 0 1 8 32l7-14V6z"
        stroke="#fff"
        strokeWidth="2.5"
        fill="none"
      />
      <rect x="14" y="4" width="12" height="3" rx="1.5" fill="#fff" />
      <rect x="12" y="26" width="16" height="3" rx="1.5" fill="#fff" opacity="0.5" />
    </svg>
  );
}

function BeakerIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 6h24v2H10v22a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4V8"
        stroke="#fff"
        strokeWidth="2.5"
        fill="none"
      />
      <rect x="10" y="24" width="20" height="4" rx="1" fill="#fff" opacity="0.4" />
      <circle cx="16" cy="28" r="2" fill="#fff" opacity="0.6" />
      <circle cx="22" cy="26" r="1.5" fill="#fff" opacity="0.6" />
    </svg>
  );
}

const UNITS = [
  {
    label: 'Balanced Reactions',
    description: 'Explore how chemical equations are balanced by adjusting coefficients.',
    path: '/balanced',
    Icon: BalancedIcon,
    color: 'rgb(8, 168, 232)',
  },
  {
    label: 'Limiting Reagent',
    description: 'Discover which reactant limits a reaction and what remains after.',
    path: '/limiting',
    Icon: FlaskIcon,
    color: 'rgb(225, 132, 19)',
  },
  {
    label: 'Precipitation',
    description: 'See how mixing solutions can produce insoluble precipitates.',
    path: '/precipitation',
    Icon: BeakerIcon,
    color: 'rgb(99, 105, 209)',
  },
] as const;

export default function Home() {
  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
            <path d="M9 3h6v7l5.5 9.5a1.5 1.5 0 0 1-1.3 2.2H4.8a1.5 1.5 0 0 1-1.3-2.2L9 10V3z" stroke="#fff" strokeWidth="1.8" fill="none" />
            <path d="M8 3h8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className={styles.title}>Chemical Reactions</h1>
      </div>
      <p className={styles.subtitle}>Interactive chemistry simulations</p>
      <div className={styles.cardRow}>
        {UNITS.map(({ label, description, path, Icon, color }) => (
          <div key={path} className={styles.card} style={{ cursor: 'default' }}>
            <div className={styles.iconBox} style={{ background: color }}>
              <Icon />
            </div>
            <span className={styles.cardTitle}>{label}</span>
            <span className={styles.cardDescription}>{description}</span>
            <div className={styles.cardButtons}>
              <Link to={path} className={styles.guidedButton} style={{ borderColor: color, color }}>
                Guided
              </Link>
              <Link to={`${path}?mode=explore`} className={styles.exploreButton} style={{ background: color }}>
                Free Explore
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
