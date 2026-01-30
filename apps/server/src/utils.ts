import type { FastifyRequest } from "fastify";
import type { IncomingHttpHeaders } from "http";

export function fastifyRequestToRequest(request: FastifyRequest): Request {
  const url = new URL(
    request.url,
    `http://${request.headers.host ?? "localhost"}`
  );
  const headers = fastifyHeadersToHeaders(request.headers);
  return new Request(url.toString(), {
    method: request.method,
    headers,
    body:
      request.body !== undefined && request.body !== null
        ? JSON.stringify(request.body)
        : null,
  });
}

export function fastifyHeadersToHeaders(
  requestHeaders: IncomingHttpHeaders
): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(requestHeaders)) {
    if (value !== undefined) {
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
  }
  return headers;
}
