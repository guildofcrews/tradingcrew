import Link from "next/link";
import { LogoMark } from "./Logo";

export function ServiceUnavailable() {
  return (
    <div className="min-h-screen bg-[#FFF8EC] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <LogoMark className="h-20 w-20 mx-auto mb-6" />
        <h1 className="text-3xl font-extrabold text-[#2B3A67] mb-4">
          Service Unavailable
        </h1>
        <p className="text-[#2B3A67]/70 mb-6">
          This feature is currently unavailable. The database connection is not configured.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 bg-[#F96D3B] text-white font-bold rounded-full hover:bg-[#e85a2a] transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
