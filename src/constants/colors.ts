export const AtomColors = {
  carbon: 'rgb(85, 151, 190)',
  hydrogen: 'rgb(143, 234, 228)',
  nitrogen: 'rgb(123, 127, 220)',
  oxygen: 'rgb(218, 105, 136)',
} as const;

// Blueprint palette — color-picked from PPTX slide images (slides 37, 47, 54
// for limiting reagent; slides 62, 64, 68 for precipitation). Per Ted's PPTX
// comment 2 ("update the colors for the graph and assets"), the simulation
// must match the blueprint slides, NOT the iOS Swift palette which uses
// generic .red / .purple / .blue.
export const MoleculeColors = {
  A: 'rgb(240, 208, 112)', // blueprint gold — Na2C2O4 / product (LR)
  B: 'rgb(128, 208, 224)', // blueprint teal — H2C2O4 / limiting (LR)
  C: 'rgb(240, 112, 64)',  // blueprint orange (slider pill)
  D: 'rgb(255, 100, 50)',  // legacy orange-red
  E: 'rgb(160, 160, 240)', // blueprint lavender — NaHCO3 / excess (LR)
  F: 'rgb(120, 60, 100)',  // legacy
  G: 'rgb(224, 96, 128)',  // blueprint rose — precipitation unknown reactant
  H: 'rgb(160, 176, 240)', // blueprint periwinkle — precipitation known reactant
  I: 'rgb(224, 224, 208)', // blueprint cream — precipitation product
} as const;

export const PrecipitationColors = {
  reaction1: {
    // Blueprint slides 62/64: known=periwinkle, unknown=rose, product=cream
    knownReactant: 'rgb(160, 176, 240)',
    unknownReactant: 'rgb(224, 96, 128)',
    product: 'rgb(224, 224, 208)',
  },
  reaction2: {
    // Blueprint slide 68 second reaction palette
    knownReactant: 'rgb(160, 176, 240)',
    unknownReactant: 'rgb(224, 96, 128)',
    product: 'rgb(224, 224, 208)',
  },
} as const;

export const UIColors = {
  orangeAccent: 'rgb(220, 84, 59)',
  speechBubble: 'rgb(232, 232, 232)',
  beakerLiquid: 'rgb(218, 238, 245)',
  beakerAir: 'rgb(235, 235, 235)',
  beakerOutline: 'rgb(64, 64, 64)',
  primaryLightBlue: 'rgb(169, 204, 229)',
  primaryDarkBlue: 'rgb(97, 147, 201)',
  navIcon: 'rgb(68, 150, 247)',
  navIconSelected: 'rgb(91, 141, 197)',
  menuPanel: 'rgb(242, 242, 242)',
  moleculePlaceholder: 'rgb(206, 227, 237)',
  inactiveElement: 'rgb(200, 200, 200)',
  tooltipBackground: 'rgb(66, 66, 66)',
  tooltipText: '#ffffff',
  scalesBody: 'rgb(130, 130, 130)',
  scalesBadgeOutline: 'rgb(100, 100, 100)',
  tableOddRow: 'rgb(240, 240, 240)',
  tableEvenRow: 'rgb(230, 230, 230)',
  tableCellBorder: 'rgb(190, 190, 190)',
  darkGray: 'rgb(64, 64, 64)',
} as const;
