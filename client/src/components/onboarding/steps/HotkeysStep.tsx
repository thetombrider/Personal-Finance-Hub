import { Keyboard } from "lucide-react";

export function HotkeysStep() {
    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Keyboard className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Pro Tips: Keyboard Shortcuts</h2>
                <p className="text-muted-foreground">
                    Speed up your workflow with these global hotkeys available anywhere in the app.
                </p>
            </div>

            <div className="grid gap-4 mt-8">
                <div className="p-4 border rounded-lg bg-card">
                    <h3 className="font-medium mb-3">Global Actions</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8">
                        <div className="flex items-center justify-between">
                            <span className="text-sm">New Transaction</span>
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                T
                            </kbd>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">New Transfer</span>
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                X
                            </kbd>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Add Investment Trade</span>
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                I
                            </kbd>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Review Staging (Sync)</span>
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                S
                            </kbd>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Review Recurring</span>
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                R
                            </kbd>
                        </div>
                    </div>
                </div>

                <div className="p-4 border rounded-lg bg-card">
                    <h3 className="font-medium mb-3">Budget Baseline Table</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Navigate Cells</span>
                            <div className="flex gap-1">
                                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                    ↑
                                </kbd>
                                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                    ↓
                                </kbd>
                                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                    ←
                                </kbd>
                                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                    →
                                </kbd>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Extend Value to Next Month</span>
                            <div className="flex items-center gap-1">
                                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                    Cmd
                                </kbd>
                                +
                                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                    →
                                </kbd>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Fill Rest of Year</span>
                            <div className="flex items-center gap-1">
                                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                    Cmd
                                </kbd>
                                +
                                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                    Shift
                                </kbd>
                                +
                                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                    →
                                </kbd>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
