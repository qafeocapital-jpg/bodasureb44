import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Bike } from 'lucide-react';

export default function GlobalNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

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
            <Link to="/counties" className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors">Counties</Link>
            <Link to="/saccos" className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors">SACCOs</Link>
            <Link to="/riders" className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors">Riders</Link>
            <Link to="/about" className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors">About</Link>
            <Link to="/pricing" className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors">Pricing</Link>
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
            <Link to="/counties" onClick={closeMobile} className="block px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-accent">Counties</Link>
            <Link to="/saccos" onClick={closeMobile} className="block px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-accent">SACCOs</Link>
            <Link to="/riders" onClick={closeMobile} className="block px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-accent">Riders</Link>
            <Link to="/about" onClick={closeMobile} className="block px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-accent">About</Link>
            <Link to="/pricing" onClick={closeMobile} className="block px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-accent">Pricing</Link>
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