import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getInitials, type PersonName } from "@/utils/nameUtils";

type AvatarScientist = PersonName & {
  profileImageInitials?: string | null;
};

interface ScientistAvatarProps {
  scientist: AvatarScientist;
  className?: string;
  fallbackClassName?: string;
}

export function ScientistAvatar({
  scientist,
  className,
  fallbackClassName,
}: ScientistAvatarProps) {
  const initials = scientist.profileImageInitials || getInitials(scientist) || "?";
  return (
    <Avatar className={className}>
      <AvatarFallback
        className={cn("bg-primary-100 text-primary-700", fallbackClassName)}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
