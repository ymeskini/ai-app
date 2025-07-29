import { PlusIcon } from "lucide-react";
import Link from "next/link";
import type { Message } from "ai";
import { auth } from "~/server/auth/index.ts";
import { ChatPage } from "./chat.tsx";
import { AuthButton } from "../components/auth-button.tsx";
import { ErrorMessage } from "../components/error-message.tsx";
import { getChats, getChat } from "~/server/db/chat.ts";

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
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <div className="flex w-64 flex-col border-r border-gray-700 bg-gray-900">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400">Your Chats</h2>
            {isAuthenticated && (
              <Link
                href="/"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 focus:outline-hidden focus:ring-2 focus:ring-blue-400"
                title="New Chat"
              >
                <PlusIcon className="h-5 w-5" />
              </Link>
            )}
          </div>
        </div>
        <div className="-mt-1 flex-1 space-y-2 overflow-y-auto px-4 pt-1 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600">
          {chats.length > 0 ? (
            chats.map((chat) => (
              <div key={chat.id} className="flex items-center gap-2">
                <Link
                  href={`/?id=${chat.id}`}
                  className={`flex-1 rounded-lg p-3 text-left text-sm text-gray-300 focus:outline-hidden focus:ring-2 focus:ring-blue-400 ${
                    chat.id === id
                      ? "bg-gray-700"
                      : "hover:bg-gray-750 bg-gray-800"
                  }`}
                >
                  {chat.title}
                </Link>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">
              {isAuthenticated
                ? "No chats yet. Start a new conversation!"
                : "Sign in to start chatting"}
            </p>
          )}
        </div>
        <div className="p-4">
          <AuthButton
            isAuthenticated={isAuthenticated}
            userImage={session?.user?.image}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {errorMessage && (
          <div className="border-b border-gray-700 p-4">
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
      </div>
    </div>
  );
}
