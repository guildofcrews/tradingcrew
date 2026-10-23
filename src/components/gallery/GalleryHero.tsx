"use client";

interface GalleryHeroProps {
  userName: string;
  totalCards: number;
  categoryBreakdown: {
    pokemon: number;
    basketball: number;
    baseball: number;
    football: number;
    uncategorized: number;
  };
}

export function GalleryHero({
  userName,
  totalCards,
  categoryBreakdown,
}: GalleryHeroProps) {
  const firstName = userName.split(" ")[0] || userName;
  const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <section className="relative py-12 md:py-16">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
        {/* Left side - Title */}
        <div className="flex-1">
          <p className="text-[#F5C542] text-xs tracking-[0.25em] uppercase font-medium mb-3">
            THE COLLECTION OF
          </p>
          
          <h1
            className="text-4xl md:text-5xl lg:text-6xl text-white font-bold mb-4"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {capitalizedName}&apos;s Gallery
          </h1>

          <p className="text-white/50 text-base">
            Step through a door to explore each wing.
          </p>
        </div>

        {/* Right side - Stats */}
        <div className="flex gap-3">
          <StatBox label="Cards" value={totalCards} />
          <StatBox label="Open to trade" value={0} disabled />
          <StatBox label="Trades done" value={0} disabled />
        </div>
      </div>
    </section>
  );
}

interface StatBoxProps {
  label: string;
  value: number;
  disabled?: boolean;
}

function StatBox({ label, value, disabled }: StatBoxProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border ${
        disabled
          ? "border-white/10 bg-white/5"
          : "border-white/20 bg-white/10"
      } min-w-[90px] text-center`}
    >
      <div
        className={`text-2xl font-bold ${
          disabled ? "text-white/30" : "text-white"
        }`}
      >
        {value}
      </div>
      <div
        className={`text-xs ${
          disabled ? "text-white/30" : "text-white/60"
        }`}
      >
        {label}
      </div>
    </div>
  );
}
