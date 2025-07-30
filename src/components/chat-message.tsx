import ReactMarkdown, { type Components } from "react-markdown";
import type { Message } from "ai";
import { useState } from "react";
import { Search, Link } from "lucide-react";
import type { OurMessageAnnotation } from "~/lib/get-next-action";

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
    <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-100 border border-gray-200 p-4 text-gray-800">
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

const ToolInvocationPart = ({ part }: { part: MessagePart & { type: "tool-invocation" } }) => {
  const { toolInvocation } = part;

  if (toolInvocation.state === "partial-call" || toolInvocation.state === "call") {
    return (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="text-sm text-gray-700">
          <strong>🔧 {toolInvocation.toolName}</strong>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-600">
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
          <pre className="whitespace-pre-wrap text-xs text-gray-600">
            {typeof toolInvocation.result === "string"
              ? toolInvocation.result
              : JSON.stringify(toolInvocation.result, null, 2)
            }
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
  const [openStep, setOpenStep] = useState<
    number | null
  >(null);

  if (annotations.length === 0) return null;

  return (
    <div className="mb-4 w-full">
      <ul className="space-y-1">
        {annotations.map((annotation, index) => {
          const isOpen = openStep === index;
          return (
            <li key={index} className="relative">
              <button
                onClick={() =>
                  setOpenStep(isOpen ? null : index)
                }
                className={`min-w-34 flex w-full flex-shrink-0 items-center rounded px-2 py-1 text-left text-sm transition-colors ${
                  isOpen
                    ? "bg-gray-700 text-gray-200"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                }`}
              >
                <span
                  className={`z-10 mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-500 text-xs font-bold ${
                    isOpen
                      ? "border-blue-400 text-white"
                      : "bg-gray-800 text-gray-300"
                  }`}
                >
                  {index + 1}
                </span>
                {annotation.action.title}
              </button>
              <div
                className={`${isOpen ? "mt-1" : "hidden"}`}
              >
                {isOpen && (
                  <div className="px-2 py-1">
                    <div className="text-sm italic text-gray-400">
                      <Markdown>
                        {annotation.action.reasoning}
                      </Markdown>
                    </div>
                    {annotation.action.type ===
                      "search" && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                        <Search className="size-4" />
                        <span>
                          {annotation.action.query}
                        </span>
                      </div>
                    )}
                    {annotation.action.type ===
                      "scrape" && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                        <Link className="size-4" />
                        <span>
                          {annotation.action.urls
                            ?.map(
                              (url) =>
                                new URL(url).hostname,
                            )
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

export const ChatMessage = ({ parts, role, userName, annotations }: ChatMessageProps) => {
  const isAI = role === "assistant";

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg p-4 border ${
          isAI ? "bg-gray-50 text-gray-800 border-gray-200" : "bg-white text-gray-900 border-gray-300"
        }`}
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
          )) ?? (
            <div className="text-gray-500 italic">No content</div>
          )}
        </div>
      </div>
    </div>
  );
};
