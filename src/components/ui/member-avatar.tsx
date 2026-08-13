import clsx from "clsx";
import { AvatarSvg } from "@/components/ui/avatar-face";

export function MemberAvatar({
  name,
  avatarUrl,
  size = 56,
  selected,
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  selected?: boolean;
  className?: string;
}) {
  const seed = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <div
      className={clsx(
        "relative shrink-0 overflow-hidden rounded-full bg-[#eee] ",
        selected ? "ring-[3px] ring-[#3b82f6]" : "ring-1 ring-black/10",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <AvatarSvg seed={seed} name={name} />
      )}
    </div>
  );
}