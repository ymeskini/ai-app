"use client";

import { useChat } from "@ai-sdk/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";

interface ChatProps {
  userName: string;
  isAuthenticated: boolean;
}

export const ChatPage = ({ userName, isAuthenticated }: ChatProps) => {
  const [showSignInModal, setShowSignInModal] = useState(false);
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    status,
  } = useChat();

  const isLoading = status === "submitted";

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
      <div className="flex flex-1 flex-col">
        <div
          className="mx-auto w-full max-w-[65ch] flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500"
          role="log"
          aria-label="Chat messages"
        >
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

        <div className="border-t border-gray-700">
          <form
            onSubmit={handleSubmit}
            className="mx-auto max-w-[65ch] p-4"
          >
            <div className="flex gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Say something..."
                autoFocus
                aria-label="Chat input"
                className="flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-gray-200 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:hover:bg-gray-700"
              >
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <SignInModal isOpen={showSignInModal} onClose={() => {
        setShowSignInModal(false);
      }} />
    </>
  );
};
