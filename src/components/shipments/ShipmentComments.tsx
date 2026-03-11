"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { formatDistanceToNow } from "date-fns";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null };
}

export interface ActivityItem {
  id: string;
  type: "status" | "stage" | "document";
  message: string;
  createdAt: string;
  user?: { name: string | null };
}

export interface ShipmentCommentsProps {
  comments: CommentItem[];
  activities?: ActivityItem[];
  onAddComment?: (content: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function ShipmentComments({
  comments,
  activities = [],
  onAddComment,
  isLoading,
  className,
}: ShipmentCommentsProps) {
  const [content, setContent] = React.useState("");
  const canSubmit = content.trim().length > 0 && onAddComment;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onAddComment(content.trim());
    setContent("");
  };

  return (
    <div className={cn("space-y-6", className)}>
      {onAddComment && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            className="flex flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" size="icon" disabled={!canSubmit || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}

      <div className="space-y-4">
        <h4 className="text-sm font-medium">Comments</h4>
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id}>
                <Card>
                  <CardContent className="flex gap-3 pt-4">
                    <Avatar name={c.user.name ?? undefined} className="h-8 w-8 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{c.user.name ?? "Unknown"}</span>
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{c.content}</p>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      {activities.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Activity</h4>
          <ul className="space-y-2">
            {activities.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
              >
                <span>{a.message}</span>
                <span className="ml-auto shrink-0">
                  {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
