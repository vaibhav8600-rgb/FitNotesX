import { useEffect, useMemo, useState } from "react";
import { Menu, Plus, Calendar, Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useSettingsStore } from "@/store/settingsStore";
import CalendarPopup from "@/components/CalendarPopup";

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
  onAddClick?: () => void;
  rightAction?: React.ReactNode;
}

export default function Header({ title, onMenuClick, onAddClick, rightAction }: HeaderProps) {
  const { theme, setTheme } = useSettingsStore(); // theme: "auto" | "light" | "dark"
  const navigate = useNavigate();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Determine effective theme when on "auto"
  const prefersDark = useMemo(
    () => window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches,
    []
  );

  useEffect(() => {
    // Keep prefersDark in sync if OS theme changes while user is on auto
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "auto") {
        // If your store auto-applies on change, you can omit this.
        // This just forces a re-render by updating state via no-op setTheme("auto").
        setTheme("auto");
      }
    };
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, [theme, setTheme]);

  const effectiveTheme = theme === "auto" ? (prefersDark ? "dark" : "light") : theme;

  // Icon shows the CURRENT setting (not the next)
  const ThemeIcon = theme === "auto" ? Monitor : theme === "dark" ? Moon : Sun;

  const handleThemeClick = (e: React.MouseEvent) => {
    // Optional: SHIFT-click to quickly return to auto
    if (e.shiftKey) {
      setTheme("auto");
      return;
    }

    if (theme === "auto") {
      // From auto → flip the effective system theme
      setTheme(effectiveTheme === "light" ? "dark" : "light");
    } else {
      // Toggle light ⇄ dark
      setTheme(theme === "light" ? "dark" : "light");
    }
  };

  const label =
    theme === "auto"
      ? `Theme: Auto (effective ${effectiveTheme}). Click to switch to ${effectiveTheme === "light" ? "dark" : "light"}. Shift-click to set Auto.`
      : `Theme: ${theme}. Click to switch to ${theme === "light" ? "dark" : "light"}. Shift-click to set Auto.`;

  return (
    <header className="bg-primary text-primary-foreground h-14 flex items-center justify-between px-4 relative z-10">
      <div className="flex items-center space-x-3">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <Menu size={20} />
          </Button>
        )}
        <h1 className="text-lg font-semibold truncate">{title}</h1>
      </div>

      <div className="flex items-center space-x-2">
        {/* Calendar shortcut */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCalendarOpen(true)}
          className="text-primary-foreground hover:bg-primary-foreground/20"
          aria-label="Open calendar"
          title="Open calendar"
        >
          <Calendar size={20} />
        </Button>

        {/* Single-icon Theme toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleThemeClick}
          className="text-primary-foreground hover:bg-primary-foreground/20"
          aria-label={label}
          title={label}
        >
          <ThemeIcon size={20} />
        </Button>

        {/* Add button */}
        {onAddClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddClick}
            className="text-primary-foreground hover:bg-primary-foreground/20"
            aria-label="Add"
            title="Add"
          >
            <Plus size={20} />
          </Button>
        )}

        {rightAction}
      </div>

      {/* Calendar Popup */}
      <CalendarPopup isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} />
    </header>
  );
}
