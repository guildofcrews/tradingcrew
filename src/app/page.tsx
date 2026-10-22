"use client";

import { useState } from "react";
import { Logo, LogoMark } from "@/components/Logo";

function CameraIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function UsersIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  );
}

function SwapIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  );
}

function SparklesIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

const features = [
  {
    icon: CameraIcon,
    title: "Snap Your Cards",
    description: "Take photos of your trading cards — sports, Pokémon, Yu-Gi-Oh, and more. Build your digital collection in seconds.",
    color: "bg-[#5B8BD4]",
  },
  {
    icon: UsersIcon,
    title: "Share with Friends",
    description: "Create galleries and share them with your friends. Show off your rarest cards and see what others have collected.",
    color: "bg-[#F96D3B]",
  },
  {
    icon: SwapIcon,
    title: "Propose Trades",
    description: "Found a card you want? Propose a trade! Agree on terms online, then meet up to swap in person — safe and simple.",
    color: "bg-[#F5C542]",
  },
  {
    icon: SparklesIcon,
    title: "NFT Cards Coming Soon",
    description: "Get ready for the future! Digital NFT trading cards are on the way. Collect, trade, and own unique digital cards.",
    color: "bg-[#2B3A67]",
  },
];

export default function Home() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8EC]">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#F5C542] opacity-20 blur-3xl" />
          <div className="absolute top-40 -left-20 w-80 h-80 rounded-full bg-[#5B8BD4] opacity-15 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-[#F96D3B] opacity-10 blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 md:pt-12 md:pb-24">
          {/* Logo */}
          <div className="flex justify-center mb-8 md:mb-12">
            <Logo variant="light" />
          </div>

          {/* Tagline */}
          <div className="text-center mb-8 md:mb-12">
            <p className="text-lg md:text-xl font-semibold tracking-[0.3em] text-[#2B3A67] uppercase">
              Snap · Share · Swap
            </p>
          </div>

          {/* Hero Content */}
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#2B3A67] leading-tight mb-6">
              The Ultimate Trading Card{" "}
              <span className="text-[#F96D3B]">Community</span>{" "}
              for Kids
            </h1>
            <p className="text-lg md:text-xl text-[#2B3A67]/80 leading-relaxed mb-8">
              Upload your trading cards, show off your collection to friends, 
              and propose trades to complete in person. Whether you&apos;re into 
              sports cards, Pokémon, or any collectibles — TradingCrew makes 
              trading fun and safe!
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="#signup"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-[#F96D3B] rounded-full shadow-lg hover:bg-[#e85a2a] hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Join the Waitlist
              </a>
              <a
                href="#features"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-[#2B3A67] bg-white border-2 border-[#2B3A67] rounded-full hover:bg-[#2B3A67] hover:text-white transition-all duration-200"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Decorative cards */}
          <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 opacity-30">
            <div className="relative">
              <div className="w-24 h-32 bg-[#5B8BD4] rounded-xl rotate-[-20deg] absolute -left-6 border-4 border-[#3B5998]" />
              <div className="w-24 h-32 bg-[#F5C542] rounded-xl rotate-[10deg] border-4 border-[#C49A2C]" />
            </div>
          </div>
          <div className="hidden lg:block absolute left-8 bottom-20 opacity-30">
            <div className="relative">
              <div className="w-20 h-28 bg-[#F96D3B] rounded-xl rotate-[15deg] absolute -right-4 border-4 border-[#d44d1a]" />
              <div className="w-20 h-28 bg-[#2B3A67] rounded-xl rotate-[-10deg] border-4 border-[#1B1F4B]" />
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#2B3A67] mb-4">
              How It Works
            </h2>
            <p className="text-lg text-[#2B3A67]/70 max-w-2xl mx-auto">
              TradingCrew makes collecting and trading cards easier and more fun than ever!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="relative p-6 md:p-8 bg-[#FFF8EC] rounded-3xl border-2 border-[#2B3A67]/10 hover:border-[#F96D3B]/30 hover:shadow-xl transition-all duration-300 group"
              >
                <div
                  className={`inline-flex items-center justify-center w-14 h-14 ${feature.color} rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-[#2B3A67] mb-3">
                  {feature.title}
                </h3>
                <p className="text-[#2B3A67]/70 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Signup Section */}
      <section id="signup" className="py-16 md:py-24 bg-[#1B1F4B]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <LogoMark className="h-20 w-20 md:h-24 md:w-24 mx-auto mb-6" />
          </div>
          
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Coming Soon!
          </h2>
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            We&apos;re working hard to bring TradingCrew to you. Join the waitlist 
            to be the first to know when we launch!
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 px-6 py-4 rounded-full text-[#2B3A67] font-medium placeholder:text-[#2B3A67]/50 focus:outline-none focus:ring-4 focus:ring-[#F96D3B]/50"
                  required
                />
                <button
                  type="submit"
                  className="px-8 py-4 bg-[#F96D3B] text-white font-bold rounded-full hover:bg-[#e85a2a] transform hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Notify Me
                </button>
              </div>
              <p className="mt-4 text-sm text-white/60">
                We&apos;ll never spam you. Unsubscribe anytime.
              </p>
            </form>
          ) : (
            <div className="bg-[#F96D3B]/20 border-2 border-[#F96D3B] rounded-2xl p-6 max-w-md mx-auto">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-xl font-bold text-white mb-2">You&apos;re on the list!</h3>
              <p className="text-white/80">
                Thanks for signing up! We&apos;ll let you know as soon as TradingCrew launches.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#1B1F4B] border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <LogoMark className="h-8 w-8" />
              <span className="font-bold text-white">
                Trading<span className="text-[#F5C542]">Crew</span>
                <span className="text-white/60 text-sm">.ai</span>
              </span>
            </div>
            <p className="text-white/60 text-sm">
              © 2024 TradingCrew. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
