import * as React from "react";
import { cn } from "@/lib/utils";

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  fallback?: React.ReactNode;
}

const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, src, alt, name, fallback, ...props }, ref) => {
    const [loaded, setLoaded] = React.useState(false);
    const [error, setError] = React.useState(false);
    const showImage = src && !error && loaded;
    const initials = name ? getInitials(name) : (fallback ?? "?");

    return (
      <span
        ref={ref}
        className={cn(
          "relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted text-center text-sm font-medium text-muted-foreground",
          className
        )}
        {...props}
      >
        {src && !error && (
          // eslint-disable-next-line @next/next/no-img-element -- avatar URLs may be external/dynamic
          <img
            src={src}
            alt={alt ?? name ?? ""}
            className={cn(
              "aspect-square h-full w-full object-cover transition-opacity",
              loaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        )}
        {!showImage && (
          <span className="flex h-full w-full items-center justify-center">
            {typeof fallback === "string" ? fallback : initials}
          </span>
        )}
      </span>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar, getInitials };
