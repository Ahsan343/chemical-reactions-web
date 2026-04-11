import { create } from 'zustand';

export interface TextSegment {
  text: string;
  bold?: boolean;
  subscript?: boolean;
  superscript?: boolean;
  color?: string;
}

export type TextLine = TextSegment[];

export type InputState =
  | { type: 'selectReaction' }
  | { type: 'dragMolecules' }
  | { type: 'setWaterLevel' }
  | { type: 'addReactant'; reactantType: 'limiting' | 'excess' | 'known' | 'unknown' }
  | { type: 'weighProduct' }
  | null;

interface GuideState {
  statement: TextLine;
  inputState: InputState;
  highlights: Set<string>;
  canGoNext: boolean;
  setStatement: (statement: TextLine) => void;
  setInputState: (input: InputState) => void;
  setHighlights: (highlights: Set<string>) => void;
  setCanGoNext: (canGoNext: boolean) => void;
  reset: () => void;
}

export const useGuideStore = create<GuideState>((set) => ({
  statement: [{ text: '' }],
  inputState: null,
  highlights: new Set(),
  canGoNext: false,
  setStatement: (statement) => set({ statement }),
  setInputState: (inputState) => set({ inputState }),
  setHighlights: (highlights) => set({ highlights }),
  setCanGoNext: (canGoNext) => set({ canGoNext }),
  reset: () => set({
    statement: [{ text: '' }],
    inputState: null,
    highlights: new Set(),
    canGoNext: false,
  }),
}));
