import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center animate-scale-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-6 animate-float">
          <Leaf className="h-8 w-8 text-primary" />
        </div>
        <h1 className="heading-gradient text-6xl mb-3">404</h1>
        <p className="mb-6 text-lg text-muted-foreground font-medium">Página não encontrada</p>
        <Button asChild size="lg">
          <a href="/">Voltar ao Início</a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
