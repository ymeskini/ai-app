interface Chat {
  id: string;
  title: string;
}

async function fetchChats(): Promise<Chat[]> {
  const res = await fetch("/api/chats");
  if (!res.ok) throw new Error("Failed to fetch chats");
  const data = (await res.json()) as { chats: Chat[] };
  return data.chats;
}

export const chatsQueryOptions = {
  queryKey: ["chats"] as const,
  queryFn: fetchChats,
};
