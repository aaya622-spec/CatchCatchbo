import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "peach" | "sage" | "warm" | "red" | "default";
  className?: string;
}

const MEETING_TYPE_EMOJI: Record<string, string> = {
  dinner: "🍽️",
  cafe: "☕",
  drink: "🍺",
  exhibition: "🖼️",
  exercise: "🏃",
  hangout: "👋",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variantClass = {
    peach: "bg-peach-100 text-peach-500",
    sage: "bg-sage-100 text-sage-400",
    warm: "bg-cream-200 text-warm-gray-600",
    red: "bg-red-50 text-red-400",
    default: "bg-cream-200 text-warm-gray-500",
  }[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
        variantClass,
        className
      )}
    >
      {children}
    </span>
  );
}

export function MeetingTypeBadge({ value, label }: { value: string; label: string }) {
  const emoji = MEETING_TYPE_EMOJI[value] ?? "✨";
  return (
    <Badge variant="peach">
      {emoji} {label}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: "confirmed" | "canceled" }) {
  if (status === "confirmed") {
    return <Badge variant="sage">✓ 예약 완료</Badge>;
  }
  return <Badge variant="red">취소됨</Badge>;
}

export function RemainingBadge({ remaining, max }: { remaining: number; max: number }) {
  if (remaining === 0) {
    return <Badge variant="red">마감</Badge>;
  }
  if (max === 1) {
    return <Badge variant="sage">예약 가능</Badge>;
  }
  return <Badge variant="warm">{remaining}자리 남음</Badge>;
}
