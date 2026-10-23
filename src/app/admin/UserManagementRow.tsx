"use client";

import { useState } from "react";
import { updateUserStatus, updateUserRole } from "@/app/actions/admin";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  status: "pending" | "approved" | "denied";
  role: "user" | "admin";
}

interface UserManagementRowProps {
  user: User;
  currentAdminId: string;
  adminCount: number;
}

export function UserManagementRow({
  user,
  currentAdminId,
  adminCount,
}: UserManagementRowProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCurrentUser = user.id === currentAdminId;
  const isLastAdmin =
    user.role === "admin" && user.status === "approved" && adminCount <= 1;

  async function handleStatusChange(status: "pending" | "approved" | "denied") {
    setLoading(true);
    setError(null);
    const result = await updateUserStatus(user.id, status);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Failed to update status");
    }
  }

  async function handleRoleChange(role: "user" | "admin") {
    setLoading(true);
    setError(null);
    const result = await updateUserRole(user.id, role);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Failed to update role");
    }
  }

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    denied: "bg-red-100 text-red-800",
  };

  const roleColors = {
    user: "bg-gray-100 text-gray-800",
    admin: "bg-purple-100 text-purple-800",
  };

  return (
    <tr className={loading ? "opacity-50" : ""}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          {user.image ? (
            <img
              src={user.image}
              alt=""
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-[#2B3A67]/10 flex items-center justify-center">
              <span className="text-[#2B3A67]/50 text-sm font-medium">
                {user.name?.[0] || user.email?.[0] || "?"}
              </span>
            </div>
          )}
          <span className="font-medium text-[#2B3A67]">
            {user.name || "Unknown"}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#2B3A67]/70">
        {user.email}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[user.status]}`}
        >
          {user.status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role]}`}
        >
          {user.role}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-2">
          {error && (
            <span className="text-red-500 text-xs mr-2">{error}</span>
          )}

          {user.status === "pending" && (
            <>
              <button
                onClick={() => handleStatusChange("approved")}
                disabled={loading}
                className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => handleStatusChange("denied")}
                disabled={loading}
                className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                Deny
              </button>
            </>
          )}

          {user.status === "approved" && (
            <button
              onClick={() => handleStatusChange("denied")}
              disabled={loading}
              className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-50 transition-colors"
            >
              Revoke
            </button>
          )}

          {user.status === "denied" && (
            <button
              onClick={() => handleStatusChange("approved")}
              disabled={loading}
              className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg disabled:opacity-50 transition-colors"
            >
              Approve
            </button>
          )}

          <span className="text-[#2B3A67]/20">|</span>

          {user.role === "user" && (
            <button
              onClick={() => handleRoleChange("admin")}
              disabled={loading}
              className="px-3 py-1 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg disabled:opacity-50 transition-colors"
            >
              Promote
            </button>
          )}

          {user.role === "admin" && (
            <button
              onClick={() => handleRoleChange("user")}
              disabled={loading || isLastAdmin}
              title={isLastAdmin ? "Cannot demote the last admin" : undefined}
              className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Demote
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
