type GeminiPart = { text: string };
type GeminiCandidate = {
  content?: { parts?: GeminiPart[] };
};
type GeminiResponse = {
  candidates?: GeminiCandidate[];
};

type GeminiErrorResponse = {
  error?: {
    code?: number;
    message?: string;
  };
};

export class GeminiApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GeminiApiError";
    this.status = status;
  }
}

function normalizeGeminiError(status: number, bodyText: string): GeminiApiError {
  let parsed: GeminiErrorResponse | null = null;
  try {
    parsed = JSON.parse(bodyText) as GeminiErrorResponse;
  } catch {
    parsed = null;
  }

  const serverMessage = parsed?.error?.message || bodyText;
  if (status === 429) {
    const retryMatch = serverMessage.match(/retry in ([\d.]+)s/i);
    const retrySeconds = retryMatch ? Math.ceil(Number(retryMatch[1])) : null;
    const retryText =
      retrySeconds !== null ? ` Retry after about ${retrySeconds}s.` : "";
    return new GeminiApiError(
      `Gemini quota exceeded. Enable billing or use a key/project with quota.${retryText}`,
      429
    );
  }

  if (status === 401 || status === 403) {
    return new GeminiApiError(
      "Gemini authentication failed. Check GEMINI_API_KEY and API permissions.",
      status
    );
  }

  return new GeminiApiError(
    `Gemini API error (${status}): ${serverMessage}`,
    status
  );
}

export async function generateGeminiText(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  if (!apiKey) {
    throw new GeminiApiError(
      "GEMINI_API_KEY is missing. Set it in .env.local.",
      500
    );
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          topP: 0.95,
          responseMimeType: "application/json",
        },
      }),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw normalizeGeminiError(res.status, errText);
  }

  const data = (await res.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new GeminiApiError("Gemini returned an empty response.", 502);
  }
  return text;
}
