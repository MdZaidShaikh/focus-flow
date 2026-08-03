'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Menu } from 'lucide-react';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsMobile(true);
        setIsSidebarOpen(false);
      } else {
        setIsMobile(false);
        setIsSidebarOpen(true);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex w-full min-h-screen relative overflow-hidden bg-bg">
      {/* Mobile Backdrop */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div 
        className={`
          fixed md:relative z-50 h-screen transition-all duration-300 ease-in-out shrink-0 overflow-hidden
          ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:w-0 w-64'}
        `}
      >
        <div className="w-64 h-full relative">
          <Sidebar 
            isMobile={isMobile} 
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full h-screen overflow-hidden bg-bg flex flex-col relative transition-all duration-300 min-w-0">
        {/* Top bar for toggle button (only visible when sidebar is closed) */}
        {!isSidebarOpen && (
          <div className="sticky top-0 z-30 p-2 flex items-center shrink-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-md text-muted hover:bg-border/50 hover:text-ink transition-colors focus:outline-none"
              aria-label="Open Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="ml-3 font-fraunces font-semibold text-ink text-sm opacity-70">
              FocusFlow
            </div>
          </div>
        )}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
