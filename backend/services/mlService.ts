const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
// Default 30s for fast paths (embeddings).  Summarize gets a longer ceiling
// because HF Inference can take 30-60s when the model is cold-starting.
const ML_TIMEOUT_MS = 30_000;
const ML_SUMMARIZE_TIMEOUT_MS = 90_000;

export class MLServiceError extends Error {
  status?: number;
  /** True when the failure looks like an HF cold-start ("model warming up"). */
  warmingUp?: boolean;

  constructor(message: string, status?: number, warmingUp = false) {
    super(message);
    this.name = "MLServiceError";
    this.status = status;
    this.warmingUp = warmingUp;
  }
}

const isWarmingUpMessage = (msg: string): boolean =>
  /warming up|currently loading|estimated_time/i.test(msg);

const callML = async <T>(
  path: string,
  body: unknown,
  timeoutMs: number = ML_TIMEOUT_MS
): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${ML_SERVICE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      // 503 Service Unavailable + 504 Gateway Timeout from HF both indicate
      // a cold-start in practice, even when the body doesn't say so.
      const warmingUp =
        isWarmingUpMessage(detail) ||
        response.status === 503 ||
        response.status === 504;
      throw new MLServiceError(
        `ML service responded ${response.status}: ${detail || response.statusText}`,
        response.status,
        warmingUp
      );
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof MLServiceError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new MLServiceError(`ML service timed out after ${timeoutMs}ms`);
    }
    throw new MLServiceError(
      `ML service unreachable: ${(err as Error).message}`
    );
  } finally {
    clearTimeout(timer);
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const summarize = async (text: string): Promise<string> => {
  // Single retry on HF cold-start.  HF returns 503 with "currently loading"
  // for the first request to a less-popular model — usually clears within
  // ~20-40s, so wait briefly and try once more before giving up.
  try {
    const { summary } = await callML<{ summary: string }>(
      "/summarize",
      { text, max_length: 130, min_length: 30 },
      ML_SUMMARIZE_TIMEOUT_MS
    );
    return summary;
  } catch (err) {
    if (err instanceof MLServiceError && err.warmingUp) {
      console.warn("HF model warming up — waiting 8s and retrying once");
      await sleep(8000);
      const { summary } = await callML<{ summary: string }>(
        "/summarize",
        { text, max_length: 130, min_length: 30 },
        ML_SUMMARIZE_TIMEOUT_MS
      );
      return summary;
    }
    throw err;
  }
};

export const embed = async (text: string): Promise<number[]> => {
  const { embedding } = await callML<{ embedding: number[] }>("/embed", {
    text,
  });
  return embedding;
};
