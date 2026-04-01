import { PlusIcon } from "lucide-react";
import Link from "next/link";

import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { auth } from "~/server/auth/index.ts";
import { ChatPage } from "./chat.tsx";
import { AuthButton } from "../components/auth-button.tsx";
import { ChatList } from "../components/chat-list.tsx";
import { getChats, getChat } from "~/server/db/queries.ts";
import { chatsQueryOptions } from "~/lib/query-options.ts";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { Button } from "~/components/ui/button";
import type { OurMessage } from "~/server/agent/types.ts";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; error?: string }>;
}) {
  const session = await auth();
  const userName = session?.user?.name ?? "Guest";
  const isAuthenticated = !!session?.user;
  const { id: chatId } = await searchParams;

  const queryClient = new QueryClient();

  if (isAuthenticated && session.user?.id) {
    const userId = session.user.id;
    await queryClient.prefetchQuery({
      ...chatsQueryOptions,
      queryFn: () => getChats({ userId }),
    });
  }

  // Fetch active chat if chatId is present and user is authenticated
  const activeChat =
    chatId && isAuthenticated && session.user?.id
      ? await getChat({ userId: session.user.id, chatId })
      : null;

  // Map the messages to the correct format for useChat
  const initialMessages =
    activeChat?.messages.map((msg) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant",
      parts: msg.parts as OurMessage["parts"],
    })) ?? [];

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SidebarProvider>
        <div className="flex h-screen w-full bg-white">
          <Sidebar className="border-r border-gray-200 bg-white">
            <SidebarHeader className="p-4">
              <div className="flex items-center justify-between">
                <SidebarGroupLabel className="text-sm font-semibold text-gray-700">
                  Your Chats
                </SidebarGroupLabel>
                {isAuthenticated && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    asChild
                  >
                    <Link href="/" title="New Chat">
                      <PlusIcon className="h-5 w-5" />
                    </Link>
                  </Button>
                )}
              </div>
            </SidebarHeader>

            <SidebarContent className="px-4">
              <SidebarGroup>
                <SidebarGroupContent>
                  <ChatList isAuthenticated={isAuthenticated} />
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-gray-200 p-4">
              <AuthButton
                isAuthenticated={isAuthenticated}
                userImage={session?.user?.image}
              />
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="flex flex-1 flex-col bg-white">
            <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 p-4">
              <SidebarTrigger className="h-8 w-8 text-gray-600 hover:bg-gray-100 hover:text-gray-900" />
              <div className="text-sm font-medium text-gray-900">Chat</div>
            </div>
            <div className="min-h-0 flex-1">
              <ChatPage
                key={chatId ?? "new-chat"}
                userName={userName}
                isAuthenticated={isAuthenticated}
                chatId={chatId}
                initialMessages={initialMessages}
              />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </HydrationBoundary>
  );
}
