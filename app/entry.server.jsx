import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter, isRouteErrorResponse } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";
import { initSentry, captureException } from "./lib/sentry.server.js";

// Initialize error reporting as early as possible (no-op without SENTRY_DSN).
initSentry();

export const streamTimeout = 5000;

// React Router calls this for every uncaught loader/action/render error. We
// report server-side failures to Sentry and keep the default console logging.
export function handleError(error, { request }) {
  // Skip client-aborted requests (user navigated away) — not real errors.
  if (request.signal.aborted) return;
  // Skip thrown Responses (redirects, etc.) — control flow, not bugs.
  if (error instanceof Response) return;
  // Skip 4xx route errors (e.g. 404 "No route matches" from bots hitting
  // /robots.txt) — noise, not server bugs. Still report 5xx route errors.
  if (isRouteErrorResponse(error) && error.status < 500) return;
  captureException(error, { extra: { url: request.url, method: request.method } });
  console.error(error);
}

export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  reactRouterContext,
) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";

  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={reactRouterContext} url={request.url} />,
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        },
      },
    );

    // Automatically timeout the React renderer after 6 seconds, which ensures
    // React has enough time to flush down the rejected boundary contents
    setTimeout(abort, streamTimeout + 1000);
  });
}
