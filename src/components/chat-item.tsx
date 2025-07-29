"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { SidebarMenuButton, SidebarMenuItem, SidebarMenuAction } from "~/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { useRouter } from "next/navigation";

interface ChatItemProps {
  chat: {
    id: string;
    title: string;
  };
  isActive: boolean;
}

export function ChatItem({ chat, isActive }: ChatItemProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/chat/${chat.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }

      // If we're deleting the current chat, redirect to home
      if (isActive) {
        router.push('/');
      } else {
        // Otherwise just refresh the page to update the sidebar
        router.refresh();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      // You might want to show a toast notification here
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive} className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 data-[active=true]:bg-gray-100 data-[active=true]:text-gray-900">
          <Link href={`/?id=${chat.id}`}>
            <span className="truncate">{chat.title}</span>
          </Link>
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction showOnHover className="text-gray-500 hover:text-gray-700 hover:bg-gray-100">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-[8rem] bg-white border-gray-200" align="start">
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-white border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">Delete Chat</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to delete &ldquo;{chat.title}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="text-gray-700 border-gray-300 hover:bg-gray-50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
