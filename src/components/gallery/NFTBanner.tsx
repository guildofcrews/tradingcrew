export function NFTBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1a1f35] via-[#252b45] to-[#1a1f35] border border-white/10 p-6 md:p-8">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIuMDMiIGN4PSIyMCIgY3k9IjIwIiByPSIxIi8+PC9nPjwvc3ZnPg==')] opacity-50" />
      
      <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F5C542] to-[#F96D3B] flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Digital Vault</h3>
            <p className="text-white/60 text-sm">NFT coming soon</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-white/40 text-sm">
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
            Secure
          </span>
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
            Verified
          </span>
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
            Blockchain
          </span>
        </div>
      </div>
    </div>
  );
}
