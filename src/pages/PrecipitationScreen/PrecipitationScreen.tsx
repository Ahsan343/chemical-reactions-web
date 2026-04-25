import { useCallback, useRef, useState, useLayoutEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

import {
  usePrecipitationState,
  type HighlightElement,
  MIN_WATER_LEVEL,
  MAX_WATER_LEVEL,
} from "./hooks/usePrecipitationState";

import { replaceMetalInFormula } from "../../helper/chemistry/molarMass";
import { Metal } from "../../helper/chemistry/types";
import { useCanvasScale } from "../../layout/ResponsiveLayout";

import EquationDisplay, {
  type EquationSegment,
} from "../../components/shared/EquationDisplay/EquationDisplay";
import DropdownSelector from "../../components/shared/DropdownSelector/DropdownSelector";
import BranchMenu from "../../components/shared/BranchMenu/BranchMenu";
import LeftSidebar from "../../components/shared/LeftSidebar/LeftSidebar";
import RightActionButtons from "../../components/shared/RightActionButtons/RightActionButtons";
import { FillableBeaker } from "../../components/shared/Beaker/FillableBeaker";
import { BeakerMoleculeGrid } from "../../components/shared/Beaker/BeakerMoleculeGrid";
import ShakingContainer from "../../components/shared/ShakingContainer/ShakingContainer";
import BeakyBox from "../../components/shared/BeakyBox/BeakyBox";
import { type TextLine } from "../../components/shared/guide/useGuideStore";
import MetalTable from "../../components/precipitation/MetalTable/MetalTable";
import PrecipitateShape from "../../components/precipitation/PrecipitateShape/PrecipitateShape";
import BeakerToggle from "../../components/precipitation/BeakerToggle/BeakerToggle";

import styles from "./PrecipitationScreen.module.scss";

/**
 * iOS HighlightedElements.colorMultiply — returns a CSS filter/style to dim
 * elements that are NOT in the current highlight list.
 * When highlights is empty, everything is bright (no dimming).
 */
function highlightStyle(
  highlights: HighlightElement[],
  element: HighlightElement,
): React.CSSProperties {
  if (highlights.length === 0) return {};
  const isActive = highlights.includes(element);
  return isActive
    ? { transition: "opacity 0.3s ease, filter 0.3s ease" }
    : {
        opacity: 0.35,
        filter: "saturate(0.3)",
        pointerEvents: "none" as const,
        transition: "opacity 0.3s ease, filter 0.3s ease",
      };
}

function buildReactionSegments(
  state: ReturnType<typeof usePrecipitationState>,
): EquationSegment[] {
  const { selectedReaction, metalRevealed, currentMetal } = state;
  if (!selectedReaction) return [];

  const emphasize = !metalRevealed;

  const unknownCoeff =
    selectedReaction.unknownReactant.coefficient > 1
      ? `${selectedReaction.unknownReactant.coefficient}`
      : "";
  const unknownFormula = replaceMetalInFormula(
    selectedReaction.unknownReactant.formulaTemplate,
    metalRevealed ? currentMetal : Metal.Sodium,
  );
  const unknownDisplay = metalRevealed
    ? unknownFormula
    : unknownFormula.replace(/Na|Li|K/g, "M");

  const productFormula = selectedReaction.product.formula;

  const secondaryCoeff =
    selectedReaction.secondaryProduct.coefficient > 1
      ? `${selectedReaction.secondaryProduct.coefficient}`
      : "";
  const secondaryFormula = replaceMetalInFormula(
    selectedReaction.secondaryProduct.formulaTemplate,
    metalRevealed ? currentMetal : Metal.Sodium,
  );
  const secondaryDisplay = metalRevealed
    ? secondaryFormula
    : secondaryFormula.replace(/Na|Li|K/g, "M");

  return [
    { text: `${unknownCoeff}${unknownDisplay}`, emphasize },
    { text: `(${selectedReaction.unknownReactant.state})`, isState: true },
    { text: " + " },
    { text: selectedReaction.knownReactant.formula },
    { text: `(${selectedReaction.knownReactant.state})`, isState: true },
    { text: " \u2192 " },
    { text: productFormula },
    { text: `(${selectedReaction.product.state})`, isState: true },
    { text: " + " },
    { text: `${secondaryCoeff}${secondaryDisplay}`, emphasize },
    { text: `(${selectedReaction.secondaryProduct.state})`, isState: true },
  ];
}

/**
 * iOS [TextLine] — returns array of paragraphs (TextLine[]).
 * Each paragraph is a TextSegment[]. Instruction lines are separate paragraphs in bold/orange.
 */
function getGuideStatement(
  state: ReturnType<typeof usePrecipitationState>,
  explore: boolean,
): TextLine[] {
  if (explore) {
    switch (state.phase) {
      case "chooseReaction":
        return [
          [
            {
              text: "Free Explore: Choose a reaction to begin experimenting freely.",
            },
          ],
        ];
      case "reaction1":
        return [
          [{ text: "The reaction is proceeding. A precipitate is forming..." }],
        ];
      case "revealMetal":
        return [
          [
            { text: "Press Next to reveal the identity of metal " },
            { text: "M", bold: true, color: "rgb(220, 84, 59)" },
            { text: "." },
          ],
        ];
      case "complete":
        return [
          [
            { text: "The metal is " },
            { text: state.currentMetal, bold: true, color: "rgb(220, 84, 59)" },
            { text: "! Experiment complete." },
          ],
        ];
      default:
        return [
          [
            {
              text: "Add reactants freely, adjust water level, then click React to start.",
            },
          ],
        ];
    }
  }
  switch (state.phase) {
    case "chooseReaction":
      return [
        [
          {
            text: "Stoichiometry has various applications. Let's find out more.",
          },
        ],
        [{ text: "Choose a reaction.", bold: true }],
      ];

    // Educational intro (blueprint slide 57)
    case "explainPrecipitation":
      return [
        [
          {
            text: "This is a Precipitation Reaction. How do I know? well, one way is to notice that one of the product is a ",
          },
          { text: "solid (s)", bold: true },
          {
            text: ", so once reaction takes place, this solid will be produced and deposit as a precipitate. In this case ",
          },
          {
            text: state.selectedReaction?.product.formula ?? "CaCO₃",
            bold: true,
          },
        ],
      ];
    // Blueprint slide 58
    case "explainUnknownMetal":
      return [
        [
          {
            text: "But there's something else that is strange about the reaction right? Well, ",
          },
          { text: "M", bold: true, color: "rgb(220, 84, 59)" },
          {
            text: " is not a real element. M in this case represents just an alkaline metal. We will learn how stoichiometry can tell us which one of those 3 components is ",
          },
          { text: "M", bold: true, color: "rgb(220, 84, 59)" },
          { text: "." },
        ],
      ];

    // Blueprint slide 59
    case "setWaterLevel":
      return [
        [
          {
            text: "So this is a reaction that takes place in water, let's set the volume of water in the beaker.",
          },
        ],
        [{ text: "Use the slider to set the volume.", bold: true }],
      ];
    // Blueprint slide 61
    case "addKnown":
      return [
        [
          { text: "Perfect! Now shake " },
          {
            text:
              state.selectedReaction?.knownReactant.formula ?? "known reactant",
            bold: true,
          },
          { text: " to prepare a solution of it." },
        ],
        [{ text: "Shake it into the beaker.", bold: true }],
      ];
    // Blueprint slide 62
    case "addUnknown":
      return [
        [
          {
            text: `You added ${state.knownReactantMoles.toFixed(2)} moles of `,
          },
          {
            text: state.selectedReaction?.knownReactant.formula ?? "",
            bold: true,
          },
          { text: ". Now go ahead and add " },
          {
            text: state.metalRevealed
              ? replaceMetalInFormula(
                  state.selectedReaction?.unknownReactant.formulaTemplate ?? "",
                  state.currentMetal,
                )
              : replaceMetalInFormula(
                  state.selectedReaction?.unknownReactant.formulaTemplate ?? "",
                  Metal.Sodium,
                ).replace(/Na|Li|K/g, "M"),
            bold: true,
          },
          { text: " and let's watch them react." },
        ],
        [
          {
            text: "Notice the amount of grams added at the shaker. Keep shaking to see it react.",
            bold: true,
          },
        ],
      ];
    // Blueprint slide 64
    case "reaction1": {
      const reaction1Grams = state.unknownReactantMassAdded;
      const reaction1GramName = reaction1Grams === 1 ? "gram" : "grams";
      return [
        [
          { text: "Perfect! You added " },
          {
            text: `${reaction1Grams.toFixed(2)} ${reaction1GramName}`,
            bold: true,
          },
          { text: " of " },
          {
            text: state.metalRevealed
              ? replaceMetalInFormula(
                  state.selectedReaction?.unknownReactant.formulaTemplate ?? "",
                  state.currentMetal,
                )
              : replaceMetalInFormula(
                  state.selectedReaction?.unknownReactant.formulaTemplate ?? "",
                  Metal.Sodium,
                ).replace(/Na|Li|K/g, "M"),
            bold: true,
          },
          { text: ". Now let's just see the reaction going." },
        ],
        [
          {
            text: `Watch how ${state.selectedReaction?.product.formula ?? "the product"} is produced.`,
            bold: true,
          },
        ],
      ];
    }

    // Post-reaction1 (iOS step 8)
    case "endReaction1":
      return [
        [
          {
            text: "The reaction is complete! Why don't you check out the macroscopic beaker to see the precipitate you produced! ",
          },
          { text: "Tap the toggle.", bold: true },
        ],
        [
          {
            text: "You can also tap back or the run again button to see the reaction again.",
          },
        ],
      ];

    // Post-reaction explanation (blueprint slide 66)
    case "postWeighing": {
      const postWeighGrams = state.productMassProduced;
      const gramName = postWeighGrams === 1 ? "gram" : "grams";
      const unknownGrams2 = state.unknownReactantMassAdded;
      const unknownGramName2 = unknownGrams2 === 1 ? "gram" : "grams";
      return [
        [
          { text: `${postWeighGrams.toFixed(2)} ${gramName} of `, bold: true },
          { text: state.selectedReaction?.product.formula ?? "", bold: true },
          {
            text: ` was produced. By dividing this by its Molar Mass, we know that it's ${state.productMolesProduced.toFixed(2)} mol, which means that the ${unknownGrams2.toFixed(2)} ${unknownGramName2} of `,
          },
          {
            text: state.metalRevealed
              ? replaceMetalInFormula(
                  state.selectedReaction?.unknownReactant.formulaTemplate ?? "",
                  state.currentMetal,
                )
              : replaceMetalInFormula(
                  state.selectedReaction?.unknownReactant.formulaTemplate ?? "",
                  Metal.Sodium,
                ).replace(/Na|Li|K/g, "M"),
            bold: true,
          },
          { text: ` we added are ` },
          {
            text: `${state.unknownReactantMoles.toFixed(2)} mol. But what does this mean?`,
            bold: true,
          },
        ],
      ];
    }

    // Blueprint slide 67
    case "revealMetal": {
      const unknownMolarMass = state.unknownReactantMolarMass;
      const unknownFormula = state.metalRevealed
        ? replaceMetalInFormula(
            state.selectedReaction?.unknownReactant.formulaTemplate ?? "",
            state.currentMetal,
          )
        : replaceMetalInFormula(
            state.selectedReaction?.unknownReactant.formulaTemplate ?? "",
            Metal.Sodium,
          ).replace(/Na|Li|K/g, "M");
      const revealedFormula = replaceMetalInFormula(
        state.selectedReaction?.unknownReactant.formulaTemplate ?? "",
        state.currentMetal,
      );
      const revealGrams = state.unknownReactantMassAdded;
      const revealGramName = revealGrams === 1 ? "gram" : "grams";
      return [
        [
          {
            text: `Well, if there are ${revealGrams.toFixed(2)} ${revealGramName} in ${state.unknownReactantMoles.toFixed(2)} moles of `,
            bold: true,
          },
          { text: unknownFormula, bold: true },
          {
            text: `, then how many are in 1 mol? There are ${unknownMolarMass} grams of `,
          },
          { text: unknownFormula, bold: true },
          {
            text: `, in 1 mol. That's right, ${unknownMolarMass} g/mol is the Molar Mass of it, and `,
          },
          { text: revealedFormula, bold: true },
          { text: ` Molar Mass matches perfectly! So ` },
          {
            text: `M = ${state.currentMetal}`,
            bold: true,
            color: "rgb(220, 84, 59)",
          },
        ],
      ];
    }
    // Blueprint slide 68
    case "addExtraUnknown": {
      const revealedFormula2 = replaceMetalInFormula(
        state.selectedReaction?.unknownReactant.formulaTemplate ?? "",
        state.currentMetal,
      );
      return [
        [
          { text: "We already discovered the mystery. At this point the " },
          { text: revealedFormula2, bold: true },
          { text: " is the Limiting Reagent, so just keep shaking " },
          { text: revealedFormula2, bold: true },
          { text: " to neutralize the " },
          {
            text: state.selectedReaction?.knownReactant.formula ?? "",
            bold: true,
          },
          { text: " in its entirety." },
        ],
        [{ text: "Keep shaking to see it react.", bold: true }],
      ];
    }
    case "reaction2":
      return [
        [
          {
            text: "Now just watch how the reactant you added produces more and more ",
          },
          {
            text: state.selectedReaction?.product.formula ?? "product",
            bold: true,
          },
          { text: ", as it neutralizes all of the " },
          {
            text: state.selectedReaction?.knownReactant.formula ?? "",
            bold: true,
          },
          { text: " that was left in the beaker." },
        ],
        [
          {
            text: "Change between both microscopic and macroscopic views.",
            bold: true,
          },
        ],
      ];

    // Post-reaction2 (blueprint slide 70)
    case "endReaction2":
      return [
        [{ text: "Done! There's no more reactant left." }],
        [
          {
            text: "In a real laboratory, you would be able to extract the precipitate of ",
          },
          { text: state.selectedReaction?.product.formula ?? "", bold: true },
          {
            text: " with a filter and weigh it to know the mass, so this could be applied to real life.",
          },
        ],
      ];

    case "complete":
      if (state.reactionRun === 1) {
        return [
          [
            {
              text: "Great job! Press Next to repeat the experiment with the other reaction.",
            },
          ],
        ];
      }
      return [
        [
          {
            text: "Experiment complete. You identified the unknown metal using stoichiometry. Well done!",
          },
        ],
      ];
    case "prepareSecondReaction":
      return [
        [{ text: "Now, let's repeat the experiment with the other reaction!" }],
      ];
    default:
      return [[{ text: "" }]];
  }
}

export default function PrecipitationScreen() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const exploreMode = searchParams.get("mode") === "explore";
  const state = usePrecipitationState(exploreMode);
  const canvasScale = useCanvasScale();

  // iOS: dropdown shows the full chemical equation with M placeholder
  // e.g. "M₂CO₃(aq) + CaCl₂(aq) → CaCO₃(s) + 2MCl(aq)"
  const dropdownOptions = state.reactions.map((r) => {
    const unknownCoeff =
      r.unknownReactant.coefficient > 1 ? r.unknownReactant.coefficient : "";
    const unknownDisplay = `${unknownCoeff}${r.unknownReactant.formulaTemplate}`;
    const secondaryCoeff =
      r.secondaryProduct.coefficient > 1 ? r.secondaryProduct.coefficient : "";
    const secondaryDisplay = `${secondaryCoeff}${r.secondaryProduct.formulaTemplate}`;
    return {
      id: r.id,
      label: `${unknownDisplay}(${r.unknownReactant.state}) + ${r.knownReactant.formula}(${r.knownReactant.state}) → ${r.product.formula}(${r.product.state}) + ${secondaryDisplay}(${r.secondaryProduct.state})`,
    };
  });

  const handleSelectReaction = useCallback(
    (id: string) => {
      const reaction = state.reactions.find((r) => r.id === id);
      if (reaction) {
        state.selectReaction(reaction);
      }
    },
    [state],
  );

  const hasReaction = state.selectedReaction !== null;
  const segments = buildReactionSegments(state);
  const guideStatement = getGuideStatement(state, exploreMode);

  // iOS: unknownReactant name uses showMetal=false, showCoeff=false for equation subscripts
  const unknownFormulaDisplay = hasReaction
    ? state.metalRevealed
      ? replaceMetalInFormula(
          state.selectedReaction!.unknownReactant.formulaTemplate,
          state.currentMetal,
        )
      : replaceMetalInFormula(
          state.selectedReaction!.unknownReactant.formulaTemplate,
          Metal.Sodium,
        ).replace(/Na|Li|K/g, "M")
    : "";

  const containersRowRef = useRef<HTMLDivElement>(null);
  const beakerWrapperRef = useRef<HTMLDivElement>(null);
  const [fallDistance, setFallDistance] = useState("140px");

  useLayoutEffect(() => {
    const measure = () => {
      const cEl = containersRowRef.current;
      const bEl = beakerWrapperRef.current;
      if (cEl && bEl) {
        const cRect = cEl.getBoundingClientRect();
        const s = canvasScale > 0 ? canvasScale : 1;
        const waterSurface = bEl.querySelector("[data-water-surface]");
        if (waterSurface) {
          const wsRect = waterSurface.getBoundingClientRect();
          const dist = (wsRect.top - cRect.bottom) / s;
          setFallDistance(`${Math.max(40, Math.round(dist))}px`);
        } else {
          const bRect = bEl.getBoundingClientRect();
          const dist = (bRect.top + bRect.height * 0.4 - cRect.bottom) / s;
          setFallDistance(`${Math.max(40, Math.round(dist))}px`);
        }
      }
    };
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [hasReaction, state.waterLevel, canvasScale]);

  const isReactionPhase =
    state.phase === "reaction1" ||
    state.phase === "reaction2" ||
    state.phase === "revealMetal" ||
    state.phase === "complete";
  const knownContainerActive = exploreMode
    ? hasReaction && !isReactionPhase
    : state.phase === "addKnown";
  const unknownContainerActive = exploreMode
    ? hasReaction && !isReactionPhase
    : state.phase === "addUnknown" || state.phase === "addExtraUnknown";

  return (
    <div className={styles.screen}>
      <LeftSidebar />
      <RightActionButtons
        onPlay={state.canGoNext ? state.next : undefined}
        onUndo={hasReaction ? state.runReactionAgain : undefined}
        playActive={state.canGoNext && state.phase !== "chooseReaction"}
        playDisabled={!state.canGoNext}
        undoDisabled={!state.showRunAgain}
      />
      <BranchMenu currentRoute={location.pathname} />
      {/* Top bar: equation + controls */}
      <div className={styles.topBar}>
        <div
          className={styles.equationArea}
          style={highlightStyle(state.highlights, "reactionDefinition")}
        >
          {hasReaction && <EquationDisplay segments={segments} />}
        </div>
        <div
          className={styles.controls}
          style={highlightStyle(state.highlights, "reactionToggle")}
        >
          <DropdownSelector
            options={dropdownOptions}
            selectedId={state.selectedReaction?.id ?? null}
            onChange={handleSelectReaction}
            disabled={
              exploreMode
                ? false
                : state.phase !== "chooseReaction" && state.phase !== "complete"
            }
            placeholder="Choose a Substance"
          />
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Left column */}
        <div className={styles.leftColumn}>
          {/* "(X.XX g) added" label — shown after unknown reactant has been added (blueprint slides 64-71) */}
          {state.unknownReactantMassAdded > 0 && (
            <div className={styles.gramsAddedLabel}>
              ({state.unknownReactantMassAdded.toFixed(2)} g) added
            </div>
          )}

          <div className={styles.containersRow} ref={containersRowRef}>
            <div
              style={highlightStyle(state.highlights, "knownReactantContainer")}
            >
              <ShakingContainer
                color={
                  hasReaction
                    ? state.selectedReaction!.knownReactant.color
                    : "#aaa"
                }
                label={
                  hasReaction
                    ? state.selectedReaction!.knownReactant.formula
                    : "—"
                }
                onPour={() => state.addReactant("known", 5)}
                disabled={!knownContainerActive}
                isActive={knownContainerActive}
                tooltipText={
                  knownContainerActive
                    ? `${state.knownMoleculeCount} molecules`
                    : undefined
                }
                fallDistance={fallDistance}
                twoTapPour
              />
            </div>
            <div
              style={highlightStyle(
                state.highlights,
                "unknownReactantContainer",
              )}
            >
              <ShakingContainer
                color={
                  hasReaction
                    ? state.selectedReaction!.unknownReactant.color
                    : "#aaa"
                }
                label={
                  hasReaction
                    ? state.metalRevealed
                      ? replaceMetalInFormula(
                          state.selectedReaction!.unknownReactant
                            .formulaTemplate,
                          state.currentMetal,
                        )
                      : replaceMetalInFormula(
                          state.selectedReaction!.unknownReactant
                            .formulaTemplate,
                          Metal.Sodium,
                        ).replace(/Na|Li|K/g, "M")
                    : "—"
                }
                onPour={() => state.addReactant("unknown", 5)}
                disabled={!unknownContainerActive}
                isActive={unknownContainerActive}
                tooltipText={
                  unknownContainerActive && state.unknownReactantMassAdded > 0
                    ? `(${state.unknownReactantMassAdded.toFixed(2)} g)`
                    : undefined
                }
                fallDistance={fallDistance}
                twoTapPour
              />
            </div>
          </div>

          <div className={styles.beakerScalesRow}>
            <div
              className={styles.beakerWrapper}
              ref={beakerWrapperRef}
              style={
                state.highlights.length > 0
                  ? state.highlights.includes("beaker") ||
                    state.highlights.includes("waterSlider")
                    ? { transition: "opacity 0.3s ease, filter 0.3s ease" }
                    : {
                        opacity: 0.35,
                        filter: "saturate(0.3)",
                        transition: "opacity 0.3s ease, filter 0.3s ease",
                      }
                  : {}
              }
            >
              <FillableBeaker
                waterLevel={state.waterLevel}
                onWaterLevelChange={state.setWaterLevel}
                minWaterLevel={MIN_WATER_LEVEL}
                maxWaterLevel={MAX_WATER_LEVEL}
                disabled={
                  exploreMode
                    ? !hasReaction || isReactionPhase
                    : state.phase !== "setWaterLevel"
                }
                width={240}
              >
                {state.beakerView === "microscopic" ? (
                  <BeakerMoleculeGrid
                    molecules={state.reactionMolecules}
                    animated
                  />
                ) : /* Macroscopic view: show precipitate inside beaker */
                hasReaction && state.reactionProgress > 0 ? (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: "50%",
                      transform: "translateX(-50%)",
                    }}
                  >
                    <PrecipitateShape
                      progress={state.reactionProgress}
                      color={state.selectedReaction!.product.color}
                      size={(() => {
                        const w = Math.max(
                          MIN_WATER_LEVEL,
                          Math.min(MAX_WATER_LEVEL, state.waterLevel),
                        );
                        const t =
                          (w - MIN_WATER_LEVEL) /
                          (MAX_WATER_LEVEL - MIN_WATER_LEVEL);
                        return Math.round(36 + t * 24);
                      })()}
                    />
                    {/* Blueprint: precipitate mass label inside macroscopic beaker */}
                    <div className={styles.precipitateMassLabel}>
                      {(
                        state.productMassProduced * state.reactionProgress
                      ).toFixed(1)}{" "}
                      g
                    </div>
                  </div>
                ) : null}
              </FillableBeaker>

              {/* Volume label next to slider (blueprint: "0.100L" style) */}
              <div className={styles.volumeLabel}>
                {state.waterLevel.toFixed(3)}L
              </div>

              {/* iOS "Run again?" button — shown after reactions complete */}
              {state.showRunAgain && (
                <button
                  type="button"
                  className={styles.runAgainButton}
                  onClick={state.runReactionAgain}
                >
                  Run again?
                </button>
              )}
            </div>
          </div>

          <div
            className={styles.toggleArea}
            style={highlightStyle(state.highlights, "beakerToggle")}
          >
            <BeakerToggle
              view={state.beakerView}
              onChange={state.toggleBeakerView}
              disabled={false}
            />
          </div>
        </div>

        {/* Middle column */}
        <div className={styles.middleColumn}>
          <div
            className={styles.tableWrapper}
            style={
              state.highlights.length > 0
                ? state.highlights.includes("metalTable") ||
                  state.highlights.includes("correctMetalRow")
                  ? { transition: "opacity 0.3s ease, filter 0.3s ease" }
                  : {
                      opacity: 0.35,
                      filter: "saturate(0.3)",
                      transition: "opacity 0.3s ease, filter 0.3s ease",
                    }
                : {}
            }
          >
            {hasReaction ? (
              <MetalTable
                reaction={state.selectedReaction!}
                revealedMetal={state.metalRevealed ? state.currentMetal : null}
                showHighlight={state.metalRevealed}
              />
            ) : (
              <MetalTable
                reaction={state.reactions[0]}
                revealedMetal={null}
                showHighlight={false}
              />
            )}
          </div>

          {hasReaction &&
          (state.knownMoleculeCount > 0 || state.unknownMoleculeCount > 0) ? (
            <div className={styles.chartPlaceholder}>
              <div className={styles.chartBars}>
                {(() => {
                  const maxMol = 40;
                  const maxDots = 10;
                  const scale = maxMol > 0 ? maxDots / maxMol : 0;
                  const p = Math.min(1, Math.max(0, state.reactionProgress));
                  // During pouring (addUnknown/addExtraUnknown) and post-reaction phases,
                  // use stoichiometric counts so the chart updates in real-time.
                  const isPouring =
                    state.phase === "addUnknown" ||
                    state.phase === "addExtraUnknown";
                  const isPostReaction = [
                    "endReaction1",
                    "endReaction2",
                    "postWeighing",
                    "revealMetal",
                    "complete",
                  ].includes(state.phase);
                  const useStoichiometric =
                    (isPouring || isPostReaction) &&
                    state.unknownMoleculeCount > 0;

                  let krDots: number, urDots: number, prDots: number;
                  if (useStoichiometric) {
                    const productsFormed = Math.min(
                      state.knownMoleculeCount,
                      state.unknownMoleculeCount,
                    );
                    const knownRemaining =
                      state.knownMoleculeCount - productsFormed;
                    const unknownExcess = Math.max(
                      0,
                      state.unknownMoleculeCount - state.knownMoleculeCount,
                    );
                    krDots = Math.min(
                      maxDots,
                      Math.round(knownRemaining * scale),
                    );
                    urDots = Math.min(
                      maxDots,
                      Math.round(unknownExcess * scale),
                    );
                    prDots = Math.min(
                      maxDots,
                      Math.round(productsFormed * scale),
                    );
                  } else {
                    // Progress-based (animation replay)
                    krDots =
                      state.knownMoleculeCount > 0
                        ? Math.min(
                            maxDots,
                            Math.max(
                              0,
                              Math.round(
                                state.knownMoleculeCount * scale * (1 - p),
                              ),
                            ),
                          )
                        : 0;
                    urDots =
                      state.unknownMoleculeCount > 0
                        ? Math.min(
                            maxDots,
                            Math.max(
                              0,
                              Math.round(
                                state.unknownMoleculeCount * scale * (1 - p),
                              ),
                            ),
                          )
                        : 0;
                    prDots =
                      state.knownMoleculeCount > 0 &&
                      state.unknownMoleculeCount > 0
                        ? Math.min(
                            maxDots,
                            Math.round(
                              Math.min(
                                state.knownMoleculeCount,
                                state.unknownMoleculeCount,
                              ) *
                                scale *
                                p,
                            ),
                          )
                        : 0;
                  }
                  const molSize = 12;
                  return (
                    <>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column-reverse",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        {Array.from({ length: krDots }).map((_, i) => (
                          <div
                            key={`kr-${i}`}
                            style={{
                              width: molSize,
                              height: molSize,
                              borderRadius: "50%",
                              backgroundColor:
                                state.selectedReaction!.knownReactant.color,
                            }}
                          />
                        ))}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column-reverse",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        {Array.from({ length: urDots }).map((_, i) => (
                          <div
                            key={`ur-${i}`}
                            style={{
                              width: molSize,
                              height: molSize,
                              borderRadius: "50%",
                              backgroundColor:
                                state.selectedReaction!.unknownReactant.color,
                            }}
                          />
                        ))}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column-reverse",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        {Array.from({ length: prDots }).map((_, i) => (
                          <div
                            key={`pr-${i}`}
                            style={{
                              width: molSize,
                              height: molSize,
                              borderRadius: "50%",
                              backgroundColor:
                                state.selectedReaction!.product.color,
                            }}
                          />
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
              <div
                style={{ display: "flex", gap: 12, justifyContent: "center" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor:
                        state.selectedReaction!.knownReactant.color,
                    }}
                  />
                  <span className={styles.chartLabel}>
                    {state.selectedReaction!.knownReactant.formula}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor:
                        state.selectedReaction!.unknownReactant.color,
                    }}
                  />
                  <span className={styles.chartLabel}>
                    {state.metalRevealed
                      ? replaceMetalInFormula(
                          state.selectedReaction!.unknownReactant
                            .formulaTemplate,
                          state.currentMetal,
                        )
                      : replaceMetalInFormula(
                          state.selectedReaction!.unknownReactant
                            .formulaTemplate,
                          Metal.Sodium,
                        ).replace(/Na|Li|K/g, "M")}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: state.selectedReaction!.product.color,
                    }}
                  />
                  <span className={styles.chartLabel}>
                    {state.selectedReaction!.product.formula}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.chartPlaceholder}>
              <div className={styles.chartBars} />
            </div>
          )}
        </div>

        {/* Right column */}
        <div className={styles.rightColumn}>
          <div className={styles.equationPanel}>
            {hasReaction ? (
              <>
                {/* Top-left: Known reactant moles: n = V × M */}
                <div className={styles.equationGroup}>
                  <div className={styles.equationLine}>
                    <span style={{ fontStyle: "italic" }}>n</span>
                    <sub>{state.selectedReaction!.knownReactant.formula}</sub>
                    {" = V \u00D7 "}
                    <span style={{ fontStyle: "italic" }}>M</span>
                    <sub>{state.selectedReaction!.knownReactant.formula}</sub>
                  </div>
                  <div className={styles.equationLine}>
                    {state.equationState !== "blank" ? (
                      <>
                        <span className={styles.dashedPlaceholder}>
                          <span
                            className={styles.equationValue}
                            style={{ fontSize: 11 }}
                          >
                            {state.knownReactantMoles.toFixed(2)}
                          </span>
                        </span>
                        {" = "}
                        <span className={styles.equationValue}>
                          {state.waterLevel.toFixed(3)}
                        </span>
                        {" \u00D7 "}
                        <span className={styles.dashedPlaceholder}>
                          <span
                            className={styles.equationValue}
                            style={{ fontSize: 11 }}
                          >
                            {state.knownReactantMolarity.toFixed(2)}
                          </span>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={styles.dashedPlaceholder} />
                        {" = "}
                        <span className={styles.equationValue}>
                          {state.waterLevel.toFixed(3)}
                        </span>
                        {" \u00D7 "}
                        <span className={styles.dashedPlaceholder} />
                      </>
                    )}
                  </div>
                </div>

                {/* Top-right: Product moles: n = m / MM */}
                <div
                  className={styles.equationGroup}
                  style={highlightStyle(state.highlights, "productMoles")}
                >
                  <div className={styles.equationLine}>
                    <span style={{ fontStyle: "italic" }}>n</span>
                    <sub>{state.selectedReaction!.product.formula}</sub>
                    {" = "}
                    <span className={styles.equationFraction}>
                      <span>
                        <span style={{ fontStyle: "italic" }}>m</span>
                        <sub>{state.selectedReaction!.product.formula}</sub>
                      </span>
                      <span className={styles.fractionLine} />
                      <span>
                        MM<sub>{state.selectedReaction!.product.formula}</sub>
                      </span>
                    </span>
                  </div>
                  <div className={styles.equationLine}>
                    {state.equationState === "showAll" ? (
                      <>
                        <span className={styles.dashedPlaceholder}>
                          <span
                            className={styles.equationValue}
                            style={{ fontSize: 11 }}
                          >
                            {state.productMolesProduced.toFixed(2)}
                          </span>
                        </span>
                        {" = "}
                        <span className={styles.equationFraction}>
                          <span className={styles.equationValue}>
                            {state.productMassProduced.toFixed(2)}
                          </span>
                          <span className={styles.fractionLine} />
                          <span>
                            {state.selectedReaction!.product.molarMass}
                          </span>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={styles.dashedPlaceholder} />
                        {" = "}
                        <span className={styles.equationFraction}>
                          <span className={styles.dashedPlaceholder} />
                          <span className={styles.fractionLine} />
                          <span>
                            {state.selectedReaction!.product.molarMass}
                          </span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Bottom-left: n_product = n_unknown(react) */}
                <div
                  className={styles.equationGroup}
                  style={highlightStyle(
                    state.highlights,
                    "unknownReactantMoles",
                  )}
                >
                  <div className={styles.equationLine}>
                    <span style={{ fontStyle: "italic" }}>n</span>
                    <sub>{state.selectedReaction!.product.formula}</sub>
                    {" = "}
                    {state.selectedReaction!.unknownReactant.coefficient >
                      1 && (
                      <>
                        {state.selectedReaction!.unknownReactant.coefficient}{" "}
                        &times;{" "}
                      </>
                    )}
                    <span style={{ fontStyle: "italic" }}>n</span>
                    <sub>
                      {unknownFormulaDisplay}
                      <small>(react)</small>
                    </sub>
                  </div>
                  <div className={styles.equationLine}>
                    {state.equationState === "showAll" ? (
                      <>
                        <span className={styles.dashedPlaceholder}>
                          <span
                            className={styles.equationValue}
                            style={{ fontSize: 11 }}
                          >
                            {state.productMolesProduced.toFixed(2)}
                          </span>
                        </span>
                        {" = "}
                        {state.selectedReaction!.unknownReactant.coefficient >
                          1 && (
                          <>
                            {
                              state.selectedReaction!.unknownReactant
                                .coefficient
                            }{" "}
                            &times;{" "}
                          </>
                        )}
                        <span className={styles.dashedPlaceholder}>
                          <span
                            className={styles.equationValue}
                            style={{ fontSize: 11 }}
                          >
                            {state.unknownReactantMoles.toFixed(2)}
                          </span>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={styles.dashedPlaceholder} />
                        {" = "}
                        {state.selectedReaction!.unknownReactant.coefficient >
                          1 && (
                          <>
                            {
                              state.selectedReaction!.unknownReactant
                                .coefficient
                            }{" "}
                            &times;{" "}
                          </>
                        )}
                        <span className={styles.dashedPlaceholder} />
                      </>
                    )}
                  </div>
                </div>

                {/* Bottom-right: MM_unknown = m / n */}
                <div
                  className={styles.equationGroup}
                  style={highlightStyle(
                    state.highlights,
                    "unknownReactantMolarMass",
                  )}
                >
                  <div className={styles.equationLine}>
                    MM<sub>{unknownFormulaDisplay}</sub>
                    {" = "}
                    <span className={styles.equationFraction}>
                      <span>
                        <span style={{ fontStyle: "italic" }}>m</span>
                        <sub>{unknownFormulaDisplay}</sub>
                      </span>
                      <span className={styles.fractionLine} />
                      <span>
                        <span style={{ fontStyle: "italic" }}>n</span>
                        <sub>
                          {unknownFormulaDisplay}
                          <small>(react)</small>
                        </sub>
                      </span>
                    </span>
                  </div>
                  <div className={styles.equationLine}>
                    {state.equationState === "showAll" ? (
                      <>
                        <span className={styles.dashedPlaceholder}>
                          <span
                            className={styles.equationValue}
                            style={{ fontSize: 11 }}
                          >
                            {state.unknownReactantMolarMass}
                          </span>
                        </span>
                        {" = "}
                        <span className={styles.equationFraction}>
                          <span className={styles.equationValue}>
                            {state.unknownReactantMassAdded.toFixed(2)}
                          </span>
                          <span className={styles.fractionLine} />
                          <span className={styles.equationValue}>
                            {state.unknownReactantMoles.toFixed(2)}
                          </span>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={styles.dashedPlaceholder} />
                        {" = "}
                        <span className={styles.equationFraction}>
                          <span className={styles.dashedPlaceholder} />
                          <span className={styles.fractionLine} />
                          <span className={styles.dashedPlaceholder} />
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Empty default equation placeholders */}
                <div className={styles.equationGroup}>
                  <div className={styles.equationLine}>
                    <span style={{ fontStyle: "italic" }}>n</span> = V &times;{" "}
                    <span style={{ fontStyle: "italic" }}>M</span>
                  </div>
                  <div className={styles.equationLine}>
                    <span className={styles.dashedPlaceholder} />
                    {" = "}
                    <span className={styles.dashedPlaceholder} />
                    {" \u00D7 "}
                    <span className={styles.dashedPlaceholder} />
                  </div>
                </div>
                <div className={styles.equationGroup}>
                  <div className={styles.equationLine}>
                    <span style={{ fontStyle: "italic" }}>n</span> ={" "}
                    <span className={styles.equationFraction}>
                      <span>
                        <span style={{ fontStyle: "italic" }}>m</span>
                      </span>
                      <span className={styles.fractionLine} />
                      <span>MM</span>
                    </span>
                  </div>
                  <div className={styles.equationLine}>
                    <span className={styles.dashedPlaceholder} />
                    {" = "}
                    <span className={styles.equationFraction}>
                      <span className={styles.dashedPlaceholder} />
                      <span className={styles.fractionLine} />
                      <span className={styles.dashedPlaceholder} />
                    </span>
                  </div>
                </div>
                <div className={styles.equationGroup}>
                  <div className={styles.equationLine}>
                    <span style={{ fontStyle: "italic" }}>n</span>
                    <sub>product</sub> ={" "}
                    <span style={{ fontStyle: "italic" }}>n</span>
                    <sub>reactant</sub>
                  </div>
                  <div className={styles.equationLine}>
                    <span className={styles.dashedPlaceholder} />
                    {" = "}
                    <span className={styles.dashedPlaceholder} />
                  </div>
                </div>
                <div className={styles.equationGroup}>
                  <div className={styles.equationLine}>
                    MM ={" "}
                    <span className={styles.equationFraction}>
                      <span>
                        <span style={{ fontStyle: "italic" }}>m</span>
                      </span>
                      <span className={styles.fractionLine} />
                      <span>
                        <span style={{ fontStyle: "italic" }}>n</span>
                      </span>
                    </span>
                  </div>
                  <div className={styles.equationLine}>
                    <span className={styles.dashedPlaceholder} />
                    {" = "}
                    <span className={styles.equationFraction}>
                      <span className={styles.dashedPlaceholder} />
                      <span className={styles.fractionLine} />
                      <span className={styles.dashedPlaceholder} />
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className={styles.bottomBar}>
            <BeakyBox
              statement={guideStatement}
              onNext={state.next}
              onBack={state.back}
              canGoNext={state.canGoNext}
              showBack={state.showBack}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
