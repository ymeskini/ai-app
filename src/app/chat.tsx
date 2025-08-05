"use client";

import { useChat } from "@ai-sdk/react";
import { Loader2, ArrowUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Message } from "ai";
import { StickToBottom } from "use-stick-to-bottom";
import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";
import { ErrorMessage } from "~/components/error-message";
import { isNewChatCreated } from "~/lib/chat-utils";
import type { OurMessageAnnotation } from "~/lib/get-next-action";

interface ChatProps {
  userName: string;
  isAuthenticated: boolean;
  chatId: string;
  isNewChat: boolean;
  initialMessages?: Message[];
}

// Helper function to format the reset time
const formatResetTime = (resetTime: string) => {
  const resetDate = new Date(resetTime);
  const now = new Date();
  const timeDiff = resetDate.getTime() - now.getTime();

  if (timeDiff <= 0) {
    return "now";
  }

  const hours = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

export const ChatPage = ({
  userName,
  isAuthenticated,
  chatId,
  isNewChat,
  initialMessages = [],
}: ChatProps) => {
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const router = useRouter();

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    status,
    data,
  } = useChat({
    initialMessages,
    body: {
      chatId,
      isNewChat,
    },
    onError: (error) => {
      try {
        const errorData = JSON.parse(error.message) as {
          error?: string;
          resetTime?: string;
          message?: string;
        };

        if (errorData.error === "Rate limit exceeded" && errorData.resetTime) {
          const timeUntilReset = formatResetTime(errorData.resetTime);
          setRateLimitError(
            `Rate limit exceeded. Your daily limit will reset in ${timeUntilReset}.`,
          );
        } else {
          setRateLimitError(error.message);
        }
      } catch {
        // If parsing fails, use the original error message
        setRateLimitError(error.message);
      }
    },
    onResponse: () => {
      setRateLimitError(null);
    },
  });

  // Handle new chat creation and redirection
  useEffect(() => {
    const lastDataItem = data?.[data.length - 1];

    if (lastDataItem && isNewChatCreated(lastDataItem)) {
      router.push(`?id=${lastDataItem.chatId}`);
    }
  }, [data, router]);

  const isLoading = status === "submitted" || status === "streaming";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }

    originalHandleSubmit(e);
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
        <StickToBottom
          className="[&>div]:scrollbar-thin [&>div]:scrollbar-track-gray-100 [&>div]:scrollbar-thumb-gray-300 hover:[&>div]:scrollbar-thumb-gray-400 min-h-0 w-full flex-1 [&>div]:overflow-y-auto"
          resize="instant"
          initial="instant"
          role="log"
          aria-label="Chat messages"
        >
          <StickToBottom.Content className="p-4">
            <div className="mx-auto max-w-[65ch]">
              {messages.map((message, index) => {
                return (
                  <ChatMessage
                    key={message.id || index}
                    parts={message.parts}
                    role={message.role}
                    userName={userName}
                    annotations={(() => {
                      if (!message.annotations) return undefined;
                      return message.annotations
                        .filter((ann) => {
                          return (
                            ann != null &&
                            typeof ann === "object" &&
                            "type" in ann &&
                            typeof ann.type === "string"
                          );
                        })
                        .map((ann) => ann as unknown as OurMessageAnnotation);
                    })()}
                  />
                );
              })}
            </div>
          </StickToBottom.Content>
        </StickToBottom>

        {rateLimitError && (
          <div className="border-t border-gray-200 p-4">
            <ErrorMessage message={rateLimitError} />
          </div>
        )}

        <div className="px-4 py-4">
          <form onSubmit={handleSubmit} className="mx-auto max-w-[65ch]">
            <div className="relative flex items-center">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Say something..."
                autoFocus
                aria-label="Chat input"
                className="w-full rounded-full border border-gray-300 bg-white px-4 py-2 pr-12 text-gray-900 placeholder-gray-500 focus:border-gray-400 focus:ring-2 focus:ring-blue-400 focus:outline-hidden disabled:opacity-50"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-800 focus:ring-2 focus:ring-blue-400 focus:outline-hidden disabled:opacity-50 disabled:hover:bg-gray-900"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <SignInModal
        isOpen={showSignInModal}
        onClose={() => {
          setShowSignInModal(false);
        }}
      />
    </>
  );
};
