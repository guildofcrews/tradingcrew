import type { Card } from "@/lib/cards";
import styles from "./DigitalMarks.module.css";

/** Small labels for a sports NFT the owner claims to hold. */
export function DigitalMarks({ card }: { card: Pick<Card, "kind"> }) {
  if (card.kind !== "digital") return null;
  return (
    <p className={styles.marks}>
      <span className={styles.digital}>Digital</span>
      <span className={styles.claimed}>Claimed</span>
      <span className={styles.sr}>Claimed, not verified on the blockchain.</span>
    </p>
  );
}
