import { describe, it, expect } from "vitest"
import { readJson, NonJsonResponseError } from "../http-response"

describe("readJson", () => {
  it("parses a JSON response body", async () => {
    const response = new Response(JSON.stringify({ ok: true, imported: 3 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })

    await expect(readJson(response)).resolves.toEqual({ ok: true, imported: 3 })
  })

  it("parses JSON error bodies from the app (e.g. 400/500)", async () => {
    const response = new Response(JSON.stringify({ error: "Validation failed" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    })

    await expect(readJson(response)).resolves.toEqual({ error: "Validation failed" })
  })

  // Regression: an nginx HTML error page must NOT surface as
  // "Unexpected token '<', "<html>..." — it must throw a typed error
  // carrying the HTTP status so callers can show a meaningful message.
  it("throws NonJsonResponseError with the status for an nginx 413 HTML page", async () => {
    const html =
      "<html>\r\n<head><title>413 Request Entity Too Large</title></head>\r\n<body>...</body>\r\n</html>"
    const response = new Response(html, {
      status: 413,
      headers: { "content-type": "text/html" },
    })

    await expect(readJson(response)).rejects.toBeInstanceOf(NonJsonResponseError)
    await expect(readJson(response)).rejects.toMatchObject({ status: 413 })
  })

  it("throws NonJsonResponseError for a 504 gateway timeout page", async () => {
    const response = new Response("<html><head><title>504</title></head></html>", {
      status: 504,
      headers: { "content-type": "text/html" },
    })

    await expect(readJson(response)).rejects.toMatchObject({ status: 504 })
  })

  it("treats a missing content-type as non-JSON", async () => {
    const response = new Response("oops", { status: 502 })
    // Some runtimes default to text/plain; either way it is not JSON.
    await expect(readJson(response)).rejects.toBeInstanceOf(NonJsonResponseError)
  })
})
