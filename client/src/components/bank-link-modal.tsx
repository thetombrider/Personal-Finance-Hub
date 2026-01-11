import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Landmark, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BankLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialInstitutionId?: string | null;
}

const COUNTRIES = [
    { code: "IT", name: "Italy" },
    { code: "DE", name: "Germany" },
    { code: "ES", name: "Spain" },
    { code: "FR", name: "France" },
    { code: "GB", name: "United Kingdom" },
    { code: "NL", name: "Netherlands" },
];

export function BankLinkModal({ isOpen, onClose, initialInstitutionId }: BankLinkModalProps) {
    const [country, setCountry] = useState("IT");
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            if (initialInstitutionId) {
                // Auto-start connection if ID is provided (Renewal flow)
                handleConnect(initialInstitutionId);
            } else {
                fetchInstitutions(country);
            }
        }
    }, [isOpen, country, initialInstitutionId]);

    const fetchInstitutions = async (countryCode: string) => {
        setLoading(true);
        setSearchQuery(""); // Reset search on country change
        try {
            // Changed from POST /api/gocardless/institutions to GET /api/gocardless/banks
            const res = await apiRequest("GET", `/api/gocardless/banks?country=${countryCode}`);
            if (!res.ok) {
                throw new Error("Failed to fetch institutions");
            }
            const data = await res.json();
            setInstitutions(data);
        } catch (error) {
            toast({
                title: "Error fetching banks",
                description: "Could not load the list of banks.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (institutionId: string) => {
        setConnecting(true);
        try {
            // Redirect URL for callback
            const redirect = `${window.location.origin}/bank-callback`;

            // Changed from POST /api/gocardless/requisition to POST /api/gocardless/connect
            const res = await apiRequest("POST", "/api/gocardless/connect", {
                institutionId,
                redirectUrl: redirect,
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to initiate connection");
            }

            const data = await res.json();

            if (data.link) {
                // Save requisition ID to session storage for callback
                sessionStorage.setItem("gocardless_requisition_id", data.requisitionId);
                window.location.href = data.link;
            } else {
                throw new Error("No link returned");
            }
        } catch (error) {
            console.error("Connection failed:", error);
            toast({
                title: "Connection Failed",
                description: "Could not initiate bank connection.",
                variant: "destructive",
            });
            setConnecting(false);
            // If auto-connect failed, maybe fallback to list?
            if (initialInstitutionId) {
                // allow user to manually select if auto-fail
                // fetchInstitutions(country); 
            }
        }
    };

    const filteredInstitutions = institutions.filter(bank =>
        bank.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-fit w-auto gap-6 min-w-[400px]">
                <DialogHeader>
                    <DialogTitle>
                        {initialInstitutionId ? "Rinnovo Connessione" : "Collega Conto Bancario"}
                    </DialogTitle>
                    <DialogDescription>
                        {initialInstitutionId
                            ? "Reindirizzamento alla tua banca per il rinnovo del consenso..."
                            : "Seleziona la tua banca per connettere il conto via GoCardless."}
                    </DialogDescription>
                </DialogHeader>

                {initialInstitutionId ? (
                    <div className="h-[200px] flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">In attesa della banca...</p>
                    </div>
                ) : (
                    <div className="grid gap-6 py-2">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="grid w-full sm:w-1/3 gap-1.5">
                                <span className="text-sm font-medium">Paese</span>
                                <Select value={country} onValueChange={setCountry}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleziona Paese" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COUNTRIES.map((c) => (
                                            <SelectItem key={c.code} value={c.code}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid w-full sm:w-2/3 gap-1.5">
                                <span className="text-sm font-medium">Cerca Banca</span>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Cerca per nome..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="h-[400px] border rounded-md relative bg-background w-[500px]">
                            {loading ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <ScrollArea className="h-full">
                                    <div className="grid grid-cols-1 gap-2 p-2">
                                        {filteredInstitutions.map((bank) => (
                                            <Button
                                                key={bank.id}
                                                variant="outline"
                                                className="justify-start h-auto py-3 px-4 w-full border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                                                onClick={() => handleConnect(bank.id)}
                                                disabled={connecting}
                                            >
                                                <div className="flex items-center gap-3 w-full overflow-hidden">
                                                    {bank.logo ? (
                                                        <img src={bank.logo} alt={bank.name} className="h-8 w-8 object-contain shrink-0 rounded-sm bg-white p-0.5" />
                                                    ) : (
                                                        <div className="h-8 w-8 shrink-0 flex items-center justify-center bg-muted rounded-sm">
                                                            <Landmark className="h-5 w-5 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                    <span className="truncate text-left font-normal">{bank.name}</span>
                                                </div>
                                            </Button>
                                        ))}
                                        {filteredInstitutions.length === 0 && institutions.length > 0 && (
                                            <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                                                Nessuna banca trovata per "{searchQuery}"
                                            </div>
                                        )}
                                        {institutions.length === 0 && (
                                            <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                                                Nessuna banca trovata.
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={connecting && !!initialInstitutionId}>
                        Annulla
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
