import { auth } from "~/server/auth";
import { deleteChat } from "~/server/db/queries";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const result = await deleteChat({ userId: session.user.id, chatId: id });

  if (!result.success) {
    if (result.error === "CHAT_NOT_FOUND") {
      return new Response("Chat not found", { status: 404 });
    }
    return new Response("Internal server error", { status: 500 });
  }

  return new Response(null, { status: 204 });
}
