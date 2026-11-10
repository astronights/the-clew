import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Domain, Item, Rule } from '../rules/types';
import { Exam } from '../components/Exam';
import { ItemInput } from '../components/inputs/ItemInput';
import { Sheet } from '../components/Sheet';
import { Thread } from '../components/Thread';
import { confetti } from '../components/confetti';
import { judgeRemote, JudgeUnavailable } from '../lib/api';
import { matchesAnyPhrasing } from '../lib/fuzzy';
import { applyVerdict, canGuessItem, giveUp, guessItem, isOver, MAX_CLUES, newGame, submitExam, type GameState } from '../lib/game';
import { describeItem } from '../lib/items';
import { load, save } from '../lib/storage';

export const DOMAIN_LABEL: Record<Domain, string> = {
  numbers: 'Numbers 1–999',
  sequences: 'Three-number sequences',
  tiles: 'Rows of tiles',
  words: 'Words',
};

interface Props {
  rule: Rule;
  storageKey: string;
  seed: string;
  /** Called once when the game finishes (solvedOn: 1–5, or 0 if unsolved). */
  onFinish?: (solvedOn: number) => void;
  renderResult: (state: GameState) => ReactNode;
}

function restore(rule: Rule, key: string, seed: string): GameState {
  const saved = load<GameState | null>(key, null);
  if (saved && saved.ruleId === rule.id && saved.seed === seed && Array.isArray(saved.entries)) return saved;
  return newGame(rule, seed);
}

export function Play({ rule, storageKey, seed, onFinish, renderResult }: Props) {
  const [game, setGame] = useState<GameState>(() => restore(rule, storageKey, seed));
  const [sheet, setSheet] = useState<null | 'item' | 'rule'>(null);
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
      onFinish?.(game.solvedOn ?? 0);
    }
  }, [game, onFinish]);

  const update = (next: GameState) => {
    const last = next.entries[next.entries.length - 1];
    if (next.status === 'solved') setAnnounce(`Solved on clue ${next.solvedOn}!`);
    else if (next.status === 'failed') setAnnounce(`Unsolved. The rule was: ${rule.description}`);
    else if (next.status === 'exam') setAnnounce('Correct guess! Now sort three items to prove it.');
    else if (last?.kind === 'clue') {
      const prev = next.entries[next.entries.length - 2];
      const tested = prev?.kind === 'guess' ? `${describeItem(rule.domain, prev.item)} ${prev.pass ? 'passes' : 'fails'}. ` : '';
      setAnnounce(`${tested}Clue ${last.index + 1}: ${describeItem(rule.domain, last.item)} ${last.pass ? 'passes' : 'fails'}.`);
    }
    setGame(next);
  };

  const onItem = (item: Item) => {
    setSheet(null);
    update(guessItem(rule, game, item));
  };

  const finalRound = game.revealed >= MAX_CLUES;

  return (
    <div className="play">
      <p className="domain-badge">
        <span aria-hidden="true">🧵</span> {DOMAIN_LABEL[rule.domain]} · clue {game.revealed} of {MAX_CLUES}
      </p>

      <Thread entries={game.entries} domain={rule.domain} />

      {game.status === 'exam' && game.exam && <Exam domain={rule.domain} questions={game.exam} onSubmit={(a) => update(submitExam(rule, game, a))} />}

      {isOver(game) && renderResult(game)}

      <div ref={endRef} className="end-spacer" />

      {game.status === 'playing' && (
        <div className="action-bar">
          {canGuessItem(game) && (
            <button className="btn btn-secondary" onClick={() => setSheet('item')}>
              <span aria-hidden="true">🧪</span> Test an item
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setSheet('rule')}>
            <span aria-hidden="true">💡</span> {finalRound ? 'Final guess: name it' : 'Name the rule'}
          </button>
          {finalRound && (
            <button className="btn btn-link" onClick={() => update(giveUp(game))}>
              Give up &amp; reveal
            </button>
          )}
        </div>
      )}

      <div className="sr-only" aria-live="polite">
        {announce}
      </div>

      {sheet === 'item' && (
        <Sheet title="Test an item" onClose={() => setSheet(null)}>
          <p className="muted">Make something you think passes. You'll see ✅ or ❌, then the next clue.</p>
          <ItemInput domain={rule.domain} onSubmit={onItem} submitLabel="Test it" />
        </Sheet>
      )}
      {sheet === 'rule' && (
        <Sheet title={finalRound ? 'Final guess' : 'Name the rule'} onClose={() => setSheet(null)}>
          <RuleGuess
            rule={rule}
            freeRetry={!game.closeRetries.includes(game.revealed)}
            onVerdict={(text, verdict, hint) => {
              setSheet(null);
              update(applyVerdict(rule, game, text, verdict, hint));
            }}
          />
        </Sheet>
      )}
    </div>
  );
}

function RuleGuess({
  rule,
  freeRetry,
  onVerdict,
}: {
  rule: Rule;
  freeRetry: boolean;
  onVerdict: (text: string, verdict: 'correct' | 'close' | 'wrong', hint?: string) => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    const guess = text.trim();
    if (guess.length < 3 || busy) return;
    if (matchesAnyPhrasing(guess, rule.acceptedPhrasings)) return onVerdict(guess, 'correct');
    setBusy(true);
    setError(null);
    try {
      const r = await judgeRemote(rule.id, guess);
      onVerdict(guess, r.verdict, r.hint);
    } catch (e) {
      setError(e instanceof JudgeUnavailable ? `${e.message} This guess didn't cost a clue.` : 'Something went wrong.');
      setBusy(false);
    }
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p className="muted">
        Describe the secret rule in your own words. If it's right, you'll prove it on 3 new items.
        {freeRetry ? ' A "close" answer gets one free retry.' : ''}
      </p>
      <label className="sr-only" htmlFor="rule-input">
        Your rule
      </label>
      <textarea
        id="rule-input"
        className="text-input"
        rows={3}
        maxLength={200}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder="e.g. the number contains a 5"
        disabled={busy}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-block" disabled={busy || text.trim().length < 3}>
        {busy ? (
          <>
            <span className="spin" aria-hidden="true">
              🧶
            </span>{' '}
            The judge is pondering…
          </>
        ) : (
          'Judge it'
        )}
      </button>
    </form>
  );
}
