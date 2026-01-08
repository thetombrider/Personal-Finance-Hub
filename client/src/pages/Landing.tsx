import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wallet, PieChart, TrendingUp, CreditCard, ShieldCheck } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold font-heading">FinTrack</span>
          </div>
          <Link href="/auth">
            <Button>Login</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold font-heading mb-6 tracking-tight">
            Comprehensive Personal Finance Management
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Track your accounts, transactions, budgets, and investments in one place.
            Self-hosted, privacy-focused, and built with modern tech.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/auth">
              <Button size="lg" className="text-lg px-8">Get Started</Button>
            </Link>
            <a href="https://github.com/thetombrider/Personal-Finance-Hub" target="_blank" rel="noreferrer">
              <Button variant="outline" size="lg" className="text-lg px-8">View on GitHub</Button>
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 font-heading">Everything you need to manage your wealth</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<TrendingUp className="h-10 w-10 text-primary" />}
              title="Dashboard"
              description="Get a high-level overview of your net worth, recent activity, and financial trends."
            />
            <FeatureCard
              icon={<Wallet className="h-10 w-10 text-primary" />}
              title="Account Management"
              description="Track various types of accounts including Checking, Savings, Credit Cards, and Investments."
            />
            <FeatureCard
              icon={<CreditCard className="h-10 w-10 text-primary" />}
              title="Transactions"
              description="Record income and expenses, categorize them, and import transactions via CSV."
            />
            <FeatureCard
              icon={<PieChart className="h-10 w-10 text-primary" />}
              title="Budgeting"
              description="Set monthly budgets for different categories and monitor your spending in real-time."
            />
            <FeatureCard
              icon={<TrendingUp className="h-10 w-10 text-primary" />}
              title="Portfolio"
              description="Manage your stock holdings, track performance, and view detailed metrics."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-10 w-10 text-primary" />}
              title="Privacy Focused"
              description="Self-hosted solution. Your financial data stays on your server."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-muted/20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} FinTrack. Open Source Personal Finance Hub.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="border-border/50 hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="mb-4">{icon}</div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  )
}
