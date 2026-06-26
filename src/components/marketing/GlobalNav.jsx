import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ChevronDown, Bike } from 'lucide-react';

export default function GlobalNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
              <Bike className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading font-extrabold text-xl tracking-tight">BodaSure</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            <div
              className="relative"
              onMouseEnter={() => setSolutionsOpen(true)}
              onMouseLeave={() => setSolutionsOpen(false)}
            >
              <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
                Solutions <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {solutionsOpen && (
                <div className="absolute top-full left-0 w-56 bg-card border border-border rounded-xl shadow-xl py-2 animate-fade-in">
                  <Link to="/counties" className="block px-4 py-2.5 text-sm hover:bg-accent transition-colors">
                    <span className="font-semibold">For Counties</span>
                    <span className="block text-xs text-muted-foreground">Government &amp; revenue teams</span>
                  </Link>
                  <Link to="/saccos" className="block px-4 py-2.5 text-sm hover:bg-accent transition-colors">
                    <span className="font-semibold">For SACCOs</span>
                    <span className="block text-xs text-muted-foreground">Welfare groups &amp; officials</span>
                  </Link>
                  <Link to="/riders" className="block px-4 py-2.5 text-sm hover:bg-accent transition-colors">
                    <span className="font-semibold">For Riders</span>
                    <span className="block text-xs text-muted-foreground">BodaBoda operators</span>
                  </Link>
                </div>
              )}
            </div>
            <Link to="/about" className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors">About</Link>
            <Link to="/pricing" className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors">Pricing</Link>
            <Link to="/security" className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors">Security</Link>
          </div>

          {/* Right side CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            <Link to="/login" className="px-5 py-2 text-sm font-semibold border border-border rounded-xl hover:bg-accent transition-colors">Login</Link>
            <Link to="/register" className="px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity shadow-sm">Get Started</Link>
          </div>

          {/* Mobile hamburger */}
          <button className="lg:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-background animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 pt-2 pb-1">Solutions</p>
            <Link to="/counties" onClick={closeMobile} className="block px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-accent">For Counties</Link>
            <Link to="/saccos" onClick={closeMobile} className="block px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-accent">For SACCOs</Link>
            <Link to="/riders" onClick={closeMobile} className="block px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-accent">For Riders</Link>
            <Link to="/about" onClick={closeMobile} className="block px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-accent">About</Link>
            <Link to="/pricing" onClick={closeMobile} className="block px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-accent">Pricing</Link>
            <Link to="/security" onClick={closeMobile} className="block px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-accent">Security</Link>
            <div className="flex gap-2 pt-3">
              <Link to="/login" onClick={closeMobile} className="flex-1 text-center px-4 py-2.5 text-sm font-semibold border border-border rounded-xl">Login</Link>
              <Link to="/register" onClick={closeMobile} className="flex-1 text-center px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl">Get Started</Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}