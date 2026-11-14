import { useCallback, useEffect, useState } from 'react';
import { ResultCard } from '../components/ResultCard';
import { fetchDistribution, fetchPuzzle, postResult } from '../lib/api';
import { chainRuleId, type ChainPuzzle } from '../lib/chain';
import { msUntilNextPuzzle } from '../lib/daily';
import type { GameState } from '../lib/game';
import { fromChain } from '../lib/puzzle';
import { load, save } from '../lib/storage';
import { applyResult, loadStats, saveStats } from '../lib/stats';
import { Play } from './Play';

export function Today({ puzzleNo }: { puzzleNo: number }) {
  // undefined = still loading; null = no approved puzzle for today
  const [chain, setChain] = useState<ChainPuzzle | null | undefined>(undefined);
  const [counts, setCounts] = useState<number[] | null>(null);
  const storageKey = `clew:v3:game:${puzzleNo}`;

  useEffect(() => {
    let live = true;
    void fetchPuzzle(puzzleNo).then((p) => live && setChain(p));
    return () => {
      live = false;
    };
  }, [puzzleNo]);

  const onFinish = useCallback(
    async (g: GameState) => {
      const solvedOn = g.solvedOn ?? 0;
      saveStats(applyResult(loadStats(), puzzleNo, solvedOn));
      const postedKey = `clew:posted:${puzzleNo}`;
      if (!load<boolean>(postedKey, false)) {
        save(postedKey, true);
        await postResult(puzzleNo, solvedOn);
      }
      setCounts(await fetchDistribution(puzzleNo));
    },
    [puzzleNo],
  );

  // already finished earlier today: just fetch the distribution
  useEffect(() => {
    const saved = load<{ status?: string } | null>(storageKey, null);
    if (saved?.status === 'solved' || saved?.status === 'failed') void fetchDistribution(puzzleNo).then(setCounts);
  }, [puzzleNo, storageKey]);

  if (chain === undefined) return <p className="note loading">Untangling today's clew…</p>;
  if (chain === null) return <NotReady />;
  const puzzle = fromChain(chainRuleId(puzzleNo), chain);

  return (
    <Play
      puzzle={puzzle}
      storageKey={storageKey}
      seed={`daily:${puzzleNo}`}
      title={`No. ${puzzleNo}`}
      onFinish={onFinish}
      renderResult={(g) => <ResultCard puzzle={puzzle} solvedOn={g.solvedOn ?? 0} outcomes={g.outcomes} puzzleNo={puzzleNo} counts={counts} />}
    />
  );
}

/** Shown only if no puzzle was approved for today (the desk sends reminders so this shouldn't happen). */
function NotReady() {
  const ms = msUntilNextPuzzle();
  const h = Math.floor(ms / 3_600_000);
  return (
    <section className="not-ready">
      <h2>Today's clew is still being spun.</h2>
      <p className="note">Check back a little later{h > 1 ? `, or come back for tomorrow's in ${h}h` : ''}.</p>
    </section>
  );
}
