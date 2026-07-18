export type EdgeJointType =
  | 'finger' // castellated box/finger joint against a perpendicular panel
  | 'flat' // plain butt edge — glued, open, or screwed
  | 'living-hinge' // flexible slit pattern, panel continues as one piece
  | 'knuckle-hinge' // real pivoting rod hinge
  | 'mortise' // slot that receives a mating tenon
  | 'tenon' // tab that inserts into a mating mortise
  | 'snap-fit'; // cantilever snap tab / catch hole

export interface EdgeJointAssignment {
  type: EdgeJointType;
  /** id of the panel this edge mates with, for renderers/validators that
   * need to cross-reference the pair. */
  matingPanelId?: string;
}
