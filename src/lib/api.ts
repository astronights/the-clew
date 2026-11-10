import type { Verdict } from './game';

export interface JudgeResponse {
  verdict: Verdict;
  hint: string;
}

export class JudgeUnavailable extends Error {}

export async function judgeRemote(ruleId: string, guess: string): Promise<JudgeResponse> {
  let res: Response;
  try {
    res = await fetch('/api/judge', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ruleId, guess }),
    });
  } catch {
    throw new JudgeUnavailable('The judge is unreachable. Check your connection.');
  }
  if (res.status === 429) throw new JudgeUnavailable('Too many guesses this hour. Take a breather!');
  if (!res.ok) throw new JudgeUnavailable('The judge is napping. Try again in a moment.');
  const data = (await res.json()) as JudgeResponse;
  if (!['correct', 'close', 'wrong'].includes(data.verdict)) throw new JudgeUnavailable('Odd answer from the judge.');
  return data;
}

export async function postResult(puzzleNo: number, solvedOnClue: number): Promise<void> {
  try {
    await fetch('/api/result', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ puzzleNo, solvedOnClue }),
    });
  } catch {
    /* stats are best effort */
  }
}

export async function fetchDistribution(puzzleNo: number): Promise<number[] | null> {
  try {
    const res = await fetch(`/api/result?puzzle=${puzzleNo}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { counts?: number[] };
    return Array.isArray(data.counts) && data.counts.length === 6 ? data.counts : null;
  } catch {
    return null;
  }
}
