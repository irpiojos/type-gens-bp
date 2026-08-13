export const APP_NAME = "Team Tasks Manager";
export const AUTH_USERNAME = "historian";
export const RECOVERY_EMAIL = "danielm@brands.mx";
export const TIMEZONE = "America/Monterrey";

export const MONTH_COLORS: Record<number, string> = {
  1: "#EAF7EC",
  2: "#E1F3D7",
  3: "#F5F7E2",
  4: "#FBF3F5",
  5: "#DDF2F9",
  6: "#F4F1F7",
  7: "#DFEFDD",
  8: "#E2EDB9",
  9: "#F4F3CF",
  10: "#F7DFDC",
  11: "#C7E9F4",
  12: "#E6E1EE",
};

export const TASK_STATUSES = [
  { value: "rana", label: "Rana Marrana", emoji: "🐸" },
  { value: "wip", label: "Work In Progress", emoji: "🚧" },
  { value: "done", label: "Done", emoji: "✅" },
  { value: "canceled", label: "Canceled", emoji: "🚫" },
  { value: "thankless", label: "Thankless task", emoji: "🤐" },
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number]["value"] | null;

export const GOAL_STATUSES = [
  { value: "doing", label: "Doing", emoji: "🚧" },
  { value: "done", label: "Done", emoji: "✅" },
  { value: "tbd", label: "TBD", emoji: "⏳" },
  { value: "ongoing", label: "Ongoing", emoji: "🔄" },
] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number]["value"];

export const COMMENT_COLORS = [
  "#FDE047", // yellow (Pitches Season example)
  "#BFDBFE", // light blue
  "#BBF7D0", // green
  "#FBCFE8", // pink
  "#DDD6FE", // purple
  "#FED7AA", // orange
] as const;

export const ILLUSTRATION_AVATARS = [
  "/avatars/gretel.svg",
  "/avatars/oscar.svg",
  "/avatars/pau.svg",
  "/avatars/dan.svg",
  "/avatars/member-5.svg",
  "/avatars/member-6.svg",
] as const;

export function statusEmoji(status: string | null | undefined): string {
  if (!status) return "";
  return TASK_STATUSES.find((s) => s.value === status)?.emoji ?? "";
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return "N/A";
  const found = TASK_STATUSES.find((s) => s.value === status);
  return found ? `${found.emoji} ${found.label}` : "N/A";
}

export function goalLetter(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}