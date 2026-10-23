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
}: GalleryHeroProps) {
  const firstName = userName.split(" ")[0] || userName;
  const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <section className="relative py-12 md:py-16">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
        {/* Left side - Title */}
        <div className="flex-1">
          <p className="text-[#F5C542] text-[11px] tracking-[0.3em] uppercase font-bold mb-3">
            THE COLLECTION OF
          </p>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl text-white font-bold mb-4 font-serif">
            {capitalizedName}&apos;s Gallery
          </h1>

          <p className="text-white/40 text-[15px]">
            Step through a door to explore each wing.
          </p>
        </div>

        {/* Right side - Stats */}
        <div className="flex gap-2">
          <StatBox label="Cards" value={totalCards} active />
          <StatBox label="Open to trade" value={0} />
          <StatBox label="Trades done" value={0} />
        </div>
      </div>
    </section>
  );
}

interface StatBoxProps {
  label: string;
  value: number;
  active?: boolean;
}

function StatBox({ label, value, active }: StatBoxProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg min-w-[85px] text-center ${
        active
          ? "bg-[#1a2036] border-2 border-white/30"
          : "bg-[#1a2036]/50 border border-white/10"
      }`}
    >
      <div
        className={`text-[22px] font-bold ${
          active ? "text-white" : "text-white/30"
        }`}
      >
        {value}
      </div>
      <div
        className={`text-[11px] ${
          active ? "text-white/60" : "text-white/25"
        }`}
      >
        {label}
      </div>
    </div>
  );
}
