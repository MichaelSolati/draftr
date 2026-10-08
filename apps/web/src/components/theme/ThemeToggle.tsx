import {ChevronDown, Laptop, Moon, Sun} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';

import {type Theme, useTheme} from './ThemeProvider';

export const ThemeToggle: React.FC = () => {
  const {theme, resolvedTheme, setTheme} = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options: Array<{value: Theme; label: string; icon: React.ReactNode}> = [
    {
      value: 'light',
      label: 'Light',
      icon: <Sun className="h-4 w-4 text-amber-500" />,
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: <Moon className="h-4 w-4 text-indigo-400" />,
    },
    {
      value: 'system',
      label: 'System',
      icon: <Laptop className="h-4 w-4 text-muted-foreground" />,
    },
  ];

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border bg-card text-foreground hover:bg-accent transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
        title={`Theme: ${theme}`}
      >
        {resolvedTheme === 'dark' ? (
          <Moon className="h-3.5 w-3.5 text-indigo-400" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-amber-500" />
        )}
        <span className="capitalize">{theme}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-32 origin-top-right rounded-md border border-border bg-popover shadow-lg ring-1 ring-black/5 focus:outline-none z-50 py-1">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setTheme(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-accent hover:text-accent-foreground transition-colors ${
                theme === opt.value
                  ? 'font-semibold text-primary bg-accent/50'
                  : 'text-foreground'
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
