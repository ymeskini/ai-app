import ReactMarkdown, { type Components } from "react-markdown";
import { useState } from "react";
import { SearchIcon } from "lucide-react";

import type { OurMessage } from "~/lib/types";

interface ChatMessageProps {
  parts: OurMessage["parts"];
  role: string;
  userName: string;
}

type Source = {
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
};

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
    <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-700 p-4">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-blue-400 underline"
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

const Sources = ({ sources }: { sources: Source[] }) => {
  return (
    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {sources.map((source, index) => (
        <a
          key={index}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2 rounded border border-gray-700 bg-gray-800 p-3 text-left hover:bg-gray-700"
        >
          {source.favicon && (
            <img
              src={source.favicon}
              alt=""
              className="mt-0.5 h-4 w-4 flex-shrink-0"
            />
          )}
          <div className="flex-1">
            <div className="text-sm font-medium">{source.title}</div>
            <div className="mt-1 text-xs">{source.snippet}</div>
          </div>
        </a>
      ))}
    </div>
  );
};

const ReasoningSteps = ({ parts }: { parts: OurMessage["parts"] }) => {
  const [openStep, setOpenStep] = useState<number | null>(null);

  if (parts.length === 0) return null;

  return (
    <div className="mb-4 w-full">
      <ul className="space-y-1">
        {parts.map((part, index) => {
          const isOpen = openStep === index;
          return (
            <li key={index} className="relative">
              <button
                onClick={() => setOpenStep(isOpen ? null : index)}
                className={`flex w-full min-w-34 flex-shrink-0 items-center rounded px-2 py-1 text-left text-sm transition-colors ${
                  isOpen ? "bg-gray-700" : "hover: hover:bg-gray-800"
                }`}
              >
                <span
                  className={`z-10 mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-500 text-xs font-bold ${
                    isOpen ? "border-blue-400 text-white" : "bg-gray-800"
                  }`}
                >
                  {index + 1}
                </span>
                {part.type === "data-new-action" ? part.data.title : "Sources"}
              </button>
              <div className={`${isOpen ? "mt-1" : "hidden"}`}>
                {isOpen && (
                  <div className="px-2 py-1">
                    {part.type === "data-new-action" ? (
                      <>
                        <div className="text-sm italic">
                          <Markdown>{part.data.reasoning}</Markdown>
                        </div>
                        {part.data.type === "continue" && (
                          <div className="mt-2 flex flex-col gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <SearchIcon className="size-4" />
                              <span>Continuing search...</span>
                            </div>
                            <div className="mt-2 border-l-2 border-gray-700 pl-4">
                              <div className="font-medium">Feedback:</div>
                              <Markdown>{part.data.feedback!}</Markdown>
                            </div>
                          </div>
                        )}
                      </>
                    ) : part.type === "data-sources" ? (
                      <Sources sources={part.data} />
                    ) : null}
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

export const ChatMessage = ({ role, userName, parts }: ChatMessageProps) => {
  const isAI = role === "assistant";

  return (
    <div className="mb-6">
      <div className="round-2 rounded-lg border-1 p-4">
        <p className="mb-2 text-sm font-semibold text-black">
          {isAI ? "AI" : userName}
        </p>

        {isAI && <ReasoningSteps parts={parts} />}
        <div className="prose prose-invert max-w-none">
          {parts.map((part, index) => {
            if (part.type === "text") {
              return <Markdown key={index}>{part.text}</Markdown>;
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
};
