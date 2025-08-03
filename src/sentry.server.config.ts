import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://612299d1af2867c8dd346d3bc3a9b4c1@o244516.ingest.us.sentry.io/4509769201352704",
  tracesSampleRate: 1.0,
  debug: false,
  skipOpenTelemetrySetup: true, // Skip OpenTelemetry setup for Edge runtime
  // Server-specific configuration
  integrations: [
    // Add server-specific integrations here if needed
  ],
});
