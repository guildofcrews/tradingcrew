export function publicName(user: { name?: string | null } | null | undefined): string {
  const name = user?.name?.trim();
  return name || "A friend";
}

export function firstName(user: { name?: string | null } | null | undefined): string {
  const full = publicName(user);
  if (full === "A friend") return full;
  const first = full.split(/\s+/)[0] || full;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return dateTimeFmt.format(date);
}
