import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Accounts from "@/pages/Accounts";
import Categories from "@/pages/Categories";
import Transactions from "@/pages/Transactions";
import ImportTransactions from "@/pages/ImportTransactions";
import Portfolio from "@/pages/Portfolio";
import ManageAccounts from "@/pages/settings/ManageAccounts";
import ManageCategories from "@/pages/settings/ManageCategories";
import { FinanceProvider } from "@/context/FinanceContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/accounts" component={Accounts} />
      <Route path="/categories" component={Categories} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/import" component={ImportTransactions} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/settings/accounts" component={ManageAccounts} />
      <Route path="/settings/categories" component={ManageCategories} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FinanceProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </FinanceProvider>
    </QueryClientProvider>
  );
}

export default App;
