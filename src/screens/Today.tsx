import { useCallback, useEffect, useState } from 'react';
import { ResultCard } from '../components/ResultCard';
import { fetchDistribution, postResult } from '../lib/api';
import { ruleForPuzzle } from '../lib/daily';
import { load, save } from '../lib/storage';
import { applyResult, loadStats, saveStats } from '../lib/stats';
import { Play } from './Play';

export function Today({ puzzleNo }: { puzzleNo: number }) {
  const rule = ruleForPuzzle(puzzleNo);
  const [counts, setCounts] = useState<number[] | null>(null);
  const [finished, setFinished] = useState(false);

  const onFinish = useCallback(
    async (solvedOn: number) => {
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
    const saved = load<{ status?: string } | null>(`clew:game:${puzzleNo}`, null);
    if (saved?.status === 'solved' || saved?.status === 'failed') {
      setFinished(true);
      void fetchDistribution(puzzleNo).then(setCounts);
    }
  }, [puzzleNo, finished]);

  return (
    <Play
      rule={rule}
      storageKey={`clew:game:${puzzleNo}`}
      seed={`daily:${puzzleNo}`}
      onFinish={onFinish}
      renderResult={(g) => <ResultCard rule={rule} solvedOn={g.solvedOn ?? 0} puzzleNo={puzzleNo} counts={counts} />}
    />
  );
}
