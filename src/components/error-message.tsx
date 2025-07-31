import { AlertCircle } from "lucide-react";

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage = ({ message }: ErrorMessageProps) => {
  return (
    <div className="mx-auto w-full max-w-[65ch]">
      <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <AlertCircle className="size-5 shrink-0" />
        {message}
      </div>
    </div>
  );
};
