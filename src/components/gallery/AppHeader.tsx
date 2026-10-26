import { countIncomingTrades } from "@/lib/galleries";
import { SiteHeader } from "./SiteHeader";

interface Props {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  active?: string;
}

export async function AppHeader({ user, active }: Props) {
  const incomingTrades = await countIncomingTrades(user.id);
  return (
    <SiteHeader
      user={{ name: user.name, email: user.email, image: user.image }}
      active={active}
      incomingTrades={incomingTrades}
    />
  );
}
