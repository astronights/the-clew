import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GuessInput, type GuessValue } from '../components/GuessInput';
import { Thread } from '../components/Thread';
import { confetti } from '../components/confetti';
import { judgeRemote, JudgeUnavailable } from '../lib/api';
import { matchesAnyPhrasing } from '../lib/fuzzy';
import { canGuess, giveUp, guessesByRow, guessNext, guessRule, isLastRow, isOver, newGame, next, ROWS, type GameState } from '../lib/game';
import type { Puzzle } from '../lib/puzzle';
import { load, save } from '../lib/storage';

interface Props {
  puzzle: Puzzle;
  storageKey: string;
  seed: string;
  /** Shown top-left, e.g. "No. 45". */
  title: string;
  /** Called once when the game finishes. */
  onFinish?: (state: GameState) => void;
  renderResult: (state: GameState) => ReactNode;
}

function restore(p: Puzzle, key: string, seed: string): GameState {
  const saved = load<GameState | null>(key, null);
  const valid = saved && saved.puzzleId === p.id && saved.seed === seed && Array.isArray(saved.entries) && Array.isArray(saved.outcomes);
  return valid ? saved : newGame(p, seed);
}

const RULE_EXAMPLE = 'e.g. Bond films in order';

export function Play({ puzzle, storageKey, seed, title, onFinish, renderResult }: Props) {
  const [game, setGame] = useState<GameState>(() => restore(puzzle, storageKey, seed));
  const [guess, setGuess] = useState<GuessValue>({ text: '', error: null });
  const [guessKey, setGuessKey] = useState(0);
  const [ruleText, setRuleText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guessError, setGuessError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const finishedRef = useRef(isOver(game));
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => save(storageKey, game), [storageKey, game]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [game.revealed, game.status]);
  useEffect(() => {
    if (isOver(game) && !finishedRef.current) {
      finishedRef.current = true;
      if (game.status === 'solved') confetti();
      onFinish?.(game);
    }
  }, [game, onFinish]);

  const over = isOver(game);
  const last = isLastRow(game);
  const typed = guess.text !== '';

  const apply = (nextState: GameState, prefix = '') => {
    let msg = prefix;
    if (nextState.status === 'solved') msg += `That's it! Solved on clue ${nextState.solvedOn}.`;
    else if (nextState.status === 'failed') msg += `The rule was: ${puzzle.connection}`;
    else if (nextState.revealed > game.revealed) msg += `Clue ${nextState.revealed}: ${puzzle.rows[nextState.revealed - 1]}.`;
    setAnnounce(msg);
    setError(null);
    setGuessError(null);
    setFeedback(null);
    setGame(nextState);
  };

  const onGuess = () => {
    setGuessError(null);
    if (!typed) return apply(next(game));
    if (guess.error) return setGuessError(guess.error);
    const after = guessNext(puzzle, game, guess.text);
    const right = guessesByRow(after).get(game.revealed)?.pass;
    apply(after, `Your guess ${guess.text} was ${right ? 'right' : 'wrong'}. `);
    setGuess({ text: '', error: null });
    setGuessKey((k) => k + 1);
  };

  const onRule = async () => {
    setError(null);
    const text = ruleText.trim();
    if (text.length < 3) return setError('Describe the rule in a few words.');
    let correct = matchesAnyPhrasing(text, [puzzle.connection, ...puzzle.acceptedPhrasings]);
    if (!correct) {
      setBusy(true);
      try {
        correct = (await judgeRemote(puzzle.id, text)).verdict === 'correct';
      } catch (e) {
        setBusy(false);
        return setError(e instanceof JudgeUnavailable ? `${e.message} Nothing was used up.` : 'Something went wrong.');
      }
      setBusy(false);
    }
    apply(guessRule(game, text, correct), correct ? '' : 'Not it. ');
    if (!correct) setFeedback(`“${text}” · not it.`);
  };

  return (
    <div className="play">
      <div className="play-meta">
        <span>{title} · what comes next</span>
        {!over && (
          <span>
            Clue {game.revealed} of {ROWS}
          </span>
        )}
      </div>
      {!over && <p className="play-sub">What's the sequence? Fewer clues, better score.</p>}

      <Thread puzzle={puzzle} revealed={game.revealed} over={over} guesses={guessesByRow(game)} />

      {over && renderResult(game)}
      <div ref={endRef} />

      {!over && (
        <div className="answer">
          {canGuess(game) ? (
            <form
              className="field-row"
              onSubmit={(e) => {
                e.preventDefault();
                onGuess();
              }}
            >
              <GuessInput resetKey={guessKey} onChange={setGuess} disabled={busy} />
              <button type="submit" className="btn" disabled={busy}>
                {typed ? 'Guess ›' : 'Next ›'}
              </button>
              {guessError && (
                <p className="form-error field-row-error" role="alert">
                  {guessError}
                </p>
              )}
            </form>
          ) : (
            <p className="note">Last clue. Name the rule, or give up.</p>
          )}
          <div className="answer-sep" />
          <form
            className="field-row"
            onSubmit={(e) => {
              e.preventDefault();
              void onRule();
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
                placeholder={RULE_EXAMPLE}
                onChange={(e) => setRuleText(e.target.value)}
                disabled={busy}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? <span className="spin" aria-label="Judging" /> : 'Submit'}
            </button>
          </form>
          {feedback && !error && <p className="said">{feedback}</p>}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <p className="note">{last ? 'One last guess at the rule.' : 'Each guess or wrong rule opens the next clue. Only the rule is scored.'}</p>
          {last && (
            <button type="button" className="btn btn-link" onClick={() => apply(giveUp(game))} disabled={busy}>
              Give up and show the answer
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
