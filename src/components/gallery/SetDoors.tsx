import type { Wing } from "@/lib/cards";
import { galleryHref, type SetGroup } from "@/lib/card-sets";
import { collectionTotalFromCards } from "@/lib/pokemon-price/display";
import { PokemonViewLink } from "./SetViewToggle";
import { WingDoor } from "./WingDoor";
import styles from "./SetDoors.module.css";
import wingStyles from "@/app/my-cards/[wing]/page.module.css";

export function SetDoors({
  groups,
  wing,
  basePath,
}: {
  groups: readonly SetGroup[];
  wing: Wing;
  basePath: string;
}) {
  return (
    <div className={styles.doors}>
      {groups.map((group) => (
        <WingDoor
          key={group.id}
          wing={wing}
          title={group.name}
          eyebrow={group.eyebrow}
          enterLabel="Open set"
          titleLines={2}
          count={group.cards.length}
          value={collectionTotalFromCards(group.cards).short}
          previews={group.cards.slice(0, 2)}
          href={galleryHref(basePath, { set: group.id })}
        />
      ))}
    </div>
  );
}

export function SetDrillIn({ group, basePath }: { group: SetGroup; basePath: string }) {
  const total = collectionTotalFromCards(group.cards);
  const count = group.cards.length;
  return (
    <div className={wingStyles.setBar}>
      <PokemonViewLink href={basePath} mode="sets" className={wingStyles.back}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
        All sets
      </PokemonViewLink>
      <h2 className={wingStyles.setName}>{group.name}</h2>
      <p className={wingStyles.sub}>
        {count} {count === 1 ? "card" : "cards"}
        {total.short ? ` · ${total.short}` : ""}
      </p>
    </div>
  );
}
