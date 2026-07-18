import { create } from 'zustand';
import type { MaterialId } from '../../core/materials/material';
import type { ToleranceMode } from '../../core/materials/tolerance';
import type { LidStyle } from '../../core/shapes/box';
import type { ShapeType, ParsedIntent } from '../../core/nlu/types';
import { parseUserPrompt } from '../../core/nlu/heuristicParser';
import { generateFromIntent } from '../../core/nlu/dispatch';
import type { Design } from '../../core/model/types';
import { renderDesignToSvg, type RenderedSheet } from '../../core/svg/svgDocument';
import type { LayerName } from '../../core/svg/colors';

export interface AppState {
  promptText: string;
  shapeType: ShapeType;
  materialId: MaterialId;
  customMaterialLabel: string;
  thickness: number;
  kerf: number;
  toleranceMode: ToleranceMode;
  customToleranceValue: number;
  lidStyle: LidStyle;
  count: number;
  width: number;
  depth: number;
  height: number;

  design: Design | null;
  sheets: RenderedSheet[];
  activeSheetIndex: number;
  layerVisibility: Record<LayerName, boolean>;
  assumptions: string[];
  confidence: number;
  error: string | null;
  isGenerating: boolean;
  viewMode: '2d' | '3d';
  explodeFactor: number;

  setPromptText: (text: string) => void;
  setViewMode: (mode: '2d' | '3d') => void;
  setExplodeFactor: (value: number) => void;
  generateFromPrompt: () => void;
  regenerateDesign: () => void;
  setField: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
  toggleLayer: (name: LayerName) => void;
  setActiveSheet: (index: number) => void;
}

const DEFAULT_LAYER_VISIBILITY: Record<LayerName, boolean> = {
  cut: true,
  engrave: true,
  score: true,
  text: true,
  center: true,
  reference: true,
};

function buildIntent(state: AppState): ParsedIntent {
  return {
    shapeType: state.shapeType,
    materialId: state.materialId,
    materialLabel: state.customMaterialLabel,
    thickness: state.thickness,
    kerf: state.kerf,
    tolerance:
      state.toleranceMode === 'custom'
        ? { mode: 'custom', customValue: state.customToleranceValue }
        : { mode: state.toleranceMode },
    dimensions: { width: state.width, depth: state.depth, height: state.height },
    lidStyle: state.lidStyle,
    count: state.count,
    rawText: state.promptText,
    assumptions: [],
    confidence: 1,
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  promptText: 'Napravi kutiju dimenzija 300x200x150 mm od šperploče debljine 4 mm sa poklopcem na šarke.',
  shapeType: 'box',
  materialId: 'sperploca',
  customMaterialLabel: '',
  thickness: 4,
  kerf: 0.12,
  toleranceMode: 'tight',
  customToleranceValue: 0,
  lidStyle: 'closed',
  count: 0,
  width: 300,
  depth: 200,
  height: 150,

  design: null,
  sheets: [],
  activeSheetIndex: 0,
  layerVisibility: DEFAULT_LAYER_VISIBILITY,
  assumptions: [],
  confidence: 0,
  error: null,
  isGenerating: false,
  viewMode: '2d',
  explodeFactor: 0,

  setPromptText: (text) => set({ promptText: text }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setExplodeFactor: (value) => set({ explodeFactor: value }),

  generateFromPrompt: () => {
    const { promptText } = get();
    set({ isGenerating: true, error: null });
    try {
      const intent = parseUserPrompt(promptText);
      const design = generateFromIntent(intent);
      const sheets = renderDesignToSvg(design);
      set({
        shapeType: intent.shapeType,
        materialId: intent.materialId,
        customMaterialLabel: intent.materialLabel ?? '',
        thickness: intent.thickness,
        kerf: intent.kerf ?? design.material.kerf,
        toleranceMode: intent.tolerance.mode,
        customToleranceValue: intent.tolerance.customValue ?? 0,
        lidStyle: intent.lidStyle ?? 'closed',
        count: intent.count ?? 0,
        width: intent.dimensions.width ?? design.meta.outerDimensionsMm.width,
        depth: intent.dimensions.depth ?? design.meta.outerDimensionsMm.depth,
        height: intent.dimensions.height ?? design.meta.outerDimensionsMm.height,
        design,
        sheets,
        activeSheetIndex: 0,
        assumptions: intent.assumptions,
        confidence: intent.confidence,
        isGenerating: false,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), isGenerating: false });
    }
  },

  regenerateDesign: () => {
    set({ isGenerating: true, error: null });
    try {
      const intent = buildIntent(get());
      const design = generateFromIntent(intent);
      const sheets = renderDesignToSvg(design);
      set({ design, sheets, activeSheetIndex: 0, assumptions: [], confidence: 1, isGenerating: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), isGenerating: false });
    }
  },

  setField: (key, value) => set({ [key]: value } as Pick<AppState, typeof key>),

  toggleLayer: (name) =>
    set((state) => ({ layerVisibility: { ...state.layerVisibility, [name]: !state.layerVisibility[name] } })),

  setActiveSheet: (index) => set({ activeSheetIndex: index }),
}));
