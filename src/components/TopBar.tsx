import { ChevronDown, Download, Printer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ActiveTab } from '../types/civic';

interface TopBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
}

const NAV_ITEMS: { id: ActiveTab; label: string }[] = [
  { id: 'confronto', label: 'Confronto' },
  { id: 'scheda', label: 'Scheda Città' },
  { id: 'classifica', label: 'Classifica' },
  { id: 'simulatore', label: 'Simulatore' },
  { id: 'percezione', label: 'Percezione' },
];

export function TopBar({
  activeTab,
  onTabChange,
  onExportCsv,
  onExportPdf,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header className="no-print sticky top-0 z-30 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-[#E5E3DC]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Wordmark */}
        <button
          type="button"
          onClick={() => onTabChange('confronto')}
          className="font-serif text-xl font-semibold tracking-tight text-[#18181B] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E3A8A]"
        >
          Osservatorio Civico
        </button>

        {/* Zone 2: 4 Single-line Navigation Links */}
        <nav
          aria-label="Navigazione principale"
          className="hidden md:flex items-center gap-8"
        >
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`relative py-1 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E3A8A] ${
                  active
                    ? 'text-[#1E3A8A]'
                    : 'text-[#57534E] hover:text-[#18181B]'
                }`}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-[19px] h-[2px] bg-[#1E3A8A]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#172D6E] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
          >
            <span>Esporta Scheda</span>
            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 bg-white border border-[#E5E3DC] rounded-lg shadow-sm py-1.5 z-40"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onExportCsv();
                }}
                className="w-full px-4 py-2.5 text-left text-xs font-medium text-[#18181B] hover:bg-[#FAF9F6] flex items-center gap-2.5 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#1E3A8A]" aria-hidden="true" />
                <span>Scarica dataset CSV</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onExportPdf();
                }}
                className="w-full px-4 py-2.5 text-left text-xs font-medium text-[#18181B] hover:bg-[#FAF9F6] flex items-center gap-2.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#1E3A8A]" aria-hidden="true" />
                <span>Stampa o salva PDF</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        aria-label="Navigazione mobile"
        className="md:hidden border-t border-[#E5E3DC] px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto"
      >
        {NAV_ITEMS.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#1E3A8A] text-white'
                  : 'text-[#57534E] hover:text-[#18181B]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
