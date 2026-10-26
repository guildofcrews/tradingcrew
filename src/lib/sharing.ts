import "server-only";
import { cache } from "react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { galleryShares } from "@/db/schema";
import { publicName } from "@/lib/presentation";

export type GrantedShare = {
  id: string;
  userId: string;
  name: string;
  email: string;
  createdAt: string;
};

export type ReceivedShare = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  sharedBack: boolean;
};

export const listSharing = cache(async function listSharing(userId: string): Promise<{
  granted: GrantedShare[];
  received: ReceivedShare[];
}> {
  if (!db) return { granted: [], received: [] };

  const [grantedRows, receivedRows] = await Promise.all([
    db.query.galleryShares.findMany({
      where: eq(galleryShares.ownerId, userId),
      with: { grantee: { columns: { id: true, name: true, email: true } } },
      orderBy: [desc(galleryShares.createdAt)],
    }),
    db.query.galleryShares.findMany({
      where: eq(galleryShares.granteeId, userId),
      with: { owner: { columns: { id: true, name: true } } },
      orderBy: [desc(galleryShares.createdAt)],
    }),
  ]);

  const grantedIds = new Set(grantedRows.map((row) => row.granteeId));

  return {
    granted: grantedRows
      .filter((row) => row.grantee)
      .map((row) => ({
        id: row.id,
        userId: row.granteeId,
        name: publicName(row.grantee),
        email: row.grantee?.email ?? "",
        createdAt: row.createdAt.toISOString(),
      })),
    received: receivedRows
      .filter((row) => row.owner)
      .map((row) => ({
        id: row.id,
        userId: row.ownerId,
        name: publicName(row.owner),
        createdAt: row.createdAt.toISOString(),
        sharedBack: grantedIds.has(row.ownerId),
      })),
  };
});
