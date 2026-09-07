export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing min-h-dvh bg-bg text-ink">
      <a
        href="#main"
        className="sr-only rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60]"
      >
        Skip to content
      </a>
      <style>{`
        .marketing :where(a,button,[tabindex]):focus-visible {
          outline: 2px solid var(--brand);
          outline-offset: 2px;
          border-radius: 4px;
        }
        @media (prefers-reduced-motion: no-preference) {
          .st-caret { animation: st-blink 1s steps(2, start) infinite; }
        }
        @keyframes st-blink { 50% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .marketing .animate-ping { animation: none; }
        }
      `}</style>
      {children}
    </div>
  );
}
