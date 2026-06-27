import { Headphones } from 'lucide-react';

export default function SupportFAB() {
  const handleClick = () => {
    // Use Reamaze's documented API method
    if (window._support?.openChat && typeof window._support.openChat === 'function') {
      window._support.openChat();
    } else {
      // Fallback: navigate to support page if Reamaze not loaded
      console.warn('Reamaze not loaded, opening support page instead');
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