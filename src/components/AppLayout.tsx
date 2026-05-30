import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Users, Package, Receipt, TrendingUp, Leaf, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/vendas", label: "Vendas", icon: ShoppingCart },
  { to: "/despesas", label: "Despesas", icon: Receipt },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/dashboard-estrategico", label: "Estratégico", icon: TrendingUp },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col border-r border-border bg-sidebar">
        {/* Logo */}
        <div className="p-5 pb-5">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold text-sidebar-foreground tracking-tight">River Green</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "sidebar-link flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                  isActive
                    ? "active bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="h-3.5 w-3.5 text-primary/50" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground/50 text-center uppercase tracking-widest">
            © 2026 River Green
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 pb-24 md:pb-0 overflow-x-hidden">
        <div className="mx-auto max-w-5xl p-4 md:p-6 lg:p-8">
          <div className="page-enter">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-50 flex md:hidden">
        {navItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "mobile-nav-item flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium",
                isActive ? "active text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "scale-110")} />
              <span>{item.label}</span>
              {isActive && <div className="nav-dot"></div>}
            </Link>
          );
        })}
        {/* More button for remaining items */}
        <Link
          to="/dashboard-estrategico"
          className={cn(
            "mobile-nav-item flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium",
            pathname === "/dashboard-estrategico" ? "active text-primary" : "text-muted-foreground"
          )}
        >
          <TrendingUp className={cn("h-5 w-5", pathname === "/dashboard-estrategico" && "scale-110")} />
          <span>Mais</span>
          {pathname === "/dashboard-estrategico" && <div className="nav-dot"></div>}
        </Link>
      </nav>
    </div>
  );
}
