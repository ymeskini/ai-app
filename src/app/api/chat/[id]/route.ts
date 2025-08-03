import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "~/server/auth/index";
import { deleteChat } from "~/server/db/chat";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "DELETE /api/chat/[id]",
    },
    async (span) => {
      try {
        const session = await auth();

        if (!session?.user?.id) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Set user context for Sentry
        Sentry.setUser({
          id: session.user.id,
          email: session.user.email ?? undefined,
        });

        const { id } = await params;

        if (!id) {
          return NextResponse.json(
            { error: "Chat ID is required" },
            { status: 400 },
          );
        }

        // Add attributes to Sentry span
        span.setAttribute("user.id", session.user.id);
        span.setAttribute("chat.id", id);

        await deleteChat(id, session.user.id);

        return NextResponse.json({ success: true });
      } catch (error) {
        console.error("Error deleting chat:", error);
        Sentry.captureException(error);
        return NextResponse.json(
          { error: "Failed to delete chat" },
          { status: 500 },
        );
      }
    },
  );
}
