export function timeAgo(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);

  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 1000 / 60);

  if (diffMin <= 0) return "recent";
  if (diffMin < 60) return `${diffMin} min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day`;
}
