import { Link, useLocation } from "react-router";

import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Menu" },
  { to: "/orders", label: "Orders" },
  { to: "/orders/new", label: "New order" },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header
        className="border-border bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-10 border-b backdrop-blur"
        role="banner"
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="text-foreground hover:text-foreground/90 focus-visible:outline-ring text-lg font-semibold tracking-tight no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Restaurant Order
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-1">
            {navItems.map(({ to, label }) => {
              const isActive =
                to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "focus-visible:outline-ring rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main
        className="flex-1 px-4 py-6 sm:px-6 lg:px-8"
        id="main-content"
        tabIndex={-1}
        role="main"
      >
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
