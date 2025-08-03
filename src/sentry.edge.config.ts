import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://612299d1af2867c8dd346d3bc3a9b4c1@o244516.ingest.us.sentry.io/4509769201352704",
  tracesSampleRate: 1.0,
  // Edge runtime has limited features compared to Node.js
  debug: false,
  // Prevent Sentry from setting up its own OpenTelemetry to avoid conflicts with Langfuse
  skipOpenTelemetrySetup: true,
  // Edge-specific configuration
  integrations: [
    // Add edge-specific integrations here if needed
  ],
});
