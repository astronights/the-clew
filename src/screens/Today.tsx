import { useCallback, useEffect, useState } from 'react';
import { ResultCard } from '../components/ResultCard';
import { fetchDistribution, postResult } from '../lib/api';
import { ruleForPuzzle } from '../lib/daily';
import type { GameState } from '../lib/game';
import { load, save } from '../lib/storage';
import { applyResult, loadStats, saveStats } from '../lib/stats';
import { Play } from './Play';

export function Today({ puzzleNo }: { puzzleNo: number }) {
  const rule = ruleForPuzzle(puzzleNo);
  const [counts, setCounts] = useState<number[] | null>(null);
  const [finished, setFinished] = useState(false);

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
    if (finished) return;
    const saved = load<{ status?: string } | null>(`clew:v2:game:${puzzleNo}`, null);
    if (saved?.status === 'solved' || saved?.status === 'failed') {
      setFinished(true);
      void fetchDistribution(puzzleNo).then(setCounts);
    }
  }, [puzzleNo, finished]);

  return (
    <Play
      rule={rule}
      storageKey={`clew:v2:game:${puzzleNo}`}
      seed={`daily:${puzzleNo}`}
      title={`No. ${puzzleNo}`}
      onFinish={onFinish}
      renderResult={(g) => <ResultCard rule={rule} solvedOn={g.solvedOn ?? 0} outcomes={g.outcomes} puzzleNo={puzzleNo} counts={counts} />}
    />
  );
}
