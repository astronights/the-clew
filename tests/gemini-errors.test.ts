import { describe, expect, it } from 'vitest';
import { describeGeminiError } from '../api/_lib/geminiErrors';

const body = (quotaId: string, retryDelay?: string) =>
  JSON.stringify({
    error: {
      code: 429,
      message: 'You exceeded your current quota, please check your plan and billing details.',
      status: 'RESOURCE_EXHAUSTED',
      details: [
        { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests', quotaId }] },
        ...(retryDelay ? [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay }] : []),
      ],
    },
  });

describe('Gemini quota errors', () => {
  it('explains a per-minute limit with the wait time', () => {
    const e = describeGeminiError(429, body('GenerateRequestsPerMinutePerProjectPerModel-FreeTier', '37s'), 'gemini-2.5-flash');
    expect(e.window).toBe('minute');
    expect(e.retryAfter).toBe(37);
    expect(e.message).toMatch(/per-minute limit for gemini-2.5-flash.*Wait 37s/);
  });
  it('explains a daily free-tier limit', () => {
    const e = describeGeminiError(429, body('GenerateRequestsPerDayPerProjectPerModel-FreeTier'), 'gemini-3.8-flash');
    expect(e.window).toBe('day');
    expect(e.message).toMatch(/daily free-tier limit for gemini-3.8-flash is used up/);
  });
  it('names Search grounding when that is what ran out', () => {
    const e = describeGeminiError(429, body('SearchGroundingRequestsPerDayPerProject-FreeTier'), 'gemini-2.5-flash');
    expect(e.message).toMatch(/Google Search grounding/);
  });
  it('suggests another model when the quota is unexplained', () => {
    expect(describeGeminiError(429, '{}', 'gemini-3.8-flash').message).toMatch(/no free tier/);
  });
  it('explains bad keys and unknown models', () => {
    expect(describeGeminiError(403, '{}', 'x').message).toMatch(/API key/);
    expect(describeGeminiError(404, '{}', 'gemini-9').message).toMatch(/doesn't recognise the model "gemini-9"/);
  });
});
