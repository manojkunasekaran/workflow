import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
    connectorIconInitials,
    isInlineSvgIcon,
    resolveConnectorIconSrc,
} from '@/lib/connectorIcon';

export interface ConnectorIconProps {
    icon?: string;
    name: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const SIZE_CLASSES = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-10 w-10 text-sm',
} as const;

/** Single renderer for app / connector icons (URL, uploaded data URL, inline SVG, or initials). */
export function ConnectorIcon({ icon, name, size = 'sm', className }: ConnectorIconProps) {
    const [imgError, setImgError] = useState(false);
    const sizeClasses = SIZE_CLASSES[size];
    const imgSrc = resolveConnectorIconSrc(icon);

    if (!imgError && imgSrc) {
        return (
            <div
                className={cn(
                    'flex shrink-0 items-center justify-center rounded-md border bg-background overflow-hidden',
                    sizeClasses,
                    className,
                )}
            >
                <img
                    src={imgSrc}
                    alt={name}
                    className="h-3/4 w-3/4 object-contain"
                    onError={() => setImgError(true)}
                />
            </div>
        );
    }

    if (icon && isInlineSvgIcon(icon)) {
        return (
            <div
                className={cn(
                    'flex shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground [&>svg]:h-3/4 [&>svg]:w-3/4',
                    sizeClasses,
                    className,
                )}
                dangerouslySetInnerHTML={{ __html: icon }}
            />
        );
    }

    return (
        <div
            className={cn(
                'flex shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-semibold border border-primary/20',
                sizeClasses,
                className,
            )}
        >
            {connectorIconInitials(name)}
        </div>
    );
}
