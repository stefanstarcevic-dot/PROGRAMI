/** Built-in material families. `custom` lets the user name anything. */
export type MaterialId =
  | 'lesonit' // hardboard / Masonite
  | 'mdf'
  | 'hdf'
  | 'sperploca' // plywood
  | 'akril' // acrylic / PMMA
  | 'pvc'
  | 'karton' // cardboard
  | 'custom';

export interface MaterialPreset {
  id: MaterialId;
  label: string;
  /** Typical density, kg/m^3 — used for weight estimates. */
  density: number;
  /** Sensible default kerf for a well-focused laser on this material, mm. */
  defaultKerf: number;
  /** Thickness range this preset is normally sold/cut in, mm. */
  typicalThicknessRange: [number, number];
  /** Brittle materials (acrylic, HDF) need wider minimum fingers to avoid
   * snapping during assembly; fibrous/soft materials (cardboard) tolerate
   * narrower ones. Expressed as a multiplier applied to the thickness when
   * computing the minimum viable finger width. */
  minFingerWidthFactor: number;
  /** Whether the material is flexible enough for living hinges. */
  supportsLivingHinge: boolean;
  notes: string;
  /** Swatch color for the material picker UI. */
  swatch: string;
}

export const MATERIAL_PRESETS: Record<Exclude<MaterialId, 'custom'>, MaterialPreset> = {
  lesonit: {
    id: 'lesonit',
    label: 'Lesonit (tvrda vlaknatica)',
    density: 850,
    defaultKerf: 0.12,
    typicalThicknessRange: [2.5, 4],
    minFingerWidthFactor: 2.0,
    supportsLivingHinge: false,
    notes: 'Jednolična struktura, dobro podnosi fine zupce, sklon lomu kod vrlo tankih (<3mm) zubaca.',
    swatch: '#8a5a34',
  },
  mdf: {
    id: 'mdf',
    label: 'MDF',
    density: 750,
    defaultKerf: 0.15,
    typicalThicknessRange: [3, 18],
    minFingerWidthFactor: 2.2,
    supportsLivingHinge: false,
    notes: 'Rezanje ostavlja tamniji trag gorenja; kod debljina >12mm potreban je jači laser i sporiji prolaz.',
    swatch: '#c9a06b',
  },
  hdf: {
    id: 'hdf',
    label: 'HDF (tvrda ploča visoke gustoće)',
    density: 950,
    defaultKerf: 0.1,
    typicalThicknessRange: [1, 6],
    minFingerWidthFactor: 2.4,
    supportsLivingHinge: false,
    notes: 'Vrlo tvrd i gust — koristiti šire zupce da se izbjegne pucanje pri sastavljanju.',
    swatch: '#6b4a2f',
  },
  sperploca: {
    id: 'sperploca',
    label: 'Šperploča',
    density: 600,
    defaultKerf: 0.15,
    typicalThicknessRange: [3, 18],
    minFingerWidthFactor: 1.8,
    supportsLivingHinge: false,
    notes: 'Slojevita struktura — dobro podnosi opterećenje, moguće cijepanje duž vlakana kod tankih zubaca.',
    swatch: '#d2b48c',
  },
  akril: {
    id: 'akril',
    label: 'Akril (PMMA)',
    density: 1180,
    defaultKerf: 0.1,
    typicalThicknessRange: [2, 10],
    minFingerWidthFactor: 2.6,
    supportsLivingHinge: false,
    notes: 'Krt materijal — izbjegavati uske zupce i oštre unutrašnje uglove (koncentracija napona).',
    swatch: '#bfe3f0',
  },
  pvc: {
    id: 'pvc',
    label: 'PVC ploča',
    density: 1400,
    defaultKerf: 0.12,
    typicalThicknessRange: [1, 10],
    minFingerWidthFactor: 2.0,
    supportsLivingHinge: false,
    notes: 'Topi se lakše nego što gori — koristiti niže snage i veće brzine da se izbjegne taljenje ivica.',
    swatch: '#e8e8e0',
  },
  karton: {
    id: 'karton',
    label: 'Karton / kaširani karton',
    density: 300,
    defaultKerf: 0.05,
    typicalThicknessRange: [1, 5],
    minFingerWidthFactor: 1.5,
    supportsLivingHinge: true,
    notes: 'Fleksibilan — pogodan za living hinge i score linije za savijanje.',
    swatch: '#b08d57',
  },
};

export interface Material {
  id: MaterialId;
  label: string;
  thickness: number; // mm, arbitrary decimal
  kerf: number; // mm, arbitrary decimal
  minFingerWidthFactor: number;
  supportsLivingHinge: boolean;
  swatch: string;
}

export function resolveMaterial(
  id: MaterialId,
  thickness: number,
  kerf?: number,
  customLabel?: string,
): Material {
  if (id === 'custom') {
    return {
      id,
      label: customLabel?.trim() || 'Prilagođeni materijal',
      thickness,
      kerf: kerf ?? 0.1,
      minFingerWidthFactor: 2.0,
      supportsLivingHinge: false,
      swatch: '#9ca3af',
    };
  }
  const preset = MATERIAL_PRESETS[id];
  return {
    id,
    label: preset.label,
    thickness,
    kerf: kerf ?? preset.defaultKerf,
    minFingerWidthFactor: preset.minFingerWidthFactor,
    supportsLivingHinge: preset.supportsLivingHinge,
    swatch: preset.swatch,
  };
}

export function listMaterialPresets(): MaterialPreset[] {
  return Object.values(MATERIAL_PRESETS);
}
