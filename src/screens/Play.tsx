import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Domain, Rule } from '../rules/types';
import { FifthInput, type FifthValue } from '../components/inputs/FifthInput';
import { Thread } from '../components/Thread';
import { confetti } from '../components/confetti';
import { judgeRemote, JudgeUnavailable } from '../lib/api';
import { matchesAnyPhrasing } from '../lib/fuzzy';
import { CLUE_COUNT, isLastClue, isOver, newGame, skip, submit, type GameState } from '../lib/game';
import { describeItem, itemKey, RULE_EXAMPLE } from '../lib/items';
import { load, save } from '../lib/storage';

export const DOMAIN_LABEL: Record<Domain, string> = {
  numbers: 'numbers',
  sequences: 'sequences',
  tiles: 'tiles',
  words: 'words',
};

interface Props {
  rule: Rule;
  storageKey: string;
  seed: string;
  /** Shown top-left, e.g. "No. 45". */
  title: string;
  /** Called once when the game finishes (solvedOn: 1–4, or 0 if unsolved). */
  onFinish?: (state: GameState) => void;
  renderResult: (state: GameState) => ReactNode;
}

function restore(rule: Rule, key: string, seed: string): GameState {
  const saved = load<GameState | null>(key, null);
  if (saved && saved.ruleId === rule.id && saved.seed === seed && Array.isArray(saved.entries) && Array.isArray(saved.outcomes)) return saved;
  return newGame(rule, seed);
}

export function Play({ rule, storageKey, seed, title, onFinish, renderResult }: Props) {
  const [game, setGame] = useState<GameState>(() => restore(rule, storageKey, seed));
  const [fifth, setFifth] = useState<FifthValue>({ item: null, error: null });
  const [fifthKey, setFifthKey] = useState(0);
  const [ruleText, setRuleText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const finishedRef = useRef(isOver(game));
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => save(storageKey, game), [storageKey, game]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [game.entries.length, game.status]);
  useEffect(() => {
    if (isOver(game) && !finishedRef.current) {
      finishedRef.current = true;
      if (game.status === 'solved') confetti();
      onFinish?.(game);
    }
  }, [game, onFinish]);

  const over = isOver(game);
  const last = isLastClue(game);

  const apply = (next: GameState) => {
    const newest = next.entries[next.entries.length - 1];
    if (next.status === 'solved') setAnnounce(`That's it! Solved on clue ${next.solvedOn}.`);
    else if (next.status === 'failed') setAnnounce(`Out of clues. The rule was: ${rule.description}`);
    else if (newest?.kind === 'clue') setAnnounce(`Clue ${newest.index + 1}: ${describeItem(rule.domain, newest.item)} ${newest.pass ? 'fits' : "doesn't fit"}.`);
    setGame(next);
  };

  const onSubmit = async () => {
    setError(null);
    const guess = ruleText.trim();
    if (!fifth.item) return setError('Add your 5th first.');
    if (fifth.error) return setError(fifth.error);
    if (guess.length < 3) return setError('Describe the rule in a few words.');
    const key = itemKey(rule.domain, fifth.item);
    if (game.entries.some((e) => itemKey(rule.domain, e.item) === key)) return setError("That one's already on the thread. Try a new 5th.");

    let correct = matchesAnyPhrasing(guess, rule.acceptedPhrasings);
    if (!correct) {
      setBusy(true);
      try {
        correct = (await judgeRemote(rule.id, guess)).verdict === 'correct';
      } catch (e) {
        setBusy(false);
        return setError(e instanceof JudgeUnavailable ? `${e.message} Nothing was used up.` : 'Something went wrong.');
      }
      setBusy(false);
    }
    const pass = rule.predicate(fifth.item);
    apply(submit(rule, game, fifth.item, guess, correct));
    if (!correct) setAnnounce(`Your 5th ${pass ? 'fits' : "doesn't fit"}. The rule isn't it.`);
    setFifth({ item: null, error: null });
    setFifthKey((k) => k + 1);
  };

  return (
    <div className="play">
      <div className="play-meta">
        <span>
          {title} · {DOMAIN_LABEL[rule.domain]}
        </span>
        {!over && (
          <span>
            Clue {game.revealed} of {CLUE_COUNT}
          </span>
        )}
      </div>
      {!over && <p className="play-sub">What's the rule? Fewer clues, better score.</p>}

      <Thread entries={game.entries} domain={rule.domain} rule={rule} revealed={game.revealed} over={over} />

      {over && renderResult(game)}
      <div ref={endRef} />

      {!over && (
        <form
          className="answer"
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit();
          }}
        >
          <FifthInput domain={rule.domain} resetKey={fifthKey} onChange={setFifth} disabled={busy} />
          <div className="field">
            <label className="field-label" htmlFor="rule-input">
              The rule · in your words
            </label>
            <input
              id="rule-input"
              className="input"
              value={ruleText}
              maxLength={200}
              autoComplete="off"
              placeholder={RULE_EXAMPLE[rule.domain]}
              onChange={(e) => setRuleText(e.target.value)}
              disabled={busy}
            />
          </div>
          {(error || fifth.error) && (
            <p className="form-error" role="alert">
              {error ?? fifth.error}
            </p>
          )}
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => apply(skip(rule, game))} disabled={busy}>
              {last ? 'Give up' : 'Skip ›'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? (
                <>
                  <span className="spin" aria-hidden="true" /> Judging…
                </>
              ) : last ? (
                'Final answer'
              ) : (
                'Submit'
              )}
            </button>
          </div>
          <p className="note">{last ? 'Last clue. One more go.' : 'A miss or a skip shows the next clue.'}</p>
        </form>
      )}

      <div className="sr-only" aria-live="polite">
        {announce}
      </div>
    </div>
  );
}
