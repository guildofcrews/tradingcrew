import { notFound } from "next/navigation";
import { db } from "@/db";
import { tradeItems, trades, users } from "@/db/schema";
import { alias } from "drizzle-orm/pg-core";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { Header } from "@/components/Header";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { requireAdmin } from "@/lib/auth-utils";
import { formatWhen } from "@/lib/presentation";
import { TRADE_STATUS_LABEL } from "@/lib/trade-queries";
import { UserManagementRow } from "./UserManagementRow";

export default async function AdminPage() {
  if (!db) {
    return <ServiceUnavailable />;
  }

  const { authorized, user: adminUser } = await requireAdmin();

  if (!authorized || !adminUser) {
    notFound();
  }

  const allUsers = await db.query.users.findMany({
    orderBy: [asc(users.email)],
  });

  const adminCount = allUsers.filter(
    (u) => u.role === "admin" && u.status === "approved"
  ).length;

  const proposer = alias(users, "proposer");
  const recipient = alias(users, "recipient");
  let tradeLoadError = false;
  let recentTrades: {
    id: string;
    status: keyof typeof TRADE_STATUS_LABEL;
    createdAt: Date;
    statusReason: string | null;
    proposerName: string | null;
    proposerEmail: string | null;
    recipientName: string | null;
    recipientEmail: string | null;
    offers: number;
    requests: number;
  }[] = [];

  try {
    const rows = await db
      .select({
        id: trades.id,
        status: trades.status,
        createdAt: trades.createdAt,
        statusReason: trades.statusReason,
        proposerName: proposer.name,
        proposerEmail: proposer.email,
        recipientName: recipient.name,
        recipientEmail: recipient.email,
      })
      .from(trades)
      .innerJoin(proposer, eq(proposer.id, trades.proposerId))
      .innerJoin(recipient, eq(recipient.id, trades.recipientId))
      .orderBy(desc(trades.createdAt))
      .limit(100);

    const ids = rows.map((row) => row.id);
    const items = ids.length
      ? await db
          .select({ tradeId: tradeItems.tradeId, direction: tradeItems.direction })
          .from(tradeItems)
          .where(inArray(tradeItems.tradeId, ids))
      : [];

    recentTrades = rows.map((row) => ({
      ...row,
      offers: items.filter((item) => item.tradeId === row.id && item.direction === "offer").length,
      requests: items.filter((item) => item.tradeId === row.id && item.direction === "request").length,
    }));
  } catch (error) {
    console.error("Failed to load admin trades:", error);
    tradeLoadError = true;
  }

  return (
    <div className="min-h-screen bg-[#FFF8EC]">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#2B3A67] mb-2">
            Admin Dashboard
          </h1>
          <p className="text-[#2B3A67]/70">
            Manage users and access to TradingCrew
          </p>
        </div>

        <section className="bg-white rounded-3xl border-2 border-[#2B3A67]/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2B3A67]/10">
            <h2 className="text-xl font-bold text-[#2B3A67]">
              Users ({allUsers.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#2B3A67]/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#2B3A67] uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#2B3A67] uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#2B3A67] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#2B3A67] uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#2B3A67] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B3A67]/10">
                {allUsers.map((user) => (
                  <UserManagementRow
                    key={user.id}
                    user={user}
                    currentAdminId={adminUser.id}
                    adminCount={adminCount}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {allUsers.length === 0 && (
            <div className="text-center py-12 text-[#2B3A67]/50">
              No users found
            </div>
          )}
        </section>

        <section className="mt-8 bg-white rounded-3xl border-2 border-[#2B3A67]/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2B3A67]/10">
            <h2 className="text-xl font-bold text-[#2B3A67]">
              Trades ({recentTrades.length})
            </h2>
          </div>
          {tradeLoadError ? (
            <p className="px-6 py-8 text-[#2B3A67]/70">Trades couldn&apos;t be loaded.</p>
          ) : recentTrades.length === 0 ? (
            <p className="px-6 py-8 text-[#2B3A67]/50">No trades yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#2B3A67]/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#2B3A67] uppercase tracking-wider">When</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#2B3A67] uppercase tracking-wider">From</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#2B3A67] uppercase tracking-wider">To</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#2B3A67] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#2B3A67] uppercase tracking-wider">Cards</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2B3A67]/10">
                  {recentTrades.map((trade) => (
                    <tr key={trade.id}>
                      <td className="px-6 py-4 text-sm text-[#2B3A67] whitespace-nowrap">
                        {formatWhen(trade.createdAt.toISOString())}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#2B3A67]">
                        <div className="font-semibold">{trade.proposerName || "Unnamed"}</div>
                        <div className="text-[#2B3A67]/60">{trade.proposerEmail}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#2B3A67]">
                        <div className="font-semibold">{trade.recipientName || "Unnamed"}</div>
                        <div className="text-[#2B3A67]/60">{trade.recipientEmail}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#2B3A67]">
                        <div>{TRADE_STATUS_LABEL[trade.status]}</div>
                        {trade.statusReason && (
                          <div className="text-[#2B3A67]/60">{trade.statusReason}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#2B3A67] whitespace-nowrap">
                        {trade.offers} offered · {trade.requests} asked
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
