import type { StudioTaskType } from './pluginTypes';
import { MAIN_IN, MAIN_OUT } from '@/features/workflow-studio/lib/graphHandles';

export type WireRouteKind =
    | 'conditional'
    | 'parallel'
    | 'join'
    | 'join-next'
    | 'loop'
    | 'loop-done'
    | 'human';

/** How an unwired routing output is shown on the canvas. */
export type WireStubBehavior = 'add-task' | 'connect-only';

export interface WireHandle {
    id: string;
    label: string;
    color?: string;
}

/** One output per item in a list parameter (e.g. branches[].nextTaskId). */
export interface ListWireOutput {
    kind: 'list';
    listParam: string;
    handlePrefix: string;
    labelField: string;
    targetParam: string;
    color: string;
    routeKind: WireRouteKind;
    targetHandle: string;
    fallbackLabel: (index: number) => string;
    /** Default: add-task for conditional/parallel/join-next, connect-only for join. */
    stubBehavior?: WireStubBehavior;
}

/** One output bound to a top-level parameter (e.g. defaultNextTaskId). */
export interface ParamWireOutput {
    kind: 'param';
    handleId: string;
    label: string;
    paramKey: string;
    color: string;
    routeKind: WireRouteKind;
    targetHandle: string;
    stubBehavior?: WireStubBehavior;
}

export type WireOutputDef = ListWireOutput | ParamWireOutput;

/** Dynamic join inputs — one per branch on the linked Split into branches task. */
export interface BranchJoinListInput {
    kind: 'branchJoinList';
    /** JOIN parameter that references the BRANCH task id. */
    branchTaskParam: string;
    /** BRANCH list parameter (branches). */
    branchesParam: string;
    /** Field on each branch row storing the terminal task id. */
    endTaskParam: string;
    handlePrefix: string;
    labelField: string;
    fallbackLabel: (index: number) => string;
    color?: string;
}

export type WireInputDef = WireHandle | BranchJoinListInput;

/** Keeps two tasks in sync when connected (BRANCH.joinTaskId ↔ JOIN.branchTaskId). */
export interface BilateralWireRule {
    sourceHandle: string;
    targetHandle: string;
    sourceParamKey: string;
    targetParamKey: string;
    requireTargetType?: StudioTaskType;
}

export interface TaskPluginWiring {
    inputs?: WireInputDef[];
    outputs: WireOutputDef[];
    bilateral?: BilateralWireRule[];
    /** @deprecated Use mainFlowIn / mainFlowOut */
    mainFlow?: boolean;
    /** Standard main-in handle on the left (default true). */
    mainFlowIn?: boolean;
    /** Standard main-out handle on the right for linear chain (default true). */
    mainFlowOut?: boolean;
    /** Distinct bottom handle for n8n-style generic tool tasks. */
    toolInput?: boolean;
}

export const DEFAULT_TASK_WIRING: TaskPluginWiring = {
    outputs: [],
    mainFlow: true,
};

export const MAIN_FLOW_INPUT: WireHandle = { id: MAIN_IN, label: 'in' };
export const MAIN_FLOW_OUTPUT: WireHandle = { id: MAIN_OUT, label: 'flow', color: '#64748b' };

export const JOIN_BRANCH_JOIN_LIST_INPUT: BranchJoinListInput = {
    kind: 'branchJoinList',
    branchTaskParam: 'branchTaskId',
    branchesParam: 'branches',
    endTaskParam: 'endTaskId',
    handlePrefix: 'join-in',
    labelField: 'branchName',
    fallbackLabel: (index) => `Branch ${index + 1}`,
    color: '#d97706',
};
