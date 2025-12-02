import { Toaster } from "@/components/ui/toaster";
    import { Toaster as Sonner } from "@/components/ui/sonner";
    import { TooltipProvider } from "@/components/ui/tooltip";
    import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
    import { BrowserRouter, Routes, Route } from "react-router-dom";
    import Index from "./pages/Index";
    import NotFound from "./pages/NotFound";
    import DashboardPage from "./pages/DashboardPage";
    import RegisterPage from "./pages/RegisterPage";
    import { SessionContextProvider } from "./contexts/SessionContext";

    const queryClient = new QueryClient();

    // Rotaları içeren yeni bir bileşen oluşturuyoruz.
    // Bu, sağlayıcıların içindeki durum değişikliklerinin tüm yönlendirici ağacını yeniden oluşturmasını engeller.
    const AppRoutes = () => {
      return (
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      );
    };

    // Ana App bileşeni artık sadece sağlayıcıları sarmalıyor.
    const App = () => (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SessionContextProvider>
              <AppRoutes />
            </SessionContextProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );

    export default App;