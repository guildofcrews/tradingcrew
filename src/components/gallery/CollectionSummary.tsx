import { PRICE_CREDIT, type CollectionTotal } from "@/lib/pokemon-price/display";
import styles from "./CollectionSummary.module.css";

/** Approximate total. Hidden entirely when the wing is not priced (sports). */
export function CollectionSummary({ total }: { total: CollectionTotal }) {
  if (total.cards === 0) return null;
  const priced = `${total.priced} of ${total.cards} ${total.cards === 1 ? "card" : "cards"} priced`;
  return (
    <div className={styles.summary}>
      {total.headline && <p className={styles.headline}>{total.headline}</p>}
      <p className={styles.detail}>
        {priced}
        {total.asOf ? ` · as of ${total.asOf}` : ""}
      </p>
      {total.headline && <p className={styles.credit}>{PRICE_CREDIT}</p>}
    </div>
  );
}
