import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { StavbaProvider } from "@/context/stavba-context";
import Dashboard from "@/pages/dashboard";
import NewConnection from "@/pages/new-connection";
import ConnectionDetail from "@/pages/connection-detail";
import DatabasePage from "@/pages/database";
import SummaryPage from "@/pages/summary";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/connections/new" component={NewConnection} />
        <Route path="/connections/:id" component={ConnectionDetail} />
        <Route path="/database" component={DatabasePage} />
        <Route path="/summary" component={SummaryPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <StavbaProvider>
            <Router />
          </StavbaProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
