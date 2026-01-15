import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportMode } from "./types";
import { RefObject } from "react";

interface ImportZoneProps {
    importMode: ImportMode;
    primaryFileInputRef: RefObject<HTMLInputElement | null>;
    referenceFileInputRef: RefObject<HTMLInputElement | null>;
    referenceFile: File | null;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>, isReference?: boolean) => void;
    onDownloadTemplate: (mode?: string) => void;
}

export default function ImportZone({
    importMode,
    primaryFileInputRef,
    referenceFileInputRef,
    referenceFile,
    onFileSelect,
    onDownloadTemplate
}: ImportZoneProps) {
    return (
        <div className="space-y-6">
            {/* Primary File Upload */}
            <div
                className="flex flex-col items-center justify-center py-12 text-center space-y-4 border-2 border-dashed border-border rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => primaryFileInputRef.current?.click()}
            >
                <div className="w-16 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">
                        {importMode === 'trades' ? "Upload Trades CSV/Excel" : "Click to upload CSV/Excel"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">or drag and drop file here</p>
                </div>
                <input
                    type="file"
                    ref={primaryFileInputRef}
                    accept=".csv, .xlsx, .xls"
                    className="hidden"
                    onChange={(e) => onFileSelect(e, false)}
                />
            </div>

            <div className="flex flex-col items-center justify-center gap-2">
                <Button variant="link" onClick={() => onDownloadTemplate(importMode)} className="gap-2 text-muted-foreground hover:text-primary">
                    <Download className="h-4 w-4" />
                    Download {importMode} template
                </Button>
                {importMode === 'trades' && (
                    <Button variant="link" onClick={() => onDownloadTemplate('holdings')} className="gap-2 text-muted-foreground hover:text-primary">
                        <Download className="h-4 w-4" />
                        Download holdings template
                    </Button>
                )}
            </div>

            {/* Reference File Upload for Trades */}
            {importMode === 'trades' && (
                <div className="border rounded-lg p-4 bg-muted/10">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-md font-medium">Reference Holdings File (Optional)</h3>
                            <p className="text-xs text-muted-foreground">
                                <strong>Recommended for "All-in-One" Matching:</strong> Upload your <code>holdings.csv</code> here.
                                This allows us to automatically link trades to their assets (e.g. matching 'ID 1' to 'Apple').
                            </p>
                        </div>
                        {referenceFile ? (
                            <span className="text-sm text-green-600 flex items-center gap-1">
                                <FileSpreadsheet size={14} /> {referenceFile.name}
                            </span>
                        ) : (
                            <Button variant="outline" size="sm" onClick={() => referenceFileInputRef.current?.click()}>Select File</Button>
                        )}
                    </div>
                    <input
                        type="file"
                        ref={referenceFileInputRef}
                        accept=".csv, .xlsx, .xls"
                        className="hidden"
                        onChange={(e) => onFileSelect(e, true)}
                    />
                </div>
            )}
        </div>
    );
}
