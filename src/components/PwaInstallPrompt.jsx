import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bike, Download, X, Share, SquarePlus, Check, Smartphone } from 'lucide-react';

const DISMISS_KEY = 'bodasure_pwa_dismiss_count';
const NEXT_SHOW_KEY = 'bodasure_pwa_next_show_at';
const INSTALLED_KEY = 'bodasure_pwa_installed';

const MAX_DISMISSALS = 3;
const COOLDOWN_DAYS = 3;

const MARKETING_ROUTES = ['/', '/riders', '/counties', '/saccos'];
const MARKETING_DELAY = 8000;
const RIDER_DELAY = 5000;

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  const ua = navigator.userAgent;
  const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
  return isIOSDevice && !window.MSStream;
}

function getDismissCount() {
  try {
    return parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function getNextShowAt() {
  try {
    return localStorage.getItem(NEXT_SHOW_KEY);
  } catch {
    return null;
  }
}

function getInstalled() {
  try {
    return localStorage.getItem(INSTALLED_KEY) === 'true';
  } catch {
    return false;
  }
}

function shouldShow() {
  if (isStandalone()) return false;
  if (getInstalled()) return false;
  if (getDismissCount() >= MAX_DISMISSALS) return false;
  const nextShowAt = getNextShowAt();
  if (nextShowAt && Date.now() < new Date(nextShowAt).getTime()) return false;
  return true;
}

function recordDismiss() {
  const count = getDismissCount() + 1;
  localStorage.setItem(DISMISS_KEY, String(count));
  if (count < MAX_DISMISSALS) {
    const next = new Date(Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    localStorage.setItem(NEXT_SHOW_KEY, next.toISOString());
  }
}

export default function PwaInstallPrompt() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [showIOSPanel, setShowIOSPanel] = useState(false);
  const [iosDetected, setIosDetected] = useState(false);
  const deferredPromptRef = useRef(null);
  const timerRef = useRef(null);

  // Capture beforeinstallprompt
  useEffect(() => {
    function handler(e) {
      e.preventDefault();
      deferredPromptRef.current = e;
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Mark installed
  useEffect(() => {
    function onInstalled() {
      localStorage.setItem(INSTALLED_KEY, 'true');
      setVisible(false);
      setShowIOSPanel(false);
    }
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  // Route-based trigger
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setShowIOSPanel(false);

    const path = location.pathname;
    const isRiderHome = path === '/app';
    const isMarketing = MARKETING_ROUTES.includes(path);

    if (!isRiderHome && !isMarketing) return;

    const delay = isRiderHome ? RIDER_DELAY : MARKETING_DELAY;
    setIosDetected(isIOS());

    timerRef.current = setTimeout(() => {
      if (shouldShow()) {
        setVisible(true);
      }
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [location.pathname]);

  function handleDismiss() {
    recordDismiss();
    setVisible(false);
    setShowIOSPanel(false);
  }

  async function handleInstall() {
    if (iosDetected) {
      setShowIOSPanel(true);
      return;
    }
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) {
      // No deferred prompt — show iOS-style instructions as fallback
      setShowIOSPanel(true);
      return;
    }
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    deferredPromptRef.current = null;
    if (outcome === 'accepted') {
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <PwaSheet
      onDismiss={handleDismiss}
      onInstall={handleInstall}
      showIOSPanel={showIOSPanel}
      iosDetected={iosDetected}
    />
  );
}

function PwaSheet({ onDismiss, onInstall, showIOSPanel, iosDetected }) {
  const benefits = [
    { label: 'Free Wallet 💳' },
    { label: 'County Permits 🏛️' },
    { label: 'Works Offline ⚡' },
  ];

  const iosSteps = [
    {
      icon: Share,
      label: 'Tap the Share button',
      sub: 'It\'s the square with an arrow pointing up',
    },
    {
      icon: SquarePlus,
      label: 'Select "Add to Home Screen"',
      sub: 'Scroll through the options and tap it',
    },
    {
      icon: Check,
      label: 'Tap "Add" to confirm',
      sub: 'BodaSure will appear on your home screen',
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onDismiss}
      />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up sm:animate-fade-in overflow-hidden">
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full hover:bg-muted transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        <div className="px-6 pb-6 pt-3 sm:pt-6">
          {/* App icon */}
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff5a1f] to-[#e04e1a] flex items-center justify-center shadow-lg shadow-orange-500/20 mb-3">
              <Bike className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-bold text-foreground">BodaSure</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Your bodaboda super-app</p>
          </div>

          {/* Benefit pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {benefits.map((b) => (
              <span
                key={b.label}
                className="inline-flex items-center rounded-full bg-[#ff5a1f]/10 text-[#ff5a1f] text-xs font-medium px-3 py-1.5"
              >
                {b.label}
              </span>
            ))}
          </div>

          {/* iOS instruction panel or install button */}
          {showIOSPanel ? (
            <div className="mt-5 space-y-4">
              <p className="text-sm font-semibold text-center text-foreground">
                {iosDetected ? 'Install in 3 steps' : 'Install from your browser menu'}
              </p>
              {iosSteps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#ff5a1f]/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-[#ff5a1f]" strokeWidth={2} />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-semibold text-foreground">{step.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.sub}</p>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground/50">{idx + 1}</span>
                  </div>
                );
              })}
              <button
                onClick={onDismiss}
                className="w-full h-12 rounded-xl bg-[#ff5a1f] text-white font-semibold mt-2 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Check className="w-5 h-5" /> Got it
              </button>
            </div>
          ) : (
            <div className="mt-5">
              <button
                onClick={onInstall}
                className="w-full h-12 rounded-xl bg-[#ff5a1f] text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md shadow-orange-500/20"
              >
                {iosDetected ? (
                  <>
                    <Smartphone className="w-5 h-5" /> Install App
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" /> Install App
                  </>
                )}
              </button>
              <button
                onClick={onDismiss}
                className="w-full text-center text-sm text-muted-foreground py-3 hover:text-foreground transition-colors"
              >
                Not Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}