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
}

export const onRequestError = Sentry.captureRequestError;
