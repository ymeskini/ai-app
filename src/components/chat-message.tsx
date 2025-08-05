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
  p: ({ children }) => (
    <p className="mb-4 text-gray-800 first:mt-0 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 list-disc pl-4 text-gray-800">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal pl-4 text-gray-800">{children}</ol>
  ),
  li: ({ children }) => <li className="mb-1 text-gray-700">{children}</li>,
  code: ({ className, children, ...props }) => (
    <code
      className={`rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-gray-900 ${className ?? ""}`}
      {...props}
    >
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-900 p-4 text-gray-100">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-blue-600 underline transition-colors hover:text-blue-800"
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
          className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
        >
          {source.favicon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={source.favicon}
              alt={source.title}
              className="mt-0.5 h-4 w-4 flex-shrink-0"
            />
          )}
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              {source.title}
            </div>
            <div className="mt-1 text-xs text-gray-600">{source.snippet}</div>
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
                className={`flex w-full min-w-34 flex-shrink-0 items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                  isOpen
                    ? "bg-blue-50 text-blue-900 shadow-sm"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span
                  className={`z-10 mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                    isOpen
                      ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                      : "border-gray-300 bg-white text-gray-600"
                  }`}
                >
                  {index + 1}
                </span>
                {part.type === "data-new-action" ? part.data.title : "Sources"}
              </button>
              <div className={`${isOpen ? "mt-2" : "hidden"}`}>
                {isOpen && (
                  <div className="rounded-lg bg-gray-50 px-4 py-3">
                    {part.type === "data-new-action" ? (
                      <>
                        <div className="text-sm text-gray-700">
                          <Markdown>{part.data.reasoning}</Markdown>
                        </div>
                        {part.data.type === "continue" && (
                          <div className="mt-3 flex flex-col gap-2 text-sm">
                            <div className="flex items-center gap-2 text-blue-700">
                              <SearchIcon className="size-4" />
                              <span className="font-medium">
                                Continuing search...
                              </span>
                            </div>
                            <div className="mt-2 border-l-4 border-blue-200 pl-4">
                              <div className="font-medium text-gray-900">
                                Feedback:
                              </div>
                              <div className="text-gray-700">
                                <Markdown>{part.data.feedback!}</Markdown>
                              </div>
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
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-gray-900">
          {isAI ? "AI Assistant" : userName}
        </p>

        {isAI && <ReasoningSteps parts={parts} />}
        <div className="prose max-w-none text-gray-800">
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
