import type { Event } from "@sentry/nextjs";

export function scrubSentryEvent<T extends Event>(event: T): T {
  delete event.user;
  delete event.extra;
  delete event.breadcrumbs;
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.query_string;
    event.request.headers = undefined;
    if (event.request.url) event.request.url = event.request.url.split("?")[0];
  }
  return event;
}
