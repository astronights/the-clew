import { useCallback, useEffect, useState } from 'react';
import { ResultCard } from '../components/ResultCard';
import { fetchDistribution, fetchPuzzle, postResult } from '../lib/api';
import { chainToRule, type ChainPuzzle } from '../lib/chain';
import { ruleForPuzzle } from '../lib/daily';
import type { GameState } from '../lib/game';
import { load, save } from '../lib/storage';
import { applyResult, loadStats, saveStats } from '../lib/stats';
import { Play } from './Play';

export function Today({ puzzleNo }: { puzzleNo: number }) {
  // undefined = still checking for an approved AI puzzle; null = none, play the built-in rule
  const [chain, setChain] = useState<ChainPuzzle | null | undefined>(undefined);
  const [counts, setCounts] = useState<number[] | null>(null);
  const storageKey = `clew:v2:game:${puzzleNo}`;

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
  const rule = chain ? chainToRule(puzzleNo, chain) : ruleForPuzzle(puzzleNo);

  return (
    <Play
      rule={rule}
      storageKey={storageKey}
      seed={`daily:${puzzleNo}`}
      title={`No. ${puzzleNo}`}
      onFinish={onFinish}
      renderResult={(g) => (
        <ResultCard
          rule={rule}
          solvedOn={g.solvedOn ?? 0}
          outcomes={g.outcomes}
          puzzleNo={puzzleNo}
          counts={counts}
          reveal={chain ? { answer: chain.answer, explanation: chain.explanation } : undefined}
        />
      )}
    />
  );
}
