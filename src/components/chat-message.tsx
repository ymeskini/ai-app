import ReactMarkdown, { type Components } from "react-markdown";
import type { Message } from "ai";
import { useState, useMemo } from "react";
import { Search, Link, Loader2, CheckCircle, XCircle } from "lucide-react";
import type { OurMessageAnnotation } from "~/lib/get-next-action";
import { cn } from "~/lib/utils";

export type MessagePart = NonNullable<Message["parts"]>[number];

interface ChatMessageProps {
  parts: MessagePart[] | undefined;
  role: string;
  userName: string;
  annotations?: OurMessageAnnotation[];
}

const components: Components = {
  // Override default elements with custom styling
  p: ({ children }) => <p className="mb-4 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ className, children, ...props }) => (
    <code className={`${className ?? ""}`} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg border border-gray-200 bg-gray-100 p-4 text-gray-800">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-blue-600 underline hover:text-blue-800"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
};

const Markdown = ({ children }: { children: string }) => {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
};

const TextPart = ({ text }: { text: string }) => {
  return <Markdown>{text}</Markdown>;
};

const ToolInvocationPart = ({
  part,
}: {
  part: MessagePart & { type: "tool-invocation" };
}) => {
  const { toolInvocation } = part;

  if (
    toolInvocation.state === "partial-call" ||
    toolInvocation.state === "call"
  ) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="text-sm text-gray-700">
          <strong>🔧 {toolInvocation.toolName}</strong>
          <pre className="mt-2 text-xs whitespace-pre-wrap text-gray-600">
            {JSON.stringify(toolInvocation.args, null, 2)}
          </pre>
          <div className="mt-2 text-xs text-gray-500">⏳ In progress...</div>
        </div>
      </div>
    );
  }

  if (toolInvocation.state === "result") {
    return (
      <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
        <div className="mb-2 text-sm font-semibold text-green-400">
          ✅ Tool result: {toolInvocation.toolName}
        </div>
        <div className="mb-2 text-xs text-gray-500">
          Args: {JSON.stringify(toolInvocation.args, null, 2)}
        </div>
        <div className="text-sm text-gray-700">
          <pre className="text-xs whitespace-pre-wrap text-gray-600">
            {typeof toolInvocation.result === "string"
              ? toolInvocation.result
              : JSON.stringify(toolInvocation.result, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  return null;
};

const MessagePartComponent = ({ part }: { part: MessagePart }) => {
  switch (part.type) {
    case "text":
      return <TextPart text={part.text} />;
    case "tool-invocation":
      return <ToolInvocationPart part={part} />;
  }
};

const ReasoningSteps = ({
  annotations,
}: {
  annotations: OurMessageAnnotation[];
}) => {
  const [openStep, setOpenStep] = useState<number | null>(null);

  // Process annotations to build step states
  const stepStates = useMemo(() => {
    const steps: Array<{
      action: Extract<OurMessageAnnotation, { type: "NEW_ACTION" }>["action"];
      status: "pending" | "loading" | "completed" | "error";
      error?: string;
    }> = [];

    annotations.forEach((annotation) => {
      if (annotation.type === "NEW_ACTION") {
        steps.push({
          action: annotation.action,
          status: "pending",
        });
      } else if (annotation.type === "ACTION_UPDATE") {
        const step = steps[annotation.stepIndex];
        if (step) {
          step.status = annotation.status;
          step.error = annotation.error;
        }
      }
    });

    return steps;
  }, [annotations]);

  if (stepStates.length === 0) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "loading":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "loading":
        return "border-blue-400 bg-blue-50";
      case "completed":
        return "border-green-400 bg-green-50";
      case "error":
        return "border-red-400 bg-red-50";
      default:
        return "border-gray-500 bg-gray-800";
    }
  };

  return (
    <div className="mb-4 w-full">
      <ul className="space-y-1">
        {stepStates.map((step, index) => {
          const isOpen = openStep === index;
          return (
            <li key={index} className="relative">
              <button
                onClick={() => setOpenStep(isOpen ? null : index)}
                className={cn(
                  `flex w-full min-w-34 flex-shrink-0 items-center rounded px-2 py-1 text-left text-sm transition-colors`,
                  {
                    "bg-gray-700 text-gray-200": isOpen,
                    "text-gray-400 hover:bg-gray-800 hover:text-gray-300":
                      !isOpen,
                  },
                )}
              >
                <span
                  className={cn(
                    "z-10 mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                    isOpen
                      ? "border-blue-400 text-white"
                      : getStatusColor(step.status),
                    step.status !== "pending"
                      ? "text-gray-800"
                      : "text-gray-300",
                  )}
                >
                  {step.status === "loading" ||
                  step.status === "completed" ||
                  step.status === "error" ? (
                    <div className="flex items-center justify-center">
                      {getStatusIcon(step.status)}
                    </div>
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="flex-1">{step.action.title}</span>
              </button>
              <div className={`${isOpen ? "mt-1" : "hidden"}`}>
                {isOpen && (
                  <div className="px-2 py-1">
                    <div className="text-sm text-gray-400 italic">
                      <Markdown>{step.action.reasoning}</Markdown>
                    </div>
                    {step.error && (
                      <div className="mt-2 text-sm text-red-400">
                        Error: {step.error}
                      </div>
                    )}
                    {step.action.type === "search" && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                        <Search className="size-4" />
                        <span>{step.action.query}</span>
                      </div>
                    )}
                    {step.action.type === "scrape" && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                        <Link className="size-4" />
                        <span>
                          {step.action.urls
                            ?.map((url) => new URL(url).hostname)
                            ?.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export const ChatMessage = ({
  parts,
  role,
  userName,
  annotations,
}: ChatMessageProps) => {
  const isAI = role === "assistant";

  return (
    <div className="mb-6">
      <div
        className={cn(
          "rounded-lg border p-4",
          isAI
            ? "border-gray-200 bg-gray-50 text-gray-800"
            : "border-gray-300 bg-white text-gray-900",
        )}
      >
        <p className="mb-2 text-sm font-semibold text-gray-600">
          {isAI ? "AI" : userName}
        </p>

        {/* Show reasoning steps only for AI messages */}
        {isAI && annotations && annotations.length > 0 && (
          <ReasoningSteps annotations={annotations} />
        )}

        <div className="prose max-w-none">
          {parts?.map((part, index) => (
            <MessagePartComponent key={index} part={part} />
          )) ?? <div className="text-gray-500 italic">No content</div>}
        </div>
      </div>
    </div>
  );
};
