import { auth } from "~/server/auth/index.ts";
import { getChats } from "~/server/db/queries.ts";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ chats: [] });
  }

  const chats = await getChats({ userId: session.user.id });
  return Response.json({ chats });
}
