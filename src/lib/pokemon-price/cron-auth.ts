/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when that env var is set. */
export function cronAuthorized(authorization: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  return authorization === `Bearer ${secret}`;
}
