# Langfuse-Sentry Telemetry Conflict Resolution

## Problem Summary

This document addresses the conflict between Langfuse and Sentry telemetry systems that can cause:
- Missing or incomplete traces in Langfuse
- Corrupted traces in Sentry  
- Performance degradation due to duplicate instrumentation
- Context propagation issues between services

## Root Cause

Both Sentry's NextJS SDK and Langfuse attempt to set up OpenTelemetry (OTel) instrumentation automatically, leading to:

1. **Competing OTel Providers**: Both try to register global OTel providers
2. **Duplicate Spans**: Same operations get traced twice
3. **Context Corruption**: Trace context gets lost or mixed between systems

## Our Solution

We've implemented a solution that:

### 1. Disables Sentry's Auto-OTel Setup

In both `sentry.server.config.ts` and `sentry.edge.config.ts`, we added:

```typescript
Sentry.init({
  // ... other config
  skipOpenTelemetrySetup: true, // Prevents Sentry from auto-configuring OTel
});
```

### 2. Uses Langfuse as Primary OTel Provider

In `instrumentation.ts`, Langfuse's `LangfuseExporter` becomes the primary OTel exporter:

```typescript
registerOTel({
  serviceName: "ai-app-ym", 
  traceExporter: new LangfuseExporter({
    environment: env.NODE_ENV,
  }),
});
```

### 3. Adds Environment Controls

New environment variables for flexible telemetry control:

```bash
ENABLE_LANGFUSE=true     # Enable/disable Langfuse telemetry
ENABLE_SENTRY_OTEL=false # Enable/disable Sentry OTel integration
```

## What This Fixes

✅ **Langfuse traces now work properly** - No more missing or incomplete traces  
✅ **Sentry error tracking still works** - Error capture and performance monitoring intact  
✅ **No more duplicate spans** - Single OTel provider eliminates duplication  
✅ **Better performance** - Reduced instrumentation overhead  
✅ **Flexible configuration** - Can enable/disable systems independently  

## What You Keep

- Full Sentry error tracking and performance monitoring
- Sentry's session replay functionality
- All existing Langfuse LLM observability features
- Manual Sentry spans via `Sentry.startSpan()`

## Testing the Fix

Use the debug utility to verify setup:

```typescript
import { debugTelemetrySetup, testTelemetrySpans } from "~/lib/telemetry-debug";

// Check configuration
debugTelemetrySetup();

// Test span creation  
testTelemetrySpans();
```

## Environment Variables

Add to your `.env` file:

```bash
# Telemetry Controls
ENABLE_LANGFUSE=true
ENABLE_SENTRY_OTEL=false

# Required for the fix to work
LANGFUSE_SECRET_KEY=your_secret_key
LANGFUSE_PUBLIC_KEY=your_public_key  
LANGFUSE_BASEURL=https://your-langfuse-instance.com
```

## Monitoring

After deployment, monitor:

1. **Langfuse Dashboard** - Verify traces appear correctly
2. **Sentry Dashboard** - Confirm error tracking still works  
3. **Application Performance** - Should see reduced telemetry overhead
4. **Console Logs** - No more OTel provider conflicts

## Rollback Plan

If issues occur, you can quickly rollback by:

1. Set `ENABLE_LANGFUSE=false` in environment variables
2. Remove `skipOpenTelemetrySetup: true` from Sentry configs
3. Redeploy

This will restore the original Sentry-only telemetry setup.

## References

- [GitHub Discussion #4744](https://github.com/orgs/langfuse/discussions/4744) - Original conflict discussion
- [Sentry OpenTelemetry Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/tracing/instrumentation/opentelemetry/)
- [Langfuse Vercel Integration](https://langfuse.com/docs/integrations/vercel)