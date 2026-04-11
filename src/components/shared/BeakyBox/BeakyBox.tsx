import { type TextLine, type TextSegment } from '../guide/useGuideStore';
import styles from './BeakyBox.module.scss';

interface BeakyBoxProps {
  statement: TextLine;
  onNext: () => void;
  onBack: () => void;
  canGoNext: boolean;
  showBack: boolean;
  /** Width of the speech bubble in px (default 220) */
  bubbleWidth?: number;
  /** Height of the speech bubble in px (default 120) */
  bubbleHeight?: number;
}

function renderSegment(segment: TextSegment, index: number) {
  let content: React.ReactNode = segment.text;

  if (segment.bold) {
    content = <strong>{content}</strong>;
  }
  if (segment.subscript) {
    content = <sub>{content}</sub>;
  }
  if (segment.superscript) {
    content = <sup>{content}</sup>;
  }

  return (
    <span
      key={index}
      className={styles.segment}
      style={segment.color ? { color: segment.color } : undefined}
    >
      {content}
    </span>
  );
}

export default function BeakyBox({
  statement,
  onNext,
  onBack,
  canGoNext,
  showBack,
  bubbleWidth = 220,
  bubbleHeight = 120,
}: BeakyBoxProps) {
  const stemWidth = bubbleWidth * 0.15;
  const stemHeight = stemWidth * 1.1;
  const stemCornerRadius = stemWidth * 0.3;
  const bubbleFontSize = bubbleWidth * 0.06;
  const beakyHeight = bubbleWidth * 0.4;
  const navButtonSize = bubbleHeight * 0.2;
  const cornerRadius = bubbleWidth * 0.1;
  const bodyWidth = bubbleWidth - stemWidth;

  const nextButtonWidth = Math.min(
    0.9 * (bubbleWidth - stemWidth - navButtonSize),
    3.2 * navButtonSize
  );

  const controlsWidth = bubbleWidth - stemWidth;

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <div
          className={styles.bubble}
          style={{
            width: bodyWidth,
            minHeight: bubbleHeight,
            borderRadius: cornerRadius,
            fontSize: Math.max(bubbleFontSize, 11),
            padding: Math.min(bodyWidth, bubbleHeight) * 0.06,
          }}
        >
          <p className={styles.bubbleText}>
            {statement.map((segment, i) => renderSegment(segment, i))}
          </p>

          <div className={styles.bubbleStem}>
            <svg
              className={styles.bubbleStemSvg}
              width={stemWidth}
              height={stemHeight}
              viewBox={`0 0 ${stemWidth} ${stemHeight}`}
            >
              <path
                d={buildStemPath(stemWidth, stemHeight, stemCornerRadius)}
                fill="rgb(232, 232, 232)"
              />
            </svg>
          </div>
        </div>

        <div
          className={styles.avatar}
          style={{ height: beakyHeight, width: beakyHeight * 0.7 }}
          aria-hidden="true"
        >
          <img
            className={styles.avatarImg}
            src="/beaky.png"
            alt="Beaky character"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
      </div>

      <div className={styles.controls} style={{ width: controlsWidth }}>
        {showBack && (
          <button
            type="button"
            className={styles.backButton}
            onClick={onBack}
            aria-label="Previous"
            style={{ width: navButtonSize, height: navButtonSize }}
          >
            <svg
              className={styles.backIcon}
              width={navButtonSize * 0.5}
              height={navButtonSize * 0.5}
              viewBox="0 0 12 12"
            >
              <path d="M8 1L3 6l5 5" fill="#000" />
            </svg>
          </button>
        )}
        {!showBack && <div />}
        <button
          type="button"
          className={styles.nextButton}
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Next"
          style={{
            width: nextButtonWidth,
            height: navButtonSize,
            fontSize: navButtonSize * 0.6,
            borderWidth: navButtonSize * 0.08,
          }}
        >
          <span
            className={styles.nextLabel}
            style={{
              width: nextButtonWidth - 1.5 * navButtonSize,
              fontSize: navButtonSize * 0.6,
            }}
          >
            Next
          </span>
          <span
            className={styles.nextIcon}
            style={{ width: navButtonSize, height: navButtonSize }}
          >
            <svg
              className={styles.nextIconSvg}
              width={navButtonSize * 0.4}
              height={navButtonSize * 0.4}
              viewBox="0 0 12 12"
            >
              <path d="M4 1l5 5-5 5" fill="rgb(232, 232, 232)" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}

function buildStemPath(w: number, h: number, cr: number): string {
  // Triangular stem pointing right, with a small corner radius at top
  // Matches iOS SpeechBubbleStem shape
  return [
    `M 0 ${h}`,
    `L ${w} ${cr}`,
    `L ${cr} ${cr}`,
    `Q 0 ${cr} 0 0`,
    'Z',
  ].join(' ');
}
