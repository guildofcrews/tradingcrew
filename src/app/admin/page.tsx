import { notFound } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { asc } from "drizzle-orm";
import { Header } from "@/components/Header";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { requireAdmin } from "@/lib/auth-utils";
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
      </main>
    </div>
  );
}
