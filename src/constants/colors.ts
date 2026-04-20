export const AtomColors = {
  carbon: 'rgb(85, 151, 190)',
  hydrogen: 'rgb(143, 234, 228)',
  nitrogen: 'rgb(123, 127, 220)',
  oxygen: 'rgb(218, 105, 136)',
} as const;

export const MoleculeColors = {
  A: 'rgb(0, 122, 255)',   // iOS .blue
  B: 'rgb(255, 59, 48)',   // iOS .red
  C: 'rgb(255, 150, 0)',   // Brighter orange
  D: 'rgb(255, 100, 50)',  // Brighter orange-red
  E: 'rgb(175, 82, 222)',  // iOS .purple
  F: 'rgb(120, 60, 100)',  // Saturated purple-red
  G: 'rgb(200, 100, 180)', // Vibrant pink
  H: 'rgb(30, 200, 180)',  // Vibrant teal
  I: 'rgb(255, 200, 80)',  // Vibrant gold
} as const;

export const PrecipitationColors = {
  reaction1: {
    knownReactant: 'rgb(100, 149, 237)',
    unknownReactant: 'rgb(220, 80, 80)',
    product: 'rgb(210, 195, 160)',
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
