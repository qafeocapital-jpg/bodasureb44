import { Link } from 'react-router-dom';
import { Bike, Twitter, Linkedin, Facebook, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Logo + tagline */}
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
                <Bike className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-heading font-extrabold text-xl">BodaSure</span>
            </Link>
            <p className="text-sm text-background/70 max-w-xs">Digitizing the BodaBoda Economy</p>
            <div className="flex gap-3 mt-4">
              <a href="#" aria-label="Twitter" className="w-8 h-8 rounded-lg bg-background/10 hover:bg-primary flex items-center justify-center transition-colors"><Twitter className="w-4 h-4" /></a>
              <a href="#" aria-label="LinkedIn" className="w-8 h-8 rounded-lg bg-background/10 hover:bg-primary flex items-center justify-center transition-colors"><Linkedin className="w-4 h-4" /></a>
              <a href="#" aria-label="Facebook" className="w-8 h-8 rounded-lg bg-background/10 hover:bg-primary flex items-center justify-center transition-colors"><Facebook className="w-4 h-4" /></a>
              <a href="#" aria-label="Instagram" className="w-8 h-8 rounded-lg bg-background/10 hover:bg-primary flex items-center justify-center transition-colors"><Instagram className="w-4 h-4" /></a>
            </div>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-background/50 mb-3">Solutions</h4>
            <ul className="space-y-2.5">
              <li><Link to="/counties" className="text-sm text-background/70 hover:text-primary transition-colors">Counties</Link></li>
              <li><Link to="/saccos" className="text-sm text-background/70 hover:text-primary transition-colors">SACCOs</Link></li>
              <li><Link to="/riders" className="text-sm text-background/70 hover:text-primary transition-colors">Riders</Link></li>
              <li><Link to="/how-it-works" className="text-sm text-background/70 hover:text-primary transition-colors">How It Works</Link></li>
              <li><Link to="/pricing" className="text-sm text-background/70 hover:text-primary transition-colors">Pricing</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-background/50 mb-3">Company</h4>
            <ul className="space-y-2.5">
              <li><Link to="/about" className="text-sm text-background/70 hover:text-primary transition-colors">About</Link></li>
              <li><Link to="/security" className="text-sm text-background/70 hover:text-primary transition-colors">Security</Link></li>
              <li><a href="#" className="text-sm text-background/70 hover:text-primary transition-colors">Blog</a></li>
              <li><a href="mailto:hello@bodasure.co.ke" className="text-sm text-background/70 hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-background/50 mb-3">Legal</h4>
            <ul className="space-y-2.5">
              <li><Link to="/privacy" className="text-sm text-background/70 hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-sm text-background/70 hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link to="/cookies" className="text-sm text-background/70 hover:text-primary transition-colors">Cookie Policy</Link></li>
              <li><Link to="/aml" className="text-sm text-background/70 hover:text-primary transition-colors">AML / KYC</Link></li>
              <li><Link to="/acceptable-use" className="text-sm text-background/70 hover:text-primary transition-colors">Acceptable Use</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-background/50">© 2026 BodaSure by Mint Mobitech. All rights reserved.</p>
          <p className="text-xs text-background/50">Nairobi, Kenya</p>
        </div>
      </div>
    </footer>
  );
}