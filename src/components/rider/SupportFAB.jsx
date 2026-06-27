import { Headphones } from 'lucide-react';

export default function SupportFAB() {
  const handleClick = () => {
    // Try multiple Reamaze API methods
    if (window._support?.openChat) {
      window._support.openChat();
    } else if (window.reamaze) {
      window.reamaze('open');
    } else {
      // Wait for Reamaze to load
      const checkReamaze = setInterval(() => {
        if (window._support?.openChat) {
          window._support.openChat();
          clearInterval(checkReamaze);
        } else if (window.reamaze) {
          window.reamaze('open');
          clearInterval(checkReamaze);
        }
      }, 100);
      setTimeout(() => clearInterval(checkReamaze), 3000);
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Open support chat"
      className="fixed right-4 z-40 w-11 h-11 rounded-full bg-white border-2 border-[#1E2A4A] flex items-center justify-center shadow-lg"
      style={{ bottom: 'calc(130px + env(safe-area-inset-bottom, 0px))' }}
    >
      <Headphones className="w-5 h-5" style={{ color: '#1E2A4A' }} />
    </button>
  );
}