export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return "http://localhost:3000/api";
}

export const API_BASE_URL = resolveApiBaseUrl();

type RequestOptions = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  query?: Record<string, string | undefined>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value) url.searchParams.set(key, value);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      credentials: "omit",
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Unable to reach the server. Check that the API is running.",
    );
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      throw new ApiError(
        response.status,
        "INVALID_RESPONSE",
        "The server returned an unexpected response.",
      );
    }
  }

  if (!response.ok) {
    const record = isRecord(payload) ? payload : null;
    const errorRecord = record && isRecord(record.error) ? record.error : null;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "The request could not be completed.";
    const code = typeof errorRecord?.code === "string" ? errorRecord.code : "REQUEST_FAILED";
    throw new ApiError(response.status, code, message);
  }

  if (!isRecord(payload) || !("data" in payload)) {
    throw new ApiError(
      response.status,
      "INVALID_RESPONSE",
      "The server returned an unexpected response.",
    );
  }

  return payload.data as T;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof DOMException && error.name === "AbortError")
    return "The request was cancelled.";
  return "Something went wrong. Try again.";
}
