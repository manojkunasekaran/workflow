import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cloneElement, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { Hint } from '@/components/ui/hint';
import { cn } from '@/lib/utils';
import { N8N_NODE_LAYOUT } from '@/features/workflow-studio/constants/taskNodeLayout';
import { resolveStudioNodeBorder } from '@/features/workflow-studio/constants/studioNodeTheme';

const HOVER_HIDE_DELAY_MS = 150;

export type StudioNodeShellProps = {
    width?: number;
    iconBoxHeight: number;
    totalHeight: number;
    accentColor: string;
    icon: LucideIcon;
    label: string;
    iconClassName?: string;
    selected?: boolean;
    invalid?: boolean;
    errorMessage?: string;
    /** Execution observability border (does not override validation invalid). */
    statusBorderClass?: string;
    subLabel?: string;
    children?: ReactNode;
    hoverActions?: ReactNode;
    /** Stretch the visible card to the full handle column (parallel splits with 3+ branches). */
    stretchIconTile?: boolean;
};

function tileOffset() {
    // Pin the tile to the top — extra column height is for handles below the card, not padding.
    return {
        top: 0,
        transform: 'translateX(-50%)',
    };
}

function labelOffset(iconBoxHeight: number, iconSize: number) {
    const belowTile = Math.max(0, iconBoxHeight - iconSize);
    return N8N_NODE_LAYOUT.labelGap - belowTile;
}

export function StudioNodeShell({
    width = N8N_NODE_LAYOUT.width,
    iconBoxHeight,
    totalHeight,
    accentColor,
    icon: Icon,
    label,
    iconClassName,
    selected = false,
    invalid = false,
    errorMessage,
    statusBorderClass,
    subLabel,
    children,
    hoverActions,
    stretchIconTile = false,
}: StudioNodeShellProps) {
    const { iconSize, iconGlyphSize } = N8N_NODE_LAYOUT;
    const [hovered, setHovered] = useState(false);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tilePosition = tileOffset();
    const tileHeight = stretchIconTile ? iconBoxHeight : iconSize;
    const labelMarginTop = stretchIconTile
        ? N8N_NODE_LAYOUT.labelGap
        : labelOffset(iconBoxHeight, iconSize);

    const setNodeHover = (active: boolean) => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
        if (active) {
            setHovered(true);
            return;
        }
        hideTimerRef.current = setTimeout(() => setHovered(false), HOVER_HIDE_DELAY_MS);
    };

    useEffect(
        () => () => {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        },
        [],
    );

    const showHoverChrome = hovered || selected;

    const nodeBorder = resolveStudioNodeBorder({
        invalid,
        selected,
        statusBorderClass,
        accentColor,
    });

    const resolvedHoverActions =
        hoverActions && isValidElement<{ visible?: boolean; onHoverChange?: (active: boolean) => void }>(hoverActions)
            ? cloneElement(hoverActions, {
                  visible: showHoverChrome,
                  onHoverChange: setNodeHover,
              })
            : hoverActions;

    return (
        <div
            className="relative flex flex-col items-center overflow-visible"
            style={{ width, minHeight: totalHeight }}
        >
            {/* Full-node drag surface — sits behind handles; no nodrag so React Flow can move the node. */}
            <div className="absolute inset-0 z-0" aria-hidden />
            {/* Handles align to the icon tile — not the wider label column. */}
            <div
                className="relative z-[1] shrink-0"
                style={{ width: iconSize, height: iconBoxHeight }}
            >
                {resolvedHoverActions}
                <div
                    className={cn(
                        'pointer-events-auto absolute left-1/2 z-[1] flex -translate-x-1/2 items-center justify-center rounded-[16px] border-2 bg-card shadow-sm transition-[background-color,box-shadow,border-color] duration-150',
                        showHoverChrome && 'shadow-[0_8px_24px_rgba(15,23,42,0.14)]',
                        nodeBorder.className,
                    )}
                    style={{
                        width: iconSize,
                        height: tileHeight,
                        top: tilePosition.top,
                        transform: tilePosition.transform,
                        ...(nodeBorder.style as CSSProperties),
                    }}
                    onMouseEnter={() => setNodeHover(true)}
                    onMouseLeave={() => setNodeHover(false)}
                    aria-hidden
                >
                    <Icon
                        className={cn('text-current', iconClassName)}
                        style={{ color: accentColor, width: iconGlyphSize, height: iconGlyphSize }}
                        strokeWidth={2.25}
                    />
                </div>
                {children}
            </div>

            <Hint content={label}>
                <p
                    className="relative z-[1] line-clamp-2 w-full px-0.5 text-center text-[11px] font-normal leading-[14px] text-muted-foreground"
                    style={{ marginTop: labelMarginTop }}
                    onMouseEnter={() => setNodeHover(true)}
                    onMouseLeave={() => setNodeHover(false)}
                >
                    {label}
                </p>
            </Hint>

            {subLabel ? (
                <p
                    className="relative z-[1] mt-0.5 w-full truncate px-0.5 text-center text-[10px] font-medium leading-tight text-muted-foreground/80"
                    onMouseEnter={() => setNodeHover(true)}
                    onMouseLeave={() => setNodeHover(false)}
                >
                    {subLabel}
                </p>
            ) : null}

            {errorMessage ? (
                <Hint content={errorMessage}>
                    <p
                        className="relative z-[1] mt-0.5 w-full truncate px-0.5 text-center text-[10px] font-medium leading-tight text-destructive"
                        onMouseEnter={() => setNodeHover(true)}
                        onMouseLeave={() => setNodeHover(false)}
                    >
                        {errorMessage}
                    </p>
                </Hint>
            ) : null}
        </div>
    );
}
