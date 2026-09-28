import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ErrorBannerProps {
    message: string;
    title?: string;
    onRetry?: () => void;
    retryLabel?: string;
    'data-testid'?: string;
    className?: string;
}

export function ErrorBanner({
    message,
    title,
    onRetry,
    retryLabel = 'Retry',
    'data-testid': testId,
    className,
}: ErrorBannerProps) {
    return (
        <div
            data-testid={testId}
            role="alert"
            className={cn(
                'flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive sm:flex-row sm:items-start sm:justify-between',
                className,
            )}
        >
            <div className="flex gap-2 min-w-0">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                <div className="min-w-0">
                    {title ? <p className="font-medium">{title}</p> : null}
                    <p className={cn(title && 'mt-1 text-destructive/90', !title && 'font-medium')}>
                        {message}
                    </p>
                </div>
            </div>
            {onRetry ? (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    className="shrink-0 gap-2 border-destructive/30 bg-background text-destructive hover:bg-destructive/10"
                >
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    {retryLabel}
                </Button>
            ) : null}
        </div>
    );
}
