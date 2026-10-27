import { notFound } from "next/navigation";
import { db } from "@/db";
import { cards, recognitionLogs, tradeItems, trades, users } from "@/db/schema";
import { alias } from "drizzle-orm/pg-core";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { Header } from "@/components/Header";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { requireAdmin } from "@/lib/auth-utils";
import { formatWhen } from "@/lib/presentation";
import { splitCollectorNumber } from "@/lib/pokemon-price/normalize";
import { TRADE_STATUS_LABEL } from "@/lib/trade-queries";
import { PriceBackfill } from "./PriceBackfill";
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

  let recognitionError = false;
  let recognitionSummary: {
    calls: number;
    failed: number;
    cost: string;
    inputTokens: string;
    outputTokens: string;
  } | null = null;
  let failureListError = false;
  let recentFailures: {
    id: string;
    createdAt: Date;
    cardId: string | null;
    status: "success" | "error";
    error: string | null;
  }[] = [];
  try {
    const [row] = await db
      .select({
        calls: sql<number>`count(*)::int`,
        failed: sql<number>`count(*) filter (where ${recognitionLogs.status} = 'error')::int`,
        cost: sql<string>`coalesce(sum(${recognitionLogs.costUsd}), 0)::text`,
        inputTokens: sql<string>`coalesce(sum(${recognitionLogs.inputTokens}), 0)::text`,
        outputTokens: sql<string>`coalesce(sum(${recognitionLogs.outputTokens}), 0)::text`,
      })
      .from(recognitionLogs);
    recognitionSummary = row ?? null;
  } catch (error) {
    console.error("Failed to load recognition spend:", error);
    recognitionError = true;
  }

  try {
    recentFailures = await db
      .select({
        id: recognitionLogs.id,
        createdAt: recognitionLogs.createdAt,
        cardId: recognitionLogs.cardId,
        status: recognitionLogs.status,
        error: recognitionLogs.error,
      })
      .from(recognitionLogs)
      .orderBy(desc(recognitionLogs.createdAt))
      .limit(20);
  } catch (error) {
    console.error("Failed to load recognition failures:", error);
    failureListError = true;
  }

  let unmatchedError = false;
  let unmatchedCards: {
    id: string;
    title: string;
    cardNumber: string | null;
    total: number | null;
    setCode: string | null;
    setName: string | null;
    candidates: number;
    reason: string;
  }[] = [];
  try {
    const rows = await db.query.cards.findMany({
      where: and(eq(cards.category, "pokemon"), eq(cards.matchConfidence, "none")),
      columns: {
        id: true,
        title: true,
        cardNumber: true,
        setCode: true,
        setName: true,
        matchCandidates: true,
      },
      orderBy: [asc(cards.title)],
      limit: 200,
    });
    unmatchedCards = rows.map((row) => {
      const split = splitCollectorNumber(row.cardNumber);
      const printedNumber = row.cardNumber?.split("/")[0]?.trim() || null;
      const candidates = Array.isArray(row.matchCandidates) ? row.matchCandidates.length : 0;
      return {
        id: row.id,
        title: row.title,
        cardNumber: printedNumber,
        total: split.total,
        setCode: row.setCode,
        setName: row.setName,
        candidates,
        reason: !row.cardNumber?.trim()
          ? "No collector number"
          : candidates === 0
            ? "No TCGdex card with this name and number"
            : `${candidates} cards shared this name and number`,
      };
    });
  } catch (error) {
    console.error("Failed to load unmatched Pokémon cards:", error);
    unmatchedError = true;
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

        <section className="mb-8 bg-white rounded-3xl border-2 border-[#2B3A67]/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2B3A67]/10">
            <h2 className="text-xl font-bold text-[#2B3A67]">Card recognition</h2>
          </div>
          {recognitionError || !recognitionSummary ? (
            <p className="px-6 py-8 text-[#2B3A67]/70">Recognition spend couldn&apos;t be loaded.</p>
          ) : (
            <dl className="grid gap-4 px-6 py-6 sm:grid-cols-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-[#2B3A67]/60">Calls</dt>
                <dd className="text-2xl font-extrabold text-[#2B3A67]">{Number(recognitionSummary.calls).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-[#2B3A67]/60">Failed</dt>
                <dd className="text-2xl font-extrabold text-[#2B3A67]">{Number(recognitionSummary.failed).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-[#2B3A67]/60">Input tokens</dt>
                <dd className="text-2xl font-extrabold text-[#2B3A67]">{Number(recognitionSummary.inputTokens).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-[#2B3A67]/60">Reported cost</dt>
                <dd className="text-2xl font-extrabold text-[#2B3A67]">{formatUsd(recognitionSummary.cost)}</dd>
                <p className="mt-1 text-sm text-[#2B3A67]/60">
                  {Number(recognitionSummary.outputTokens).toLocaleString()} output tokens
                </p>
              </div>
            </dl>
          )}
          {failureListError ? (
            <p className="px-6 py-4 border-t border-[#2B3A67]/10 text-[#2B3A67]/70">
              Recent reads couldn&apos;t be loaded.
            </p>
          ) : recentFailures.length === 0 ? (
            <p className="px-6 py-4 border-t border-[#2B3A67]/10 text-sm text-[#2B3A67]/50">
              No reads yet.
            </p>
          ) : (
            <div className="border-t border-[#2B3A67]/10 overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#2B3A67]/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#2B3A67] uppercase tracking-wider">When</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#2B3A67] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#2B3A67] uppercase tracking-wider">Card</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#2B3A67] uppercase tracking-wider">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2B3A67]/10">
                  {recentFailures.map((row) => (
                    <tr key={row.id}>
                      <td className="px-6 py-3 text-sm text-[#2B3A67] whitespace-nowrap align-top">
                        {formatWhen(row.createdAt.toISOString())}
                      </td>
                      <td className="px-6 py-3 text-sm text-[#2B3A67] whitespace-nowrap align-top">{row.status}</td>
                      <td className="px-6 py-3 text-xs text-[#2B3A67]/70 whitespace-nowrap align-top">{row.cardId ?? "—"}</td>
                      <td className="px-6 py-3 text-xs font-mono text-[#2B3A67] break-words max-w-xl align-top">
                        {row.error || "Unknown error"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mb-8 bg-white rounded-3xl border-2 border-[#2B3A67]/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2B3A67]/10">
            <h2 className="text-xl font-bold text-[#2B3A67]">Pokémon prices</h2>
            <p className="mt-1 text-sm text-[#2B3A67]/70">
              Cards that have not been matched yet still say &quot;Value not available&quot; in the gallery.
            </p>
          </div>
          <PriceBackfill />
          {unmatchedError ? (
            <p className="px-6 py-8 text-[#2B3A67]/70">Unmatched cards couldn&apos;t be loaded.</p>
          ) : unmatchedCards.length === 0 ? (
            <p className="px-6 py-6 text-sm text-[#2B3A67]/50">
              No Pokémon cards are stuck without a match. Cards still waiting for a first check are not listed here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#2B3A67]/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#2B3A67] uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#2B3A67] uppercase tracking-wider">Number</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#2B3A67] uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#2B3A67] uppercase tracking-wider">Set code</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#2B3A67] uppercase tracking-wider">Candidates</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#2B3A67] uppercase tracking-wider">Why</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2B3A67]/10">
                  {unmatchedCards.map((card) => (
                    <tr key={card.id}>
                      <td className="px-6 py-3 text-sm font-semibold text-[#2B3A67]">
                        {card.title}
                        {card.setName && <div className="font-normal text-[#2B3A67]/60">{card.setName}</div>}
                      </td>
                      <td className="px-6 py-3 text-sm text-[#2B3A67] whitespace-nowrap">{card.cardNumber ?? "—"}</td>
                      <td className="px-6 py-3 text-sm text-[#2B3A67] whitespace-nowrap">{card.total ?? "—"}</td>
                      <td className="px-6 py-3 text-sm text-[#2B3A67] whitespace-nowrap">{card.setCode ?? "—"}</td>
                      <td className="px-6 py-3 text-sm text-[#2B3A67] whitespace-nowrap">{card.candidates}</td>
                      <td className="px-6 py-3 text-sm text-[#2B3A67]">{card.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

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

function formatUsd(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount === 0) return "$0.00";
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}
