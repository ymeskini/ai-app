import { trace } from "@opentelemetry/api";
import * as Sentry from "@sentry/nextjs";
import { env } from "~/env";

/**
 * Debug utility to help troubleshoot telemetry setup
 */
export function debugTelemetrySetup() {
  console.log("=== Telemetry Debug Info ===");
  
  // Environment variables
  console.log("Environment Variables:");
  console.log("ENABLE_LANGFUSE:", env.ENABLE_LANGFUSE);
  console.log("ENABLE_SENTRY_OTEL:", env.ENABLE_SENTRY_OTEL);
  console.log("NODE_ENV:", env.NODE_ENV);
  
  // OpenTelemetry tracer provider
  const tracer = trace.getActiveTracer();
  console.log("OpenTelemetry Active Tracer:", !!tracer);
  
  // Sentry integration status
  const sentryClient = Sentry.getClient();
  console.log("Sentry Client:", !!sentryClient);
  
  if (sentryClient) {
    const options = sentryClient.getOptions();
    console.log("Sentry skipOpenTelemetrySetup:", options.skipOpenTelemetrySetup);
  }
  
  console.log("=== End Debug Info ===");
}

/**
 * Test function to verify both Sentry and Langfuse are working
 */
export function testTelemetryIntegration() {
  console.log("Testing telemetry integration...");
  
  // Test Sentry span
  return Sentry.startSpan(
    {
      op: "telemetry.test",
      name: "Test Telemetry Integration",
    },
    async (span) => {
      span.setAttribute("test.sentry", true);
      
      // Test OpenTelemetry span (should go to Langfuse)
      const tracer = trace.getActiveTracer();
      if (tracer) {
        const otelSpan = tracer.startSpan("test-otel-span");
        otelSpan.setAttributes({
          "test.langfuse": true,
          "test.timestamp": Date.now(),
        });
        
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 10));
        
        otelSpan.end();
        console.log("✅ OpenTelemetry span created (should appear in Langfuse)");
      } else {
        console.log("❌ No OpenTelemetry tracer found");
      }
      
      console.log("✅ Sentry span created");
      return { success: true, timestamp: Date.now() };
    }
  );
}