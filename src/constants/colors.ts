export const AtomColors = {
  carbon: 'rgb(85, 151, 190)',
  hydrogen: 'rgb(143, 234, 228)',
  nitrogen: 'rgb(123, 127, 220)',
  oxygen: 'rgb(218, 105, 136)',
} as const;

export const MoleculeColors = {
  A: 'rgb(0, 122, 255)',   // SwiftUI .blue
  B: 'rgb(255, 59, 48)',   // SwiftUI .red
  C: 'rgb(225, 132, 19)',
  D: 'rgb(213, 111, 62)',
  E: 'rgb(175, 82, 222)',  // SwiftUI .purple
  F: 'rgb(84, 35, 68)',
  G: 'rgb(156, 109, 138)',
  H: 'rgb(27, 153, 139)',
  I: 'rgb(221, 183, 113)',
} as const;

export const PrecipitationColors = {
  reaction1: {
    knownReactant: 'rgb(254, 193, 113)',
    unknownReactant: 'rgb(61, 71, 81)',
    product: 'rgb(205, 121, 163)',
  },
  reaction2: {
    knownReactant: 'rgb(76, 72, 67)',
    unknownReactant: 'rgb(225, 64, 61)',
    product: 'rgb(87, 167, 115)',
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
