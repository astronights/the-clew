import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Thread } from '../components/Thread';
import { confetti } from '../components/confetti';
import { judgeRemote, JudgeUnavailable } from '../lib/api';
import { canOpenNext, giveUp, guessRule, isLastRow, isOver, newGame, next, ROWS, type GameState } from '../lib/game';
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

const RULE_EXAMPLE = 'e.g. Bond films';

export function Play({ puzzle, storageKey, seed, title, onFinish, renderResult }: Props) {
  const [game, setGame] = useState<GameState>(() => restore(puzzle, storageKey, seed));
  const [ruleText, setRuleText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const apply = (nextState: GameState, prefix = '') => {
    let msg = prefix;
    if (nextState.status === 'solved') msg += `That's it! Solved on clue ${nextState.solvedOn}.`;
    else if (nextState.status === 'failed') msg += `The rule was: ${puzzle.connection}`;
    else if (nextState.revealed > game.revealed) msg += `Clue ${nextState.revealed}: ${puzzle.rows[nextState.revealed - 1]}.`;
    setAnnounce(msg);
    setError(null);
    setFeedback(null);
    setGame(nextState);
  };

  const onRule = async () => {
    setError(null);
    const text = ruleText.trim();
    if (text.length < 3) return setError('Describe the rule in a few words.');
    // every rule guess is judged by the AI judge
    let correct = false;
    setBusy(true);
    try {
      correct = (await judgeRemote(puzzle.id, text, game.revealed)).verdict === 'correct';
    } catch (e) {
      setBusy(false);
      return setError(e instanceof JudgeUnavailable ? `${e.message} Nothing was used up.` : 'Something went wrong.');
    }
    setBusy(false);
    apply(guessRule(game, text, correct), correct ? '' : 'Not it. ');
    if (!correct) setFeedback(`“${text}” · not it.`);
  };

  return (
    <div className="play">
      <div className="play-meta">
        <span>{title}</span>
        {!over && (
          <span>
            Clue {game.revealed} of {ROWS}
          </span>
        )}
      </div>

      <Thread puzzle={puzzle} revealed={game.revealed} over={over} />

      {over && renderResult(game)}
      <div ref={endRef} />

      {!over && (
        <div className="answer">
          <form
            className="field-row"
            onSubmit={(e) => {
              e.preventDefault();
              void onRule();
            }}
          >
            <div className="field">
              <label className="field-label" htmlFor="rule-input">
                What's the sequence?
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
          {canOpenNext(game) ? (
            <button type="button" className="btn btn-block next-clue" onClick={() => apply(next(game))} disabled={busy}>
              Next clue ›
            </button>
          ) : (
            last && (
              <>
                <p className="note">Last clue. Name the sequence, or give up.</p>
                <button type="button" className="btn btn-link" onClick={() => apply(giveUp(game))} disabled={busy}>
                  Give up and show the answer
                </button>
              </>
            )
          )}
        </div>
      )}

      <div className="sr-only" aria-live="polite">
        {announce}
      </div>
    </div>
  );
}
