/**
 * Built-in rule domains, plus 'chain': an AI-written, admin-approved
 * "what comes next" puzzle (Only Connect Sequences style). Chain items are free text.
 */
export type Domain = 'numbers' | 'sequences' | 'tiles' | 'words' | 'chain';

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
  chain: string;
}

/** Any predicate we can reason about: playable rules and decoy-only rules. */
export interface RuleDef {
  id: string;
  domain: Domain;
  description: string;
  predicate: (item: Item) => boolean;
}

/** Clues (rows) per daily puzzle. Row 1 is shown; each guess reveals the next. */
export const CLUE_COUNT = 5;

export interface Clue {
  item: Item;
  pass: boolean;
}

/** A playable daily rule. */
export interface Rule extends RuleDef {
  /** Sequence puzzles only: what a player may type for each row (row i → accepted guesses). */
  rowAnswers?: string[][];
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
