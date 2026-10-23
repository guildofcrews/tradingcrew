import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth-utils";

export default async function Home() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/signin");
  }

  if (user.status !== "approved") {
    redirect("/pending");
  }

  redirect("/my-cards");
}
