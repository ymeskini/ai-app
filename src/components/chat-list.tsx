"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { ChatItem } from "./chat-item.tsx";
import { SidebarMenu } from "~/components/ui/sidebar";
import { chatsQueryOptions } from "~/lib/query-options.ts";

interface ChatListProps {
  isAuthenticated: boolean;
}

export function ChatList({ isAuthenticated }: ChatListProps) {
  const searchParams = useSearchParams();
  const activeChatId = searchParams.get("id") ?? undefined;

  const { data: chats = [] } = useQuery({
    ...chatsQueryOptions,
    enabled: isAuthenticated,
  });

  if (chats.length === 0) {
    return (
      <div className="px-2 py-3">
        <p className="text-muted-foreground text-sm">
          {isAuthenticated
            ? "No chats yet. Start a new conversation!"
            : "Sign in to start chatting"}
        </p>
      </div>
    );
  }

  return (
    <SidebarMenu>
      {chats.map((chat) => (
        <ChatItem
          key={chat.id}
          chat={chat}
          isActive={chat.id === activeChatId}
        />
      ))}
    </SidebarMenu>
  );
}
