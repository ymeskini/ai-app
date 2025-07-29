import { PlusIcon } from "lucide-react";
import Link from "next/link";
import type { Message } from "ai";
import { auth } from "~/server/auth/index.ts";
import { ChatPage } from "./chat.tsx";
import { AuthButton } from "../components/auth-button.tsx";
import { ErrorMessage } from "../components/error-message.tsx";
import { ChatItem } from "../components/chat-item.tsx";
import { getChats, getChat } from "~/server/db/chat.ts";
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
  SidebarMenu,
} from "~/components/ui/sidebar";
import { Button } from "~/components/ui/button";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; error?: string }>;
}) {
  const { id, error } = await searchParams;
  const session = await auth();
  const userName = session?.user?.name ?? "Guest";
  const isAuthenticated = !!session?.user;
  const userId = session?.user?.id;

  // Fetch chats from database if user is authenticated
  const chats = isAuthenticated && userId ? await getChats(userId) : [];

  // Generate a stable chatId and determine if it's a new chat
  const chatId = id ?? crypto.randomUUID();
  const isNewChat = !id;

  // Fetch specific chat if id is provided
  const currentChat = id && userId ? await getChat(id, userId) : null;

  // Convert database messages to the format expected by useChat
  const initialMessages = currentChat?.messages?.map((msg) => ({
    id: msg.id,
    // msg.role is typed as string, so we need to cast it to the correct type
    role: msg.role as "user" | "assistant",
    // msg.content contains the parts data from the database
    parts: msg.content as Message["parts"],
    // content is not persisted, so we can safely pass an empty string,
    // because parts are always present, and the AI SDK will use the parts
    // to construct the content
    content: "",
  })) ?? [];

  // Handle authentication errors
  const getErrorMessage = (errorType: string | undefined) => {
    switch (errorType) {
      case 'AccessDenied':
        return 'Access denied. Only authorized users can sign in with Discord.';
      case 'OAuthSignin':
        return 'Error occurred during Discord sign-in. Please try again.';
      case 'OAuthCallback':
        return 'Authentication failed. Please try signing in again.';
      default:
        return null;
    }
  };

  const errorMessage = getErrorMessage(error);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-white">
        <Sidebar className="border-r border-gray-200 bg-white">
          <SidebarHeader className="p-4">
            <div className="flex items-center justify-between">
              <SidebarGroupLabel className="text-sm font-semibold text-gray-700">
                Your Chats
              </SidebarGroupLabel>
              {isAuthenticated && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100" asChild>
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
                <SidebarMenu>
                  {chats.length > 0 ? (
                    chats.map((chat) => (
                      <ChatItem
                        key={chat.id}
                        chat={chat}
                        isActive={chat.id === id}
                      />
                    ))
                  ) : (
                    <div className="px-2 py-3">
                      <p className="text-sm text-gray-500">
                        {isAuthenticated
                          ? "No chats yet. Start a new conversation!"
                          : "Sign in to start chatting"}
                      </p>
                    </div>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-gray-200">
            <AuthButton
              isAuthenticated={isAuthenticated}
              userImage={session?.user?.image}
            />
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 bg-white">
          {errorMessage && (
            <div className="border-b border-gray-200 p-4 bg-red-50">
              <ErrorMessage message={errorMessage} />
            </div>
          )}
          <ChatPage
            key={chatId}
            userName={userName}
            isAuthenticated={isAuthenticated}
            chatId={chatId}
            isNewChat={isNewChat}
            initialMessages={initialMessages}
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
