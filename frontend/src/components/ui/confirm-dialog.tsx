import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export type ConfirmDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void | Promise<void>;
    isConfirming?: boolean;
    destructive?: boolean;
    /** Raise above sheets and other z-50 overlays (e.g. insights side panel). */
    elevated?: boolean;
};

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    isConfirming = false,
    destructive = false,
    elevated = false,
}: ConfirmDialogProps) {
    const handleConfirm = () => {
        void onConfirm();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={elevated ? 'z-[100] max-w-lg gap-0 p-0' : 'max-w-lg gap-0 p-0'}
                overlayClassName={elevated ? 'z-[100]' : undefined}
            >
                <div className="px-6 pb-2 pt-6">
                    <DialogHeader className="space-y-2 text-left">
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription className="text-sm leading-relaxed">
                            {description}
                        </DialogDescription>
                    </DialogHeader>
                </div>
                <DialogFooter className="border-t border-border bg-muted/30 px-6 py-4 sm:space-x-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isConfirming}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        variant={destructive ? 'destructive' : 'default'}
                        onClick={handleConfirm}
                        disabled={isConfirming}
                    >
                        {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
