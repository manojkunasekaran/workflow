export const TASK_NODE_OUTPUT_LAYOUT = {
    width: 200,
    minBaseHeight: 88,
    headerPadding: 52,
    perOutputStep: 28,
} as const;

/** Layout for routing terminator nodes (Conditional, Branch, Join). */
export const ROUTING_NODE_LAYOUT = {
    headerHeight: 44,
    bodyHeight: 42,
    /** Min vertical gap between routing outputs when the card must grow. */
    handleMinGap: 40,
} as const;

export function handleTopPercent(index: number, count: number): string {
    if (count <= 1) return '50%';
    return `${handleTopPercentValue(index, count)}%`;
}

export function handleTopPercentValue(index: number, count: number): number {
    if (count <= 1) return 50;
    return ((index + 1) / (count + 1)) * 100;
}

export function multiOutputMinHeight(outputCount: number): number | undefined {
    if (outputCount <= 1) return undefined;
    const { minBaseHeight, headerPadding, perOutputStep } = TASK_NODE_OUTPUT_LAYOUT;
    return Math.max(minBaseHeight, headerPadding + outputCount * perOutputStep);
}

/** Pixel height for studio task cards — must match rendered CSS height exactly. */
export function studioTaskNodeHeight(
    outputCount: number,
    isRoutingTerminator = false,
): number {
    if (isRoutingTerminator && outputCount > 0) {
        const { headerHeight, bodyHeight, handleMinGap } = ROUTING_NODE_LAYOUT;
        const compact = headerHeight + bodyHeight;
        if (outputCount <= 1) return compact;
        return Math.max(compact, handleMinGap * (outputCount + 1));
    }
    return multiOutputMinHeight(outputCount) ?? TASK_NODE_OUTPUT_LAYOUT.minBaseHeight;
}

/** Fixed height for nodes whose output handles use explicit row positions. */
export function usesFixedNodeHeight(outputCount: number, isRoutingTerminator: boolean): boolean {
    return isRoutingTerminator || outputCount > 1;
}

/** Center Y of a routing output handle (px from top of node box). */
export function routingHandleTopPx(handleIndex: number, handleCount: number): number {
    const nodeHeight = studioTaskNodeHeight(handleCount, true);
    const topPct = handleTopPercentValue(handleIndex, handleCount);
    return (nodeHeight * topPct) / 100;
}

/** CSS `top` for an output handle — routing nodes use fixed row px, others use %. */
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

/** Absolute canvas Y for a handle when node `position.y` is the vertical center. */
export function handleCenterYFromNode(
    nodeCenterY: number,
    nodeHeight: number,
    handleIndex: number,
    handleCount: number,
): number {
    const topPct = handleTopPercentValue(handleIndex, handleCount);
    return nodeCenterY - nodeHeight / 2 + (nodeHeight * topPct) / 100;
}

/** Shared handle Y for layout (stubs, branch tasks) — matches resolveOutputHandleTop. */
export function handleCenterYForOutput(
    nodeCenterY: number,
    nodeHeight: number,
    handleIndex: number,
    handleCount: number,
    isRoutingTerminator: boolean,
): number {
    if (isRoutingTerminator && handleCount > 0) {
        return nodeCenterY - nodeHeight / 2 + routingHandleTopPx(handleIndex, handleCount);
    }
    return handleCenterYFromNode(nodeCenterY, nodeHeight, handleIndex, handleCount);
}

export function routingNodeMinHeight(branchCount: number): number {
    return studioTaskNodeHeight(Math.max(branchCount, 1), true);
}
