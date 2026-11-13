import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Domain, Rule } from '../rules/types';
import { FifthInput, type FifthValue } from '../components/inputs/FifthInput';
import { Thread } from '../components/Thread';
import { confetti } from '../components/confetti';
import { judgeRemote, JudgeUnavailable } from '../lib/api';
import { matchesAnyPhrasing } from '../lib/fuzzy';
import { canTest, CLUE_COUNT, giveUp, guessRule, isLastClue, isOver, newGame, testItem, type GameState } from '../lib/game';
import { describeItem, itemKey, RULE_EXAMPLE } from '../lib/items';
import { load, save } from '../lib/storage';

export const DOMAIN_LABEL: Record<Domain, string> = {
  numbers: 'numbers',
  sequences: 'sequences',
  tiles: 'tiles',
  words: 'words',
  chain: 'what comes next',
};

interface Props {
  rule: Rule;
  storageKey: string;
  seed: string;
  /** Shown top-left, e.g. "No. 45". */
  title: string;
  /** Called once when the game finishes. */
  onFinish?: (state: GameState) => void;
  renderResult: (state: GameState) => ReactNode;
}

function restore(rule: Rule, key: string, seed: string): GameState {
  const saved = load<GameState | null>(key, null);
  const valid = saved && saved.ruleId === rule.id && saved.seed === seed && Array.isArray(saved.entries) && Array.isArray(saved.outcomes);
  return valid ? saved : newGame(rule, seed);
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

  const apply = (next: GameState, prefix = '') => {
    const newest = next.entries[next.entries.length - 1];
    let msg = prefix;
    if (next.status === 'solved') msg += `That's it! Solved on clue ${next.solvedOn}.`;
    else if (next.status === 'failed') msg += `The rule was: ${rule.description}`;
    else if (newest?.kind === 'clue') msg += `Clue ${newest.index + 1}: ${describeItem(rule.domain, newest.item)} ${newest.pass ? 'fits' : "doesn't fit"}.`;
    setAnnounce(msg);
    setError(null);
    setGame(next);
  };

  const onTest = () => {
    setError(null);
    if (!fifth.item) return setError(rule.domain === 'chain' ? 'Type your guess for the 5th first.' : 'Add an item to test first.');
    if (fifth.error) return setError(fifth.error);
    const key = itemKey(rule.domain, fifth.item);
    const seen = game.entries.some((e) => e.kind !== 'guess' && itemKey(rule.domain, e.item) === key);
    if (seen) return setError("That one's already on the thread. Try a new one.");
    const pass = rule.predicate(fifth.item);
    apply(testItem(rule, game, fifth.item), `${describeItem(rule.domain, fifth.item)} ${pass ? 'fits' : "doesn't fit"}. `);
    setFifth({ item: null, error: null });
    setFifthKey((k) => k + 1);
  };

  const onGuess = async () => {
    setError(null);
    const guess = ruleText.trim();
    if (guess.length < 3) return setError('Describe the rule in a few words.');
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
    apply(guessRule(rule, game, guess, correct), correct ? '' : 'Not it. ');
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
        <div className="answer">
          {canTest(game) ? (
            <form
              className="field-row"
              onSubmit={(e) => {
                e.preventDefault();
                onTest();
              }}
            >
              <FifthInput domain={rule.domain} resetKey={fifthKey} onChange={setFifth} disabled={busy} />
              <button type="submit" className="btn" disabled={busy}>
                {rule.domain === 'chain' ? 'Guess ›' : 'Test ›'}
              </button>
            </form>
          ) : (
            <p className="note">Last clue: no more tests. Name the rule, or give up.</p>
          )}
          <div className="answer-sep" />
          <form
            className="field-row"
            onSubmit={(e) => {
              e.preventDefault();
              void onGuess();
            }}
          >
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
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? <span className="spin" aria-label="Judging" /> : 'Submit'}
            </button>
          </form>
          {(error || fifth.error) && (
            <p className="form-error" role="alert">
              {error ?? fifth.error}
            </p>
          )}
          <p className="note">{last ? 'One last guess at the rule.' : 'A test or a wrong rule shows the next clue. Only the rule is scored.'}</p>
          {last && (
            <button type="button" className="btn btn-link" onClick={() => apply(giveUp(game))} disabled={busy}>
              Give up and show the rule
            </button>
          )}
        </div>
      )}

      <div className="sr-only" aria-live="polite">
        {announce}
      </div>
    </div>
  );
}
