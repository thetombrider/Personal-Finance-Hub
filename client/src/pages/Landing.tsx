import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingUp, PieChart, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold font-heading mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            FinTrack
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Gestisci le tue finanze personali in modo semplice e intuitivo. 
            Monitora conti, transazioni e investimenti in un unico posto.
          </p>
          <Button size="lg" className="text-lg px-8" asChild>
            <a href="/api/login" data-testid="button-login">
              Accedi
            </a>
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>Gestione Conti</CardTitle>
              <CardDescription>
                Monitora tutti i tuoi conti bancari, risparmi e investimenti in un unico dashboard
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle>Portfolio</CardTitle>
              <CardDescription>
                Traccia i tuoi investimenti con prezzi di mercato in tempo reale
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-12 w-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
                <PieChart className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                Visualizza l'evoluzione del tuo patrimonio e analizza le tue spese per categoria
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle>Sicurezza</CardTitle>
              <CardDescription>
                I tuoi dati sono protetti con autenticazione sicura e crittografia
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
