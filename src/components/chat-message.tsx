import ReactMarkdown, { type Components } from "react-markdown";
import type { Message } from "ai";

export type MessagePart = NonNullable<Message["parts"]>[number];

interface ChatMessageProps {
  parts: MessagePart[] | undefined;
  role: string;
  userName: string;
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

export const ChatMessage = ({ parts, role, userName }: ChatMessageProps) => {
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
