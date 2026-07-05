/** Main workflow sequence (solid edges). */
export const MAIN_IN = 'main-in';
export const MAIN_OUT = 'main-out';

/** Conditional node outputs — one per branch + else. */
export const condBranchHandle = (index: number) => `cond-${index}` as const;
export const COND_ELSE = 'cond-else';

/** Parallel branch outputs — one per branch path. */
export const parBranchHandle = (index: number) => `par-${index}` as const;

/** Join node: single merge input for all parallel branch tails + outgoing next step. */
export const JOIN_MERGE_IN = 'join-merge';
export const JOIN_OUT = 'join-out';

/** Human approval outputs — approved / rejected paths. */
export const HUMAN_APPROVED_OUT = 'human-approved';
export const HUMAN_REJECTED_OUT = 'human-rejected';

export function isJoinMergeInput(handleId: string): boolean {
    return handleId === JOIN_MERGE_IN;
}

export const ITER_LOOP_OUT = 'iter-loop';
export const LOOP_DONE_OUT = 'loop-done';

export const ROUTE_EDGE_PREFIX = 'route:';
export const BRANCH_CHAIN_PREFIX = 'branch-chain:';

export function isRouteEdgeId(id: string): boolean {
    return id.startsWith(ROUTE_EDGE_PREFIX);
}

export function isBranchChainEdgeId(id: string): boolean {
    return id.startsWith(BRANCH_CHAIN_PREFIX);
}
