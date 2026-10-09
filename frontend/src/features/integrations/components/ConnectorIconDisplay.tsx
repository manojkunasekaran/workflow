import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ConnectorIconDisplayProps {
    icon?: string;
    name: string;
    size?: 'sm' | 'md';
    className?: string;
}

export function ConnectorIconDisplay({ icon, name, size = 'sm', className }: ConnectorIconDisplayProps) {
    const [imgError, setImgError] = useState(false);
    const sizeClasses = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-10 w-10 text-xs';
    
    const isUrl = icon?.startsWith('http') || icon?.startsWith('/') || icon?.startsWith('data:image/');
    const isLocalFile = icon?.endsWith('.svg') || icon?.endsWith('.png') || icon?.endsWith('.jpg');
    const isSvgInline = icon?.startsWith('<') || icon?.includes('<svg');
    
    const initials = (name || 'App')
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();

    if (!imgError && icon && (isUrl || isLocalFile)) {
        const imgSrc = isUrl ? icon : `/connectors/${icon}`;
        
        return (
            <div className={cn("flex shrink-0 items-center justify-center rounded-md border bg-background overflow-hidden", sizeClasses, className)}>
                <img
                    src={imgSrc}
                    alt={name}
                    className="h-3/4 w-3/4 object-contain"
                    onError={() => setImgError(true)}
                />
            </div>
        );
    }

    if (icon && isSvgInline) {
        return (
            <div
                className={cn("flex shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground [&>svg]:h-3/4 [&>svg]:w-3/4", sizeClasses, className)}
                dangerouslySetInnerHTML={{ __html: icon }}
            />
        );
    }

    return (
        <div className={cn("flex shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-semibold border border-primary/20", sizeClasses, className)}>
            {initials}
        </div>
    );
}
