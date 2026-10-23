export function NFTBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[#1a1f35] border border-white/10 p-5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-50"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div>
          <h3 className="text-white font-semibold">Digital Vault</h3>
          <p className="text-white/40 text-sm">Your NFT cards will live here.</p>
        </div>
      </div>

      <span className="px-4 py-1.5 rounded-full border border-white/20 text-white/50 text-xs font-medium tracking-wider">
        COMING SOON
      </span>
    </div>
  );
}
