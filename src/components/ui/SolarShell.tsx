import React from "react";

interface SolarShellProps {
  children: React.ReactNode;
  showDisclaimer?: boolean;
  className?: string;
}

export function SolarShell({
  children,
  showDisclaimer = true,
  className = "",
}: SolarShellProps) {
  return (
    <div className="relative min-h-screen w-full bg-[#0D0907] text-[#FDF6EE]">
      {/* Ambient Background Mesh */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 85% 15%, rgba(255, 107, 43, 0.22), transparent 52%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 12% 82%, rgba(200, 66, 14, 0.18), transparent 50%)",
          }}
        />
      </div>

      {/* Mobile-first App Shell */}
      <div
        className={`relative z-10 mx-auto flex min-h-screen w-full max-w-[430px] flex-col sm:border-x sm:border-[#F5A65B]/10 ${className}`}
      >
        <main className="flex-1 flex flex-col">{children}</main>

        {showDisclaimer && (
          <footer className="px-5 pb-6 pt-4 text-center">
            <p className="text-[11px] leading-relaxed text-[#7C6E65]">
              For self-reflection and personal insight only—not clinical therapy,
              medical, or financial advice.
            </p>
          </footer>
        )}
      </div>
    </div>
  );
}
