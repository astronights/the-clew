import { useMemo, useState } from 'react';
import { ResultCard } from '../components/ResultCard';
import { pastRules } from '../lib/daily';
import { load, remove, save } from '../lib/storage';
import { Play } from './Play';

const KEY = 'clew:practice:current';
const GAME_KEY = 'clew:practice:game';

export function Practice({ today }: { today: number }) {
  const past = useMemo(() => pastRules(today), [today]);
  const [current, setCurrent] = useState<{ ruleId: string; round: number } | null>(() => load(KEY, null));
  const entry = current ? past.find((p) => p.rule.id === current.ruleId) : undefined;

  const pick = () => {
    const others = past.filter((p) => p.rule.id !== current?.ruleId);
    const choice = others[Math.floor(Math.random() * others.length)] ?? past[0];
    if (!choice) return;
    const next = { ruleId: choice.rule.id, round: (current?.round ?? 0) + 1 };
    remove(GAME_KEY);
    save(KEY, next);
    setCurrent(next);
  };

  if (!past.length) return <p className="card">No past puzzles yet — come back tomorrow!</p>;

  if (!entry || !current) {
    return (
      <section className="card practice-intro">
        <h2>Practice</h2>
        <p>Replay a random rule from an earlier day. Practice games don't touch your stats or streak.</p>
        <p className="muted">{past.length} past rules available.</p>
        <button className="btn btn-primary btn-block" onClick={pick}>
          🧶 Pull a random thread
        </button>
      </section>
    );
  }

  return (
    <>
      <p className="muted center">Practice · rule from puzzle #{entry.puzzleNo}</p>
      <Play
        key={`${current.ruleId}:${current.round}`}
        rule={entry.rule}
        storageKey={GAME_KEY}
        seed={`practice:${current.ruleId}:${current.round}`}
        renderResult={(g) => <ResultCard rule={entry.rule} solvedOn={g.solvedOn ?? 0} practice onAgain={pick} />}
      />
    </>
  );
}
