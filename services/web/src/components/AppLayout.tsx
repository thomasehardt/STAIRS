import { type ReactNode } from "react";
import {
  Home,
  Telescope,
  Calendar,
  ClipboardList,
  Settings,
  Menu,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: CalendarDays, label: "Forecast", href: "/forecast" },
    { icon: Calendar, label: "Plan Generator", href: "/plan" },
    { icon: Telescope, label: "Catalogs", href: "/catalogs" },
    { icon: ClipboardList, label: "Observation Logs", href: "/logs" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* sidebar - fixed on the left */}
      <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-black tracking-tighter text-primary">
            STAIRS
          </h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-secondary transition-colors"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* main content area */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            {/* future user/settings icons go here */}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
