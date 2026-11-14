/** Turns a failed Gemini HTTP response into a clear message, especially quota (429) errors. */
export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Seconds Google asks us to wait, when it says so. */
    readonly retryAfter: number | null,
    /** "minute" | "day" | null: which quota ran out, when we can tell. */
    readonly window: 'minute' | 'day' | null,
  ) {
    super(message);
  }
}

interface GoogleError {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: { '@type'?: string; retryDelay?: string; violations?: { quotaId?: string; quotaMetric?: string }[] }[];
  };
}

export function describeGeminiError(status: number, bodyText: string, model: string): GeminiError {
  let body: GoogleError = {};
  try {
    body = JSON.parse(bodyText) as GoogleError;
  } catch {
    /* not JSON */
  }
  const details = body.error?.details ?? [];
  const delay = details.find((d) => d.retryDelay)?.retryDelay;
  const retryAfter = delay ? Math.ceil(parseFloat(delay)) : null;
  const quotaIds = details.flatMap((d) => d.violations ?? []).map((v) => `${v.quotaId ?? ''} ${v.quotaMetric ?? ''}`).join(' ');
  const window: 'minute' | 'day' | null = /PerDay/i.test(quotaIds) ? 'day' : /PerMinute/i.test(quotaIds) ? 'minute' : null;
  const freeTier = /FreeTier/i.test(quotaIds);
  const search = /search|grounding/i.test(quotaIds);

  if (status === 429) {
    const what = search ? 'Google Search grounding' : model;
    let msg: string;
    if (window === 'day')
      msg = `Gemini's daily ${freeTier ? 'free-tier ' : ''}limit for ${what} is used up. It resets tomorrow (Pacific time), or enable billing in Google AI Studio.`;
    else if (window === 'minute')
      msg = `Gemini's per-minute limit for ${what} was hit. Wait ${retryAfter ?? 60}s and try again.`;
    else
      msg = `Gemini quota exceeded for ${what}${retryAfter ? ` (retry in ${retryAfter}s)` : ''}. If this keeps happening, this model may have no free tier on your key: try GEMINI_MODEL=gemini-2.5-flash or enable billing.`;
    return new GeminiError(msg, status, retryAfter, window);
  }
  if (status === 404 || (status === 400 && /model/i.test(body.error?.message ?? '')))
    return new GeminiError(`Gemini doesn't recognise the model "${model}". Check GEMINI_MODEL / GEMINI_GENERATOR_MODEL.`, status, null, null);
  if (status === 401 || status === 403) return new GeminiError('Gemini rejected the API key. Check GEMINI_API_KEY.', status, null, null);
  return new GeminiError(`Gemini error ${status}: ${(body.error?.message ?? bodyText).slice(0, 200)}`, status, retryAfter, null);
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
