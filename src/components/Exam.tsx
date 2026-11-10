import { useState } from 'react';
import type { Domain } from '../rules/types';
import type { ExamQuestion } from '../lib/exam';
import { ItemView } from './ItemView';

/** Three confirmation questions: the player marks each unseen item ✅ or ❌. */
export function Exam({ domain, questions, onSubmit }: { domain: Domain; questions: ExamQuestion[]; onSubmit: (answers: boolean[]) => void }) {
  const [answers, setAnswers] = useState<(boolean | null)[]>(questions.map(() => null));
  const set = (i: number, v: boolean) => setAnswers(answers.map((a, j) => (j === i ? v : a)));
  const done = answers.every((a) => a !== null);
  return (
    <section className="exam card pop-in" aria-labelledby="exam-title">
      <h2 id="exam-title">Prove it!</h2>
      <p className="muted">If your rule is right, you can sort these. Get all three to solve.</p>
      <ol className="exam-list">
        {questions.map((q, i) => (
          <li key={i} className="exam-row">
            <ItemView domain={domain} item={q.item} size="sm" />
            <div className="toggle" role="group" aria-label={`Item ${i + 1}`}>
              <button type="button" className={`toggle-btn is-pass ${answers[i] === true ? 'is-on' : ''}`} aria-pressed={answers[i] === true} onClick={() => set(i, true)}>
                <span aria-hidden="true">✓</span> Passes
              </button>
              <button type="button" className={`toggle-btn is-fail ${answers[i] === false ? 'is-on' : ''}`} aria-pressed={answers[i] === false} onClick={() => set(i, false)}>
                <span aria-hidden="true">✗</span> Fails
              </button>
            </div>
          </li>
        ))}
      </ol>
      <button className="btn btn-primary btn-block" disabled={!done} onClick={() => onSubmit(answers as boolean[])}>
        Check my answers
      </button>
    </section>
  );
}
