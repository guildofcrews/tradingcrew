import { redirect } from "next/navigation";
import { LogoMark } from "@/components/Logo";
import { SignOutButton } from "@/components/AuthButtons";
import { getAuthUser } from "@/lib/auth-utils";

export default async function PendingPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/signin");
  }

  if (user.status === "approved") {
    redirect("/my-cards");
  }

  const statusMessage =
    user.status === "denied"
      ? "Your access request has been denied."
      : "An admin will review your request.";

  return (
    <div className="min-h-screen bg-[#FFF8EC] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <LogoMark className="h-20 w-20 mx-auto mb-6" />
        <h1 className="text-3xl font-extrabold text-[#2B3A67] mb-4">
          TradingCrew is Invite-Only
        </h1>
        <p className="text-[#2B3A67]/70 mb-2">{statusMessage}</p>
        <p className="text-[#2B3A67]/50 text-sm mb-8">
          Signed in as {user.email}
        </p>
        <SignOutButton />
      </div>
    </div>
  );
}
