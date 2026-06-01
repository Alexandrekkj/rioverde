import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import Clientes from "./pages/Clientes";
import Produtos from "./pages/Produtos";
import Vendas from "./pages/Vendas";
import NovaVenda from "./pages/NovaVenda";
import EditarVenda from "./pages/EditarVenda";
import Despesas from "./pages/Despesas";
import DashboardEstrategico from "./pages/DashboardEstrategico";
import RadarRecompra from "./pages/RadarRecompra";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout><Index /></AppLayout>} />
          <Route path="/clientes" element={<AppLayout><Clientes /></AppLayout>} />
          <Route path="/produtos" element={<AppLayout><Produtos /></AppLayout>} />
          <Route path="/vendas" element={<AppLayout><Vendas /></AppLayout>} />
          <Route path="/vendas/nova" element={<AppLayout><NovaVenda /></AppLayout>} />
          <Route path="/vendas/:id" element={<AppLayout><EditarVenda /></AppLayout>} />
          <Route path="/despesas" element={<AppLayout><Despesas /></AppLayout>} />
          <Route path="/radar" element={<AppLayout><RadarRecompra /></AppLayout>} />

          <Route path="/dashboard-estrategico" element={<AppLayout><DashboardEstrategico /></AppLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
