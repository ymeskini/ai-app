import { auth } from "~/server/auth";
import { deleteChat } from "~/server/db/queries";
import * as Sentry from "@sentry/nextjs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const {id} = await params;

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }


  if (!id) {
    return new Response("Chat ID is required", { status: 400 });
  }

  try {
    return Sentry.startSpan(
      {
        op: "http.server",
        name: "DELETE /api/chat/[id]",
      },
      async (span) => {
        span.setAttribute("chat.id", id);
        span.setAttribute("user.id", session.user.id);

        const result = await deleteChat({
          userId: session.user.id,
          chatId: id,
        });

        if (!result.success) {
          if (result.error === "CHAT_NOT_FOUND") {
            return new Response("Chat not found", { status: 404 });
          }
          if (result.error === "INTERNAL_ERROR") {
            return new Response("Internal server error", { status: 500 });
          }
          return new Response("Internal server error", { status: 500 });
        }

        return new Response(null, { status: 204 });
      },
    );
  } catch (error) {
    Sentry.captureException(error);
    console.error("Error deleting chat:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
