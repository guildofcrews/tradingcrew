"use client";

import styles from "./ArtChoice.module.css";

export function ArtChoice({
  preferKidPhoto,
  disabled = false,
  onChoose,
}: {
  preferKidPhoto: boolean;
  disabled?: boolean;
  onChoose: (preferKidPhoto: boolean) => void;
}) {
  return (
    <div className={styles.choice} role="group" aria-label="Card picture">
      <button
        type="button"
        aria-pressed={!preferKidPhoto}
        disabled={disabled}
        onClick={() => onChoose(false)}
      >
        Official art
      </button>
      <button
        type="button"
        aria-pressed={preferKidPhoto}
        disabled={disabled}
        onClick={() => onChoose(true)}
      >
        My photo
      </button>
    </div>
  );
}
