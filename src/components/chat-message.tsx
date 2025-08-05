import ReactMarkdown, { type Components } from "react-markdown";
import type { Message } from "ai";
import { useState, useMemo } from "react";
import {
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Brain,
  ListChecks,
  MessageSquare,
  Globe,
  ExternalLink,
} from "lucide-react";
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
      action?: Extract<OurMessageAnnotation, { type: "NEW_ACTION" }>["action"];
      status: "pending" | "loading" | "completed" | "error";
      error?: string;
      type:
        | "action"
        | "planning"
        | "queries"
        | "search"
        | "feedback"
        | "sources";
      title: string;
      reasoning?: string;
      plan?: string;
      queries?: string[];
      query?: string;
      queryIndex?: number;
      feedback?: string;
      actionType?: "continue" | "answer";
      sources?: Extract<
        OurMessageAnnotation,
        { type: "SOURCES_FOUND" }
      >["sources"];
      stepIndex?: number;
    }> = [];

    annotations.forEach((annotation) => {
      if (annotation.type === "NEW_ACTION") {
        steps.push({
          type: "action",
          action: annotation.action,
          title: annotation.action.title,
          reasoning: annotation.action.reasoning,
          status: "pending",
        });
      } else if (annotation.type === "ACTION_UPDATE") {
        const step = steps[annotation.stepIndex];
        if (step) {
          step.status = annotation.status;
          step.error = annotation.error;
        }
      } else if (annotation.type === "PLANNING") {
        steps.push({
          type: "planning",
          title: annotation.title,
          reasoning: annotation.reasoning,
          status: "loading",
        });
      } else if (annotation.type === "QUERIES_GENERATED") {
        // Update the planning step to completed and add queries step
        const planningStep = steps.find((step) => step.type === "planning");
        if (planningStep) {
          planningStep.status = "completed";
        }

        steps.push({
          type: "queries",
          title: `Generated ${annotation.queries.length} search queries`,
          plan: annotation.plan,
          queries: annotation.queries,
          status: "completed",
        });
      } else if (annotation.type === "SEARCH_UPDATE") {
        // Find or create search step for this query
        let searchStep = steps.find(
          (step) =>
            step.type === "search" && step.queryIndex === annotation.queryIndex,
        );

        if (!searchStep) {
          searchStep = {
            type: "search",
            title: `Query ${annotation.queryIndex + 1}: ${annotation.query}`,
            query: annotation.query,
            queryIndex: annotation.queryIndex,
            status: "pending",
          };
          steps.push(searchStep);
        }

        searchStep.status = annotation.status;
        searchStep.error = annotation.error;
      } else if (annotation.type === "EVALUATOR_FEEDBACK") {
        steps.push({
          type: "feedback",
          title: `Evaluator ${annotation.actionType === "continue" ? "suggests more research" : "ready to answer"}`,
          feedback: annotation.feedback,
          actionType: annotation.actionType,
          status: "completed",
        });
      } else if (annotation.type === "SOURCES_FOUND") {
        steps.push({
          type: "sources",
          title: `Found ${annotation.sources.length} sources`,
          sources: annotation.sources,
          stepIndex: annotation.stepIndex,
          status: "completed",
        });
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
                <span className="flex-1">{step.title}</span>
                {step.type === "planning" && <Brain className="ml-2 size-4" />}
                {step.type === "queries" && (
                  <ListChecks className="ml-2 size-4" />
                )}
                {step.type === "search" && <Search className="ml-2 size-4" />}
                {step.type === "sources" && <Globe className="ml-2 size-4" />}
                {step.type === "feedback" && (
                  <MessageSquare className="ml-2 size-4" />
                )}
              </button>
              <div className={`${isOpen ? "mt-1" : "hidden"}`}>
                {isOpen && (
                  <div className="px-2 py-1">
                    {step.reasoning && (
                      <div className="text-sm text-gray-400 italic">
                        <Markdown>{step.reasoning}</Markdown>
                      </div>
                    )}
                    {step.plan && (
                      <div className="mt-2 text-sm text-gray-300">
                        <div className="mb-1 font-semibold">Research Plan:</div>
                        <Markdown>{step.plan}</Markdown>
                      </div>
                    )}
                    {step.queries && (
                      <div className="mt-2">
                        <div className="mb-1 text-sm font-semibold text-gray-300">
                          Search Queries:
                        </div>
                        <ol className="list-inside list-decimal space-y-1 text-sm text-gray-400">
                          {step.queries.map((query, index) => (
                            <li key={index}>{query}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {step.error && (
                      <div className="mt-2 text-sm text-red-400">
                        Error: {step.error}
                      </div>
                    )}
                    {step.query && step.type === "search" && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                        <Search className="size-4" />
                        <span>{step.query}</span>
                      </div>
                    )}
                    {step.feedback && step.type === "feedback" && (
                      <div className="mt-2">
                        <div className="mb-1 text-sm font-semibold text-gray-300">
                          Evaluator Feedback:
                        </div>
                        <div
                          className={cn(
                            "rounded border-l-4 p-2 text-sm",
                            step.actionType === "continue"
                              ? "border-yellow-400 bg-yellow-950/20 text-yellow-300"
                              : "border-green-400 bg-green-950/20 text-green-300",
                          )}
                        >
                          <Markdown>{step.feedback}</Markdown>
                        </div>
                      </div>
                    )}
                    {step.sources && step.type === "sources" && (
                      <div className="mt-2">
                        <div className="mb-2 text-sm font-semibold text-gray-300">
                          Sources Found:
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          {step.sources.map((source, sourceIndex) => (
                            <a
                              key={sourceIndex}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex flex-col gap-2 rounded-lg border border-gray-600 bg-gray-800 p-3 text-sm transition-colors hover:border-gray-500 hover:bg-gray-700"
                            >
                              <div className="flex items-center gap-2">
                                {source.favicon && (
                                  <img
                                    src={source.favicon}
                                    alt=""
                                    className="size-4 flex-shrink-0"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                )}
                                <span className="flex-1 truncate font-medium text-gray-200 group-hover:text-white">
                                  {source.title}
                                </span>
                                <ExternalLink className="size-3 flex-shrink-0 text-gray-400 group-hover:text-gray-300" />
                              </div>
                              <p
                                className="overflow-hidden text-xs text-gray-400 group-hover:text-gray-300"
                                style={{
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                }}
                              >
                                {source.snippet}
                              </p>
                            </a>
                          ))}
                        </div>
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
