import { useState, useCallback } from 'react';
import styles from './LeftSidebar.module.scss';

/* ── Tip Slider (6 tiers, interactive) ── */

const TIP_TIERS = [
  { price: '$0.99', hearts: 1 },
  { price: '$1.99', hearts: 2 },
  { price: '$2.99', hearts: 3 },
  { price: '$3.99', hearts: 4 },
  { price: '$4.99', hearts: 5 },
  { price: '$5.99', hearts: 6 },
];

/**
 * Pyramid heart layouts matching iOS:
 * 1: [♥]          2: [♥♥]        3: [♥]         4: [♥♥]        5: [♥♥]         6: [♥♥♥]
 *                                    [♥♥]           [♥♥]           [♥♥♥]           [♥♥♥]
 */
function HeartGroup({ count, filled }: { count: number; filled: boolean }) {
  const h = filled ? '♥' : '♡';
  const cls = filled ? styles.heartFilled : styles.heartOutline;

  /* Build rows for pyramid layout */
  const rows: number[][] = [];
  if (count === 1) rows.push([1]);
  else if (count === 2) rows.push([1, 1]);
  else if (count === 3) { rows.push([1]); rows.push([1, 1]); }
  else if (count === 4) { rows.push([1, 1]); rows.push([1, 1]); }
  else if (count === 5) { rows.push([1, 1]); rows.push([1, 1, 1]); }
  else if (count === 6) { rows.push([1, 1, 1]); rows.push([1, 1, 1]); }

  return (
    <span className={styles.heartGroup}>
      {rows.map((row, ri) => (
        <span key={ri} className={styles.heartRow}>
          {row.map((_, ci) => (
            <span key={ci} className={cls}>{h}</span>
          ))}
        </span>
      ))}
    </span>
  );
}

function TipSlider() {
  const [tierIndex, setTierIndex] = useState(0);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTierIndex(Number(e.target.value));
  }, []);

  const tier = TIP_TIERS[tierIndex];
  const fillPercent = (tierIndex / (TIP_TIERS.length - 1)) * 100;

  return (
    <div className={styles.tipSection}>
      <div className={styles.tipHearts}>
        {TIP_TIERS.map((t, i) => (
          <button
            key={i}
            className={styles.heartButton}
            onClick={() => setTierIndex(i)}
            aria-label={`Tip ${t.price}`}
          >
            <HeartGroup count={t.hearts} filled={i <= tierIndex} />
          </button>
        ))}
      </div>

      <div className={styles.tipSlider}>
        <div className={styles.tipSliderTrack}>
          <div className={styles.tipSliderFill} style={{ width: `${fillPercent}%` }}>
            <span className={styles.tipThumb} />
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={TIP_TIERS.length - 1}
          step={1}
          value={tierIndex}
          onChange={handleSliderChange}
          className={styles.tipSliderInput}
          aria-label="Tip amount"
        />
      </div>

      <div className={styles.tipAmount}>{tier.price}</div>
      <button
        className={styles.supportButton}
        onClick={() => alert(`Thank you for your support of ${tier.price}! (In-app purchases are not available in the web version.)`)}
      >
        Support
      </button>
      <button
        className={styles.linkTextCenter}
        type="button"
        onClick={() => alert('Restore purchases is not available in the web version.')}
      >
        Restore purchases
      </button>
    </div>
  );
}

/* ── Full-page Info Screen (matches iOS "Hyper learning" + "Support students") ── */

function InfoPage({ onClose }: { onClose: () => void }) {
  return (
    <div className={styles.infoPageOverlay}>
      <div className={styles.infoPage}>
        <button className={styles.backButton} onClick={onClose}>
          ← Back
        </button>

        <div className={styles.infoScroll}>
          {/* Hyper Learning Banner */}
          <div className={styles.heroBanner}>
            {/* Periodic table element */}
            <div className={styles.heroCard}>
              <span className={styles.atomicNumber}>6</span>
              <span className={styles.elementSymbol}>C</span>
              <span className={styles.elementName}>Carbon</span>
              <span className={styles.atomicMass}>12.0107</span>
            </div>
            {/* Atom model */}
            <svg viewBox="0 0 100 100" className={styles.heroAtom}>
              <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
              <circle cx="50" cy="50" r="24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              {/* Electrons */}
              <circle cx="50" cy="12" r="4" fill="#4a6fa5" />
              <circle cx="84" cy="34" r="4" fill="#4a6fa5" />
              <circle cx="16" cy="66" r="4" fill="#4a6fa5" />
              <circle cx="50" cy="88" r="4" fill="#4a6fa5" />
              {/* Nucleus */}
              <circle cx="44" cy="44" r="8" fill="#87b5d6" />
              <circle cx="56" cy="44" r="8" fill="#a8c8e8" />
              <circle cx="44" cy="56" r="8" fill="#a8c8e8" />
              <circle cx="56" cy="56" r="8" fill="#87b5d6" />
              <circle cx="50" cy="42" r="8" fill="#c8dce8" />
              <circle cx="50" cy="58" r="8" fill="#c8dce8" />
            </svg>
            {/* Nuclear icon */}
            <svg viewBox="0 0 80 100" className={styles.heroBeaker}>
              <rect x="15" y="0" width="50" height="8" rx="2" fill="#fff" />
              <path d="M20 8 L15 85 Q15 95 25 95 L55 95 Q65 95 65 85 L60 8" fill="#fff" stroke="none" />
              {/* Radiation symbol */}
              <circle cx="40" cy="55" r="5" fill="#4a6fa5" />
              <path d="M40 35 L32 49 L48 49 Z" fill="#4a6fa5" />
              <path d="M25 62 L35 51 L43 63 Z" fill="#4a6fa5" />
              <path d="M55 62 L45 51 L37 63 Z" fill="#4a6fa5" />
            </svg>
          </div>

          <h2 className={styles.sectionTitle}>Hyper learning</h2>

          <p className={styles.bodyText}>
            We are visualizing STEM in ways never before done, and showing
            concepts together to make learning 700% faster or more (Virk,
            2013)<sup>1</sup>. We call it hyper learning, and want to expand it
            to all of chemistry and all of physics and STEM for the students of
            the world with your help!
          </p>

          <p className={styles.bodyText}>
            Based on a cutting edge doctoral dissertation at Columbia University
            and backed by cognition science.
          </p>

          <a
            className={styles.linkText}
            href="https://doi.org/10.7916/D8-XKJR-JT14"
            target="_blank"
            rel="noopener noreferrer"
          >
            1. Open paper in browser.
          </a>

          {/* Support Students Section */}
          <div className={styles.supportBanner}>
            <svg viewBox="0 0 120 100" className={styles.supportIllustration}>
              {/* Person silhouette */}
              <circle cx="60" cy="25" r="14" fill="#6b4c3b" />
              <ellipse cx="60" cy="70" rx="22" ry="28" fill="#f0a830" />
              {/* Heart */}
              <path
                d="M55 58 C52 54 48 56 48 60 C48 64 55 68 55 68 C55 68 62 64 62 60 C62 56 58 54 55 58Z"
                fill="#e04040"
                transform="translate(5, -2)"
              />
            </svg>
          </div>

          <h2 className={styles.sectionTitle}>Support students</h2>

          <p className={styles.bodyText}>
            Tip us to help us support students who can&apos;t afford our
            products. Tips keep us running, pay for our operations and allow us
            to support your products and make new chemistry and physics apps for
            everyone!
          </p>

          <TipSlider />

          <p className={styles.bodyText}>
            If you&apos;re finding this app useful, please consider leaving a
            review to help us grow and reach more students!
          </p>

          <button
            className={styles.linkTextCenter}
            type="button"
            onClick={() => alert('App Store reviews are not available in the web version.')}
          >
            Leave a review on the App Store.
          </button>

          <p className={styles.bodyTextSmall}>
            If you&apos;d like to make a non tax deductible gift to support our
            company and its mission please send an e-mail to info@chem-sims.com.
          </p>

          <p className={styles.bodyTextSmall}>
            Please be aware all tips to our corporation are NOT tax deductible.
          </p>

          <div style={{ height: 40 }} />
        </div>
      </div>
    </div>
  );
}

/* ── Feedback Modal ── */

function FeedbackModal({ onClose }: { onClose: () => void }) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>Send Feedback</h3>
        <div className={styles.modalBody}>
          <p>Please send feedback to info@chem-sims.com.</p>
        </div>
        <button className={styles.modalClose} onClick={onClose}>OK</button>
      </div>
    </div>
  );
}

/* ── Left Sidebar ── */

export default function LeftSidebar() {
  const [showInfo, setShowInfo] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <>
      <div className={styles.sidebar}>
        {/* Email / feedback */}
        <button
          className={styles.iconButton}
          title="Send Feedback"
          aria-label="Send Feedback"
          onClick={() => setShowFeedback(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" className={styles.icon}>
            <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2 7l10 6 10-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Share */}
        <button
          className={styles.iconButton}
          title="Share"
          aria-label="Share"
          onClick={() => {}}
        >
          <svg viewBox="0 0 24 24" fill="none" className={styles.icon}>
            <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>

        {/* Info */}
        <button
          className={styles.iconButton}
          title="Info"
          aria-label="Info"
          onClick={() => setShowInfo(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" className={styles.icon}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 16v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>

      {showInfo && <InfoPage onClose={() => setShowInfo(false)} />}
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </>
  );
}
