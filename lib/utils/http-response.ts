/**
 * Helpers for reading fetch responses safely.
 *
 * A reverse proxy (nginx, etc.) can answer a request before it reaches the app
 * and return a non-JSON error page — e.g. an HTML "413 Request Entity Too Large"
 * page when an upload exceeds `client_max_body_size`. Calling `response.json()`
 * on that HTML throws a cryptic `Unexpected token '<', "<html>..."` error.
 * `readJson` detects the non-JSON response and throws a typed error carrying the
 * HTTP status instead, so callers can show a meaningful message.
 */

/** Thrown when a response is not JSON (typically a reverse-proxy error page). */
export class NonJsonResponseError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "NonJsonResponseError"
    this.status = status
  }
}

/**
 * Read a fetch `Response` as JSON.
 *
 * @throws {NonJsonResponseError} when the response is not `application/json`
 *   (e.g. an nginx HTML error page). The error carries the HTTP status code.
 */
export async function readJson<T = unknown>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? ""

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new NonJsonResponseError(
      response.status,
      `Expected a JSON response but received "${
        contentType || "no content-type"
      }" (HTTP ${response.status})`
    )
  }

  return (await response.json()) as T
}
