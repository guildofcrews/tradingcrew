import styles from "./StatTile.module.css";

export function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className={styles.tile}>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}
