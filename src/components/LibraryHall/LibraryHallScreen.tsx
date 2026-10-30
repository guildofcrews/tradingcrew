import type { ReactNode } from "react";
import { SetViewToggle } from "@/components/gallery/SetViewToggle";
import { AppHeader } from "@/components/gallery/AppHeader";
import { galleryHref } from "@/lib/card-sets";
import type { HallEnd, HallRoom, Pose } from "@/lib/halls";
import { categoryHallPath, wingBasePath, type HallCrumb, type HallScope } from "@/lib/library-hall";
import { HallBreadcrumb } from "./HallBreadcrumb";
import { LibraryHall } from "./LibraryHall";
import styles from "./LibraryHallScreen.module.css";

/** By set and All cards stay one tap away on the Pokémon hall. */
export function PokemonHallLinks({ scope, slug }: { scope: HallScope; slug: string }) {
  if (slug !== "pokemon") return null;
  const base = wingBasePath(scope, slug);
  return (
    <SetViewToggle
      mode="halls"
      restoreSaved={false}
      setsHref={base}
      allHref={galleryHref(base, { view: "all" })}
      hallsHref={categoryHallPath(scope, slug)}
    />
  );
}

interface Props {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  active: string;
  crumbs: readonly HallCrumb[];
  rooms: HallRoom[];
  end: HallEnd;
  entranceLabels?: [string, string];
  initialRoomId?: string;
  initialPose?: Pose;
  children?: ReactNode;
}

export function LibraryHallScreen({
  user,
  active,
  crumbs,
  rooms,
  end,
  entranceLabels,
  initialRoomId,
  initialPose,
  children,
}: Props) {
  return (
    <div className={styles.page}>
      <AppHeader user={user} active={active} />
      <main className={styles.main}>
        <div className={`tc-container ${styles.stack}`}>
          <HallBreadcrumb items={crumbs} />
          {children}
          {rooms.length === 0 && <p className={styles.empty}>This wing doesn&apos;t have any cards yet.</p>}
          <LibraryHall
            rooms={rooms}
            end={end}
            entranceLabels={entranceLabels}
            initialRoomId={initialRoomId}
            initialPose={initialPose}
          />
        </div>
      </main>
    </div>
  );
}
