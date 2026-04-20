import { type TextLine, type TextSegment } from '../guide/useGuideStore';
import styles from './BeakyBox.module.scss';

interface BeakyBoxProps {
  /** iOS [TextLine] — array of paragraphs, each paragraph is a TextSegment[].
   *  Also accepts a single TextLine (flat segment array) for backward compat. */
  statement: TextLine | TextLine[];
  onNext: () => void;
  onBack: () => void;
  canGoNext: boolean;
  showBack: boolean;
  /** Width of the speech bubble body in px (default 300) */
  bubbleWidth?: number;
  /** Min height of the speech bubble in px (default 160) */
  bubbleHeight?: number;
}

// iOS emphasis color (CorePalette.orangeAccent = rgb(220,84,59))
const EMPHASIS_COLOR = 'rgb(220, 84, 59)';

function renderSegment(segment: TextSegment, index: number, fontSize: number) {
  let content: React.ReactNode = segment.text;

  // iOS: subscript/superscript at 65% of base font, offset ±0.26 * fontSize
  if (segment.subscript) {
    content = (
      <sub style={{ fontSize: fontSize * 0.65 }}>{content}</sub>
    );
  }
  if (segment.superscript) {
    content = (
      <sup style={{ fontSize: fontSize * 0.65 }}>{content}</sup>
    );
  }

  // iOS: emphasis is ONLY a color change to orange — same .regular font weight.
  // The `bold` flag in our TextSegment maps to iOS "emphasised" (color, not weight).
  const emphasisColor = segment.bold ? EMPHASIS_COLOR : undefined;
  const color = segment.color ?? emphasisColor;

  return (
    <span key={index} style={color ? { color } : undefined}>
      {content}
    </span>
  );
}

/**
 * iOS TextLinesView: renders [TextLine] as paragraphs separated by \n\n.
 * Accepts either a single TextLine or TextLine[] (multiple paragraphs).
 */
function renderParagraphs(statement: TextLine | TextLine[], fontSize: number) {
  // Detect if it's a single flat TextLine or array of paragraphs
  const paragraphs: TextLine[] =
    statement.length > 0 && Array.isArray((statement as TextLine[])[0])
      ? (statement as TextLine[])
      : [statement as TextLine];

  return paragraphs.map((line, pIdx) => (
    <p key={pIdx} className={styles.paragraph}>
      {line.map((segment, sIdx) => renderSegment(segment, sIdx, fontSize))}
    </p>
  ));
}

export default function BeakyBox({
  statement,
  onNext,
  onBack,
  canGoNext,
  showBack,
  bubbleWidth = 300,
  bubbleHeight = 160,
}: BeakyBoxProps) {
  // iOS geometry settings
  const cornerRadius = bubbleWidth * 0.1;
  const stemWidth = bubbleWidth * 0.08;
  const stemHeight = stemWidth * 1.1;
  const stemCornerRadius = stemWidth * 0.3;
  const fontSize = Math.max(bubbleWidth * 0.05, 13);
  const beakyHeight = bubbleWidth * 0.3;
  const navButtonSize = Math.max(bubbleHeight * 0.22, 28);
  // iOS: padding = min(width, height) * 0.06
  const padding = Math.max(Math.min(bubbleWidth, bubbleHeight) * 0.06, 12);
  const bodyWidth = bubbleWidth;

  const nextButtonMaxWidth = 0.9 * (bubbleWidth - stemWidth - navButtonSize);
  const nextButtonWidth = Math.min(nextButtonMaxWidth, 3.2 * navButtonSize);
  const controlsWidth = bubbleWidth;

  return (
    <div className={styles.container}>
      {/* Top row: speech bubble + Beaky avatar */}
      <div className={styles.topRow}>
        <div
          className={styles.bubble}
          style={{
            width: bodyWidth,
            minHeight: bubbleHeight,
            borderRadius: cornerRadius,
            fontSize,
            padding,
            marginRight: stemWidth + 4,
          }}
        >
          <div className={styles.bubbleText}>
            {renderParagraphs(statement, fontSize)}
          </div>

          {/* Stem: triangular tail pointing right toward Beaky */}
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

        {/* Beaky character */}
        <div
          className={styles.avatar}
          style={{ height: beakyHeight, width: beakyHeight * 0.542 }}
          aria-hidden="true"
        >
          <img
            className={styles.avatarImg}
            src="/beaky.png"
            alt="Beaky character"
          />
        </div>
      </div>

      {/* Navigation buttons */}
      <div className={styles.controls} style={{ width: controlsWidth }}>
        {showBack ? (
          <button
            type="button"
            className={styles.backButton}
            onClick={onBack}
            aria-label="Go Back"
            style={{ height: navButtonSize }}
          >
            {/* iOS: arrowtriangle.left.fill */}
            <svg
              className={styles.backIcon}
              width={navButtonSize * 0.4}
              height={navButtonSize * 0.4}
              viewBox="0 0 12 12"
            >
              <path d="M9 1L3 6l6 5z" fill="#000" />
            </svg>
            <span
              className={styles.backLabel}
              style={{ fontSize: navButtonSize * 0.45 }}
            >
              Go Back
            </span>
          </button>
        ) : (
          <div style={{ width: navButtonSize }} />
        )}

        <button
          type="button"
          className={styles.nextButton}
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Next"
          style={{
            width: nextButtonWidth,
            height: navButtonSize,
            fontSize: navButtonSize * 0.5,
            borderWidth: Math.max(navButtonSize * 0.07, 1.5),
          }}
        >
          <span
            className={styles.nextLabel}
            style={{ fontSize: navButtonSize * 0.5 }}
          >
            Next
          </span>
          {/* Orange circle with right-arrow on the right side */}
          <span
            className={styles.nextIcon}
            style={{
              width: navButtonSize - 2,
              height: navButtonSize - 2,
              minWidth: navButtonSize - 2,
            }}
          >
            <svg
              className={styles.nextIconSvg}
              width={navButtonSize * 0.32}
              height={navButtonSize * 0.32}
              viewBox="0 0 12 12"
            >
              <path d="M4 1l5 5-5 5z" fill="rgb(232, 232, 232)" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}

/**
 * iOS SpeechBubbleStem shape (from SpeechBubble.swift):
 *   bottomLeft(0, h) → topRight(w, cr) → topPreCurve(cr, cr)
 *   → quadCurve to (0, 0) with control (0, cr)
 * Creates a small curved tail pointing right toward Beaky.
 */
function buildStemPath(w: number, h: number, cr: number): string {
  return [
    `M 0 ${h}`,                    // bottom-left
    `L ${w} ${cr}`,                // top-right (the point toward Beaky)
    `L ${cr} ${cr}`,               // top pre-curve
    `Q 0 ${cr}, 0 0`,             // quad curve back to origin
    'Z',
  ].join(' ');
}
