import type { ReactElement, ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type HintSide = 'top' | 'right' | 'bottom' | 'left';

type HintProps = {
    content: ReactNode;
    children: ReactElement;
    side?: HintSide;
    align?: 'start' | 'center' | 'end';
};

/** Lightweight tooltip for icon buttons and canvas controls. */
export function Hint({ content, children, side = 'top', align = 'center' }: HintProps) {
    if (content === null || content === undefined || content === '') return children;

    return (
        <Tooltip delayDuration={350}>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent
                side={side}
                align={align}
                className="z-[10000] border-0 bg-[#1e293b] px-2.5 py-1.5 text-[11px] font-medium leading-snug text-[#f8fafc] shadow-lg"
            >
                {content}
            </TooltipContent>
        </Tooltip>
    );
}
