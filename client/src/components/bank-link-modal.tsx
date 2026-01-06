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
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Landmark } from "lucide-react";
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
        try {
            const res = await apiRequest("POST", "/api/gocardless/institutions", { country: countryCode });
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
                redirect,
            });
            const data = await res.json();

            if (data.link) {
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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Connect Bank Account</DialogTitle>
                    <DialogDescription>
                        Select your bank to securely connect your account via GoCardless.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium w-20">Country</span>
                        <Select value={country} onValueChange={setCountry}>
                            <SelectTrigger className="w-full">
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

                    <div className="h-[300px] border rounded-md relative">
                        {loading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <ScrollArea className="h-full p-2">
                                <div className="grid gap-2">
                                    {institutions.map((bank) => (
                                        <Button
                                            key={bank.id}
                                            variant="outline"
                                            className="justify-start h-auto py-3 px-4"
                                            onClick={() => handleConnect(bank.id)}
                                            disabled={connecting}
                                        >
                                            <div className="flex items-center gap-3 w-full">
                                                {bank.logo ? (
                                                    <img src={bank.logo} alt={bank.name} className="h-8 w-8 object-contain" />
                                                ) : (
                                                    <Landmark className="h-6 w-6 text-muted-foreground" />
                                                )}
                                                <span className="truncate">{bank.name}</span>
                                            </div>
                                        </Button>
                                    ))}
                                    {institutions.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            No banks found for this country.
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
