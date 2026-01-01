import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { ThemeProvider } from "next-themes";
import i18n from "@/lib/i18n";
import { MenuPage } from "@/components/menu/MenuPage";
import NotFound from "./pages/NotFound";
import ReservationReceipt from "./pages/ReservationReceipt";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-right" />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<MenuPage />} />
              <Route path="/reservation-receipt" element={<ReservationReceipt />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </I18nextProvider>
  </ThemeProvider>
);

export default App;
