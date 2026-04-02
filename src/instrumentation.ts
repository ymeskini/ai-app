import * as Sentry from "@sentry/nextjs";
import { registerOTel } from "@vercel/otel";
import { LangfuseExporter } from "langfuse-vercel";
import { env } from "~/env";

export async function register() {
  registerOTel({
    serviceName: "ai-app-ym",
    traceExporter: new LangfuseExporter({
      environment: env.NODE_ENV,
    }),
  });

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
