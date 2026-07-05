/** n8n-style node footprint: icon tile + label below. */
export const N8N_NODE_LAYOUT = {
    /** Column width for label wrapping. */
    width: 176,
    iconSize: 96,
    iconGlyphSize: 40,
    labelGap: 6,
    labelLineHeight: 14,
    errorLineHeight: 14,
    /** Min vertical gap between routing outputs on the icon column. */
    handleMinGap: 54,
} as const;

/** React Flow nodeOrigin — horizontal center, top edge (matches n8n). */
export const STUDIO_NODE_ORIGIN: [number, number] = [0.5, 0];

/** @deprecated Use N8N_NODE_LAYOUT — kept for imports that expect width. */
export const TASK_NODE_OUTPUT_LAYOUT = {
    width: N8N_NODE_LAYOUT.width,
    minBaseHeight: N8N_NODE_LAYOUT.iconSize,
    headerPadding: N8N_NODE_LAYOUT.iconSize,
    perOutputStep: 28,
} as const;

export const ROUTING_NODE_LAYOUT = {
    headerHeight: N8N_NODE_LAYOUT.iconSize,
    bodyHeight: N8N_NODE_LAYOUT.errorLineHeight,
    handleMinGap: N8N_NODE_LAYOUT.handleMinGap,
} as const;

export function handleTopPercent(index: number, count: number): string {
    if (count <= 1) return '50%';
    return `${handleTopPercentValue(index, count)}%`;
}

export function handleTopPercentValue(index: number, count: number): number {
    if (count <= 1) return 50;
    return ((index + 1) / (count + 1)) * 100;
}

/** Min center-to-center spacing when packing routing handles on the icon tile. */
const ROUTING_HANDLE_TILE_GAP = 20;

/** Height of the icon/handle column (handles align to this box, not the label). */
export function studioIconBoxHeight(
    outputCount: number,
    isRoutingTerminator = false,
    _withErrorBody = false,
): number {
    const { iconSize, handleMinGap } = N8N_NODE_LAYOUT;
    if (isRoutingTerminator && outputCount > 1) {
        const fitsOnTile = (outputCount + 1) * ROUTING_HANDLE_TILE_GAP <= iconSize;
        if (fitsOnTile) return iconSize;
        return Math.max(iconSize, iconSize + (outputCount - 1) * handleMinGap - 12);
    }
    if (outputCount > 1) {
        return Math.max(iconSize, iconSize + (outputCount - 1) * 28);
    }
    return iconSize;
}

/** Main-in handle — always centered on the visible icon tile. */
export function studioMainInputHandleTop(): string {
    return `${N8N_NODE_LAYOUT.iconSize / 2}px`;
}

/** Full React Flow node height (icon tile + external label + optional error). */
export function studioTaskNodeHeight(
    _outputCount: number,
    _isRoutingTerminator = false,
    withErrorBody = false,
): number {
    const labelH = N8N_NODE_LAYOUT.labelGap + N8N_NODE_LAYOUT.labelLineHeight * 2;
    const errorH = withErrorBody ? N8N_NODE_LAYOUT.errorLineHeight + 2 : 0;
    // Label sits under the visual tile — not under the extended handle column.
    return N8N_NODE_LAYOUT.iconSize + labelH + errorH;
}

export function usesFixedNodeHeight(outputCount: number, isRoutingTerminator: boolean): boolean {
    return isRoutingTerminator || outputCount > 1;
}

export function routingHandleTopPx(handleIndex: number, handleCount: number): number {
    const iconHeight = studioIconBoxHeight(handleCount, true);
    const topPct = handleTopPercentValue(handleIndex, handleCount);
    return (iconHeight * topPct) / 100;
}

export function resolveOutputHandleTop(
    handleIndex: number,
    handleCount: number,
    isRoutingTerminator: boolean,
): string {
    if (isRoutingTerminator && handleCount > 0) {
        return `${routingHandleTopPx(handleIndex, handleCount)}px`;
    }
    return handleTopPercent(handleIndex, handleCount);
}

/** Canvas Y of an output handle when node.position.y is the node top edge. */
export function handleWorldYFromNodeTop(
    nodeTopY: number,
    iconBoxHeight: number,
    handleIndex: number,
    handleCount: number,
    isRoutingTerminator: boolean,
): number {
    if (isRoutingTerminator && handleCount > 0) {
        return nodeTopY + routingHandleTopPx(handleIndex, handleCount);
    }
    const topPct = handleTopPercentValue(handleIndex, handleCount);
    return nodeTopY + (iconBoxHeight * topPct) / 100;
}

/** Node top Y so the main input (tile center) aligns with a handle world Y. */
export function nodeTopForAlignedInput(handleWorldY: number, _iconBoxHeight: number): number {
    return handleWorldY - N8N_NODE_LAYOUT.iconSize / 2;
}

export function routingNodeMinHeight(branchCount: number): number {
    return studioTaskNodeHeight(Math.max(branchCount, 1), true);
}
