// Full-screen gate shown when user's wallet is not yet activated
export default function HomeWalletActivateGate() {
  return (
    <div className="animate-fade-in min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-5">
        <div className="w-full max-w-sm p-8 rounded-2xl border border-primary/20 bg-primary/5">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center" title="Wallet icon">
              <svg className="w-16 h-16 text-primary" fill="currentColor" viewBox="0 0 24 24" aria-label="Wallet" role="img">
                <path d="M17 8h-1V5c0-.82-.68-1.5-1.5-1.5h-9C4.68 3.5 4 4.18 4 5v14c0 .82.68 1.5 1.5 1.5h9c.82 0 1.5-.68 1.5-1.5v-3h1c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-7 10.5H6.5V5H10v13.5zM17 14h-1V9h1v5z"/>
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-heading font-bold text-center mb-3">Activate Your BodaSure Wallet</h2>
          <p className="text-center text-muted-foreground mb-6">You must activate your wallet to use BodaSure. It only takes 2 minutes.</p>
          <a href="/app/wallet/activate" className="block w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm text-center animate-pulse-glow flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            Activate Now <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </a>
        </div>
      </div>
    </div>
  );
}