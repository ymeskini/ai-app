"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { StickToBottom } from "use-stick-to-bottom";

import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "~/components/ai-elements/prompt-input";
import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";
import { chatsQueryOptions } from "~/lib/query-options";
import type { OurDataParts, OurMessage } from "~/server/agent/types";

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
  const queryClient = useQueryClient();
  const chatIdRef = useRef(chatId);
  const isNewChatRef = useRef(!chatId);
  const { messages, status, sendMessage, stop } = useChat<OurMessage>({
    transport: new DefaultChatTransport({
      // use a function so each request reads the latest chatId from the ref
      body: () => ({ chatId: chatIdRef.current }),
    }),
    messages: initialMessages,
    onData: (dataPart) => {
      // we don't use router as it was triggering a rerender
      // that was disconnecting from the stream response
      const { chatId: newChatId } =
        dataPart.data as OurDataParts["new-chat-created"];
      chatIdRef.current = newChatId;
      window.history.replaceState(null, "", `?id=${newChatId}`);
    },
    onFinish: () => {
      if (isNewChatRef.current) {
        isNewChatRef.current = false;
        void queryClient.invalidateQueries({
          queryKey: chatsQueryOptions.queryKey,
        });
      }
    },
  });

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }

    await sendMessage({
      text: message.text,
    });
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
                  />
                );
              })}
            </div>
          </StickToBottom.Content>
        </StickToBottom>
        <div className="px-4 py-4">
          <div className="mx-auto max-w-[65ch]">
            <PromptInput
              onSubmit={handleSubmit}
              accept="image/*"
              multiple
              className="rounded-xl"
            >
              <PromptInputTextarea autoFocus placeholder="Say something..." />
              <PromptInputFooter>
                <div />
                <PromptInputSubmit status={status} onStop={stop} />
              </PromptInputFooter>
            </PromptInput>
          </div>
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
