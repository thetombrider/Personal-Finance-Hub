import { Link, useLocation } from "wouter";
import { LayoutDashboard, CreditCard, PieChart, Receipt, Menu, Settings, FileSpreadsheet, TrendingUp, LogOut, Calculator, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";


export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Initialize expanded state based on current location
  useEffect(() => {
    if (location.startsWith("/reports")) {
      setExpandedItems(prev => ({ ...prev, "Reports": true }));
    }
    if (location.startsWith("/budget")) {
      setExpandedItems(prev => ({ ...prev, "Budget": true }));
    }
    if (location.startsWith("/settings")) {
      setExpandedItems(prev => ({ ...prev, "Settings": true }));
    }
  }, [location]);

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/transactions", label: "Transactions", icon: Receipt },
    { href: "/accounts", label: "Accounts", icon: CreditCard },

    {
      href: "/budget",
      label: "Budget",
      icon: Calculator,
      subItems: [
        { href: "/budget/overview", label: "Budget Overview" },
        { href: "/budget/baseline", label: "Set Budget Baseline" },
        { href: "/budget/recurring", label: "Recurring Transactions" },
        { href: "/budget/planned", label: "Planned Transactions" },
      ]
    },
    { href: "/categories", label: "Categories", icon: PieChart },
    {
      href: "/reports",
      label: "Reports",
      icon: FileSpreadsheet,
      subItems: [
        { href: "/reports/income-statement", label: "Income Statement" },
        { href: "/reports/balance-sheet", label: "Balance Sheet" },
      ]
    },
    { href: "/portfolio", label: "Portfolio", icon: TrendingUp },
    { href: "/import", label: "Import Data", icon: FileSpreadsheet },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
      subItems: [
        { href: "/settings/accounts", label: "Account Management" },
        { href: "/settings/categories", label: "Category Management" },
        { href: "/settings/webhooks", label: "Webhook Management" },
        { href: "/settings/email-reports", label: "Email Reports" },
        { href: "/settings", label: "User Settings" },
      ]
    },
  ];



  const NavContent = () => (
    <div className="flex flex-col h-full">
      <Link href="/">
        <div className="p-6 flex justify-center items-center cursor-pointer">
          <span className="font-heading font-bold text-xl tracking-tight text-foreground">FinTrack</span>
        </div>
      </Link>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          // Active if current path is exactly item.href or if it's a parent of current path (for subitems)
          // But for "Reports" parent, we might want it active if any child is active.
          const isActive = location === item.href || (item.subItems && location.startsWith(item.href));
          const isExpanded = expandedItems[item.label];

          return (
            <div key={item.label}>
              {!item.subItems ? (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon size={18} className={cn("transition-colors", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                  {item.label}
                </Link>
              ) : (
                <div className="space-y-1">
                  <button
                    onClick={() => toggleExpanded(item.label)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group hover:bg-accent hover:text-foreground",
                      isActive // Even if collapsed, if active show as selected but maybe different style? Or key it on expanded.
                        ? "text-primary hover:bg-primary/5"
                        : "text-muted-foreground"
                    )}>
                    <div className="flex items-center gap-3">
                      <Icon size={18} className={cn("transition-colors", isActive ? "text-primary" : "text-muted-foreground")} />
                      {item.label}
                    </div>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>

                  {isExpanded && (
                    <div className="pl-9 space-y-1">
                      {item.subItems.map(sub => {
                        const isSubActive = location === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={cn(
                              "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                              isSubActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            )}
                          >
                            {sub.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>



      <div className="mt-auto p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={async () => {
            await fetch("/api/logout", { method: "POST" });
            window.location.reload();
          }}
        >
          <LogOut size={18} />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r border-border bg-sidebar fixed inset-y-0 z-50">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-border bg-background/80 backdrop-blur-md z-50 flex items-center justify-between px-4">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <span className="font-heading font-bold text-lg text-foreground">FinTrack</span>
          </div>
        </Link>
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:pl-64 pt-16 md:pt-0 min-h-screen">
        <div className="w-full mx-auto p-4 md:p-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
