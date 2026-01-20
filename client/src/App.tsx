import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/AuthPage";
import Landing from "@/pages/Landing";

import Dashboard from "@/pages/Dashboard";
import Accounts from "@/pages/Accounts";
import Categories from "@/pages/Categories";
import Transactions from "@/pages/Transactions";
import ImportTransactions from "@/pages/ImportTransactions";
import Portfolio from "@/pages/Portfolio";
import Budget from "@/pages/Budget";
import Reports from "@/pages/Reports";
import ManageAccounts from "@/pages/settings/ManageAccounts";
import ManageCategories from "@/pages/settings/ManageCategories";
import ManageTags from "@/pages/settings/ManageTags";
import ManageWebhooks from "@/pages/settings/ManageWebhooks";
import EmailReports from "@/pages/settings/EmailReports";
import Settings from "@/pages/settings/Settings";
import { FinanceProvider } from "@/context/FinanceContext";
import BankCallbackPage from "@/pages/bank-callback";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/" component={Landing} />
        {/* Redirect any other route to Landing for unauthenticated users */}
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <FinanceProvider>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/accounts" component={Accounts} />
        <Route path="/categories" component={Categories} />
        <Route path="/transactions" component={Transactions} />
        <Route path="/import" component={ImportTransactions} />
        <Route path="/budget/overview" component={Budget} />
        <Route path="/budget/baseline" component={Budget} />
        <Route path="/budget/recurring" component={Budget} />
        <Route path="/budget/planned" component={Budget} />
        <Route path="/budget" component={Budget} />
        <Route path="/reports/income-statement" component={Reports} />
        <Route path="/reports/balance-sheet" component={Reports} />
        <Route path="/reports" component={Reports} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/settings/accounts" component={ManageAccounts} />
        <Route path="/settings/categories" component={ManageCategories} />
        <Route path="/settings/tags" component={ManageTags} />
        <Route path="/settings/webhooks" component={ManageWebhooks} />
        <Route path="/settings/email-reports" component={EmailReports} />
        <Route path="/settings" component={Settings} />
        <Route path="/bank-callback" component={BankCallbackPage} />
        <Route component={NotFound} />
      </Switch>
    </FinanceProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
