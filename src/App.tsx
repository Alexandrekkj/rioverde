import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Clientes from "./pages/Clientes";
import Produtos from "./pages/Produtos";
import Vendas from "./pages/Vendas";
import NovaVenda from "./pages/NovaVenda";
import EditarVenda from "./pages/EditarVenda";
import Despesas from "./pages/Despesas";
import Insights from "./pages/Insights";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><AppLayout><Index /></AppLayout></ProtectedRoute>} />
          <Route path="/clientes" element={<ProtectedRoute><AppLayout><Clientes /></AppLayout></ProtectedRoute>} />
          <Route path="/produtos" element={<ProtectedRoute><AppLayout><Produtos /></AppLayout></ProtectedRoute>} />
          <Route path="/vendas" element={<ProtectedRoute><AppLayout><Vendas /></AppLayout></ProtectedRoute>} />
          <Route path="/vendas/nova" element={<ProtectedRoute><AppLayout><NovaVenda /></AppLayout></ProtectedRoute>} />
          <Route path="/vendas/:id" element={<ProtectedRoute><AppLayout><EditarVenda /></AppLayout></ProtectedRoute>} />
          <Route path="/despesas" element={<ProtectedRoute><AppLayout><Despesas /></AppLayout></ProtectedRoute>} />
          <Route path="/insights" element={<ProtectedRoute><AppLayout><Insights /></AppLayout></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
