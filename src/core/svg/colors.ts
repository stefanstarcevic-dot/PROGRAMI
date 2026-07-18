/**
 * Layer color convention followed by this engine, chosen to match what
 * LightBurn / RDWorks / LaserGRBL treat as their default "by color"
 * operation assignment, while also reading unambiguously in Illustrator,
 * Inkscape and CorelDraw where layers are named groups rather than
 * color-keyed operations.
 */
export const LAYER_COLORS = {
  cut: '#FF0000', // through-cut — red, the near-universal laser convention
  engrave: '#0000FF', // vector engrave / fill — blue
  score: '#00FF00', // score / fold line, light power — green
  text: '#000000', // engraved text — black, own layer so power can be tuned
  center: '#FF00FF', // center marks / registration — magenta
  reference: '#888888', // non-cut reference geometry (labels, dimensions)
} as const;

export type LayerName = keyof typeof LAYER_COLORS;

export const LAYER_LABELS: Record<LayerName, string> = {
  cut: 'Cut',
  engrave: 'Engrave',
  score: 'Score',
  text: 'Text',
  center: 'Center',
  reference: 'Reference',
};
