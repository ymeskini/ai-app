"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { Loader2, ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StickToBottom } from "use-stick-to-bottom";

import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";
import type { OurMessage } from "~/lib/types";

interface ChatProps {
  userName: string;
  isAuthenticated: boolean;
  chatId: string | undefined;
  initialMessages: OurMessage[];
}

export const ChatPage = ({
  userName,
  isAuthenticated,
  chatId,
  initialMessages = [],
}: ChatProps) => {
  const [showSignInModal, setShowSignInModal] = useState(false);
  const router = useRouter();
  const { messages, status, sendMessage, resumeStream } = useChat<OurMessage>({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        chatId,
      },
    }),
    onData: (dataPart) => {
      if (dataPart.type === "data-new-chat-created") {
        router.push(`?id=${dataPart.data.chatId}`);
      }
    },
  });

  const [input, setInput] = useState("");

  const isLoading = status === "streaming";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }

    const queryInput = input;

    setInput("");
    await sendMessage({
      text: queryInput,
    });
  };

  useEffect(() => {
    // Only try to resume if we have a chatId and are authenticated
    if (chatId && isAuthenticated) {
      resumeStream().catch((error) => {
        console.error("Failed to resume stream:", error);
      });
    }
    // We want to disable the exhaustive deps rule here because we only want to run this effect once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                  />
                );
              })}
            </div>
          </StickToBottom.Content>
        </StickToBottom>
        <div className="px-4 py-4">
          <form onSubmit={handleSubmit} className="mx-auto max-w-[65ch]">
            <div className="relative flex items-center">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
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
