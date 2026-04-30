const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const ML_TIMEOUT_MS = 30_000;

export class MLServiceError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "MLServiceError";
    this.status = status;
  }
}

const callML = async <T>(path: string, body: unknown): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

  try {
    const response = await fetch(`${ML_SERVICE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new MLServiceError(
        `ML service responded ${response.status}: ${detail || response.statusText}`,
        response.status
      );
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof MLServiceError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new MLServiceError(`ML service timed out after ${ML_TIMEOUT_MS}ms`);
    }
    throw new MLServiceError(
      `ML service unreachable: ${(err as Error).message}`
    );
  } finally {
    clearTimeout(timer);
  }
};

export const summarize = async (text: string): Promise<string> => {
  const { summary } = await callML<{ summary: string }>("/summarize", {
    text,
    max_length: 130,
    min_length: 30,
  });
  return summary;
};

export const embed = async (text: string): Promise<number[]> => {
  const { embedding } = await callML<{ embedding: number[] }>("/embed", {
    text,
  });
  return embedding;
};
