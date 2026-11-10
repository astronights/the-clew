export type Domain = 'numbers' | 'sequences' | 'tiles' | 'words';

export type Colour = 'R' | 'B' | 'G' | 'Y';
export type Shape = 'circle' | 'triangle' | 'square' | 'star';
export interface Tile {
  c: Colour;
  s: Shape;
}

/** An item a rule can be tested against. The shape depends on the domain. */
export type NumberItem = number;
export type SequenceItem = [number, number, number];
export type TileItem = Tile[];
export type WordItem = string;
export type Item = NumberItem | SequenceItem | TileItem | WordItem;

export interface ItemOf {
  numbers: NumberItem;
  sequences: SequenceItem;
  tiles: TileItem;
  words: WordItem;
}

/** Any predicate we can reason about: playable rules and decoy-only rules. */
export interface RuleDef {
  id: string;
  domain: Domain;
  description: string;
  predicate: (item: Item) => boolean;
}

export interface Clue {
  item: Item;
  pass: boolean;
}

/** A playable daily rule. */
export interface Rule extends RuleDef {
  acceptedPhrasings: string[];
  decoyRuleIds: string[];
  clues: Clue[];
}

/** Authoring shape before clues are attached. */
export interface RuleSpec<D extends Domain> {
  id: string;
  description: string;
  predicate: (item: ItemOf[D]) => boolean;
  acceptedPhrasings: string[];
  decoys: string[];
}

export interface DecoySpec<D extends Domain> {
  id: string;
  description: string;
  predicate: (item: ItemOf[D]) => boolean;
}
