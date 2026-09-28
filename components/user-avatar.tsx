import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsOf } from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";

/** Photo when available, initials otherwise. `src` should already be a public URL (see lib/avatars). */
export function UserAvatar({
  name,
  src,
  className,
  fallbackClassName,
}: {
  name: string;
  src?: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <Avatar className={className}>
      {src && <AvatarImage src={src} alt={name} className="object-cover" />}
      <AvatarFallback className={cn("bg-brand-navy text-xs font-bold text-white", fallbackClassName)}>{initialsOf(name)}</AvatarFallback>
    </Avatar>
  );
}
