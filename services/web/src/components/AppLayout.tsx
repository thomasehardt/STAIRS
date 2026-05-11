import { type ReactNode, useState, useEffect, useCallback, useRef } from "react";
import {
  Home,
  Telescope,
  Calendar,
  ClipboardList,
  Settings,
  Menu,
  CalendarDays,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 600;
const DEFAULT_SIDEBAR_WIDTH = 256;

export function AppLayout({ children }: AppLayoutProps) {
  const navItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: CalendarDays, label: "Forecast", href: "/forecast" },
    { icon: Calendar, label: "Plan Generator", href: "/plan" },
    { icon: Telescope, label: "Catalogs", href: "/catalogs" },
    { icon: ClipboardList, label: "Observation Logs", href: "/logs" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing && sidebarRef.current) {
        const newWidth = mouseMoveEvent.clientX;
        if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden">
      {/* sidebar */}
      <aside
        ref={sidebarRef}
        style={{ width: isSidebarOpen ? sidebarWidth : 0 }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 border-r border-border bg-card transition-all duration-300 ease-in-out md:relative md:flex flex-col group",
          !isSidebarOpen && "md:w-0 border-r-0 overflow-hidden",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0 overflow-hidden whitespace-nowrap">
          <h2 className="text-xl font-black tracking-tighter text-primary">
            STAIRS
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(false)}
          >
            <PanelLeftClose className="w-5 h-5" />
          </Button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-secondary transition-colors whitespace-nowrap"
              onClick={() => {
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Resize Handle */}
        <div
          onMouseDown={startResizing}
          className={cn(
            "absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors",
            isResizing && "bg-primary w-1"
          )}
        />
      </aside>

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(true)}
              >
                <PanelLeftOpen className="w-5 h-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex items-center gap-4">
            {/* future user/settings icons go here */}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 pt-4 pb-12 relative">
          {isResizing && (
             <div className="absolute inset-0 z-50 cursor-col-resize" />
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
