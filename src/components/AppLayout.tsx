import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Users, Package, Receipt, TrendingUp, Leaf } from "lucide-react";
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
      <aside className="hidden md:flex md:w-60 md:flex-col md:border-r border-border bg-sidebar text-sidebar-foreground">
        {/* Logo */}
        <div className="p-5 pb-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors duration-300">
              <Leaf className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-sidebar-foreground">Rio Verde</h1>
              <p className="text-[10px] font-medium text-sidebar-foreground/50 uppercase tracking-widest">Vendas</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "sidebar-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "active bg-sidebar-accent text-primary shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("h-[18px] w-[18px] transition-colors", isActive ? "text-primary" : "")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-[10px] text-sidebar-foreground/40 text-center uppercase tracking-widest">
            © 2026 Rio Verde
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 pb-24 md:pb-0 overflow-x-hidden">
        <div className="mx-auto max-w-4xl p-4 md:p-6">
          <div className="page-enter">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-50 flex md:hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "mobile-nav-item flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold tracking-wide",
                isActive
                  ? "active text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 transition-transform duration-200", isActive && "scale-110")} />
              <span>{item.label}</span>
              {isActive && <div className="nav-dot"></div>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
