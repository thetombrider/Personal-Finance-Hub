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
}

const COUNTRIES = [
    { code: "IT", name: "Italy" },
    { code: "DE", name: "Germany" },
    { code: "ES", name: "Spain" },
    { code: "FR", name: "France" },
    { code: "GB", name: "United Kingdom" },
    { code: "NL", name: "Netherlands" },
];

export function BankLinkModal({ isOpen, onClose }: BankLinkModalProps) {
    const [country, setCountry] = useState("IT");
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            fetchInstitutions(country);
        }
    }, [isOpen, country]);

    const fetchInstitutions = async (countryCode: string) => {
        setLoading(true);
        setSearchQuery(""); // Reset search on country change
        try {
            const res = await apiRequest("POST", "/api/gocardless/institutions", { country: countryCode });
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

            const res = await apiRequest("POST", "/api/gocardless/requisition", {
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
            toast({
                title: "Connection Failed",
                description: "Could not initiate bank connection.",
                variant: "destructive",
            });
            setConnecting(false);
        }
    };

    const filteredInstitutions = institutions.filter(bank =>
        bank.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-fit w-auto gap-6">
                <DialogHeader>
                    <DialogTitle>Connect Bank Account</DialogTitle>
                    <DialogDescription>
                        Select your bank to securely connect your account via GoCardless.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-2">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="grid w-full sm:w-1/3 gap-1.5">
                            <span className="text-sm font-medium">Country</span>
                            <Select value={country} onValueChange={setCountry}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Country" />
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
                            <span className="text-sm font-medium">Search Bank</span>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by bank name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-[400px] border rounded-md relative bg-background">
                        {loading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <ScrollArea className="h-full">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
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
                                            No banks found matching "{searchQuery}"
                                        </div>
                                    )}
                                    {institutions.length === 0 && (
                                        <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                                            No banks found for filtered country.
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
