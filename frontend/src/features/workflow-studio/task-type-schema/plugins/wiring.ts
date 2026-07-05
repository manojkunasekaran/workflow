import {
    COND_ELSE,
    HUMAN_APPROVED_OUT,
    HUMAN_REJECTED_OUT,
    ITER_LOOP_OUT,
    LOOP_DONE_OUT,
    JOIN_MERGE_IN,
    JOIN_OUT,
    MAIN_IN,
    condBranchHandle,
    parBranchHandle,
} from '@/features/workflow-studio/lib/graphHandles';
import { ITERATOR_LOOP_BODY_START_PARAM, ITERATOR_DONE_NEXT_PARAM } from '@/features/workflow-studio/lib/iteratorLoopSync';
import type { TaskPluginWiring } from '@/features/workflow-studio/task-type-schema/pluginWiringTypes';

export const CONDITIONAL_TASK_WIRING: TaskPluginWiring = {
    outputs: [
        {
            kind: 'list',
            listParam: 'branches',
            handlePrefix: 'cond',
            labelField: 'name',
            targetParam: 'nextTaskId',
            color: '#8b5cf6',
            routeKind: 'conditional',
            targetHandle: MAIN_IN,
            fallbackLabel: (index) => (index === 0 ? 'If' : `Else if ${index}`),
        },
        {
            kind: 'param',
            handleId: COND_ELSE,
            label: 'Else',
            paramKey: 'defaultNextTaskId',
            color: '#a78bfa',
            routeKind: 'conditional',
            targetHandle: MAIN_IN,
        },
    ],
    mainFlowIn: true,
    mainFlowOut: false,
};

export const BRANCH_TASK_WIRING: TaskPluginWiring = {
    outputs: [
        {
            kind: 'list',
            listParam: 'branches',
            handlePrefix: 'par',
            labelField: 'branchName',
            targetParam: 'startTaskId',
            color: '#f59e0b',
            routeKind: 'parallel',
            targetHandle: MAIN_IN,
            fallbackLabel: (index) => `Branch ${index + 1}`,
        },
    ],
    mainFlowIn: true,
    mainFlowOut: false,
};

export const JOIN_TASK_WIRING: TaskPluginWiring = {
    inputs: [{ id: JOIN_MERGE_IN, label: 'Branches', color: '#d97706' }],
    outputs: [
        {
            kind: 'param',
            handleId: JOIN_OUT,
            label: 'Next',
            paramKey: 'nextTaskId',
            color: '#10b981',
            routeKind: 'join-next',
            targetHandle: MAIN_IN,
        },
    ],
    mainFlowIn: false,
    mainFlowOut: false,
};

export const HUMAN_TASK_WIRING: TaskPluginWiring = {
    outputs: [
        {
            kind: 'param',
            handleId: HUMAN_APPROVED_OUT,
            label: 'Approved',
            paramKey: 'approvedNextTaskId',
            color: '#db2777',
            routeKind: 'human',
            targetHandle: MAIN_IN,
        },
        {
            kind: 'param',
            handleId: HUMAN_REJECTED_OUT,
            label: 'Rejected',
            paramKey: 'rejectedNextTaskId',
            color: '#ec4899',
            routeKind: 'human',
            targetHandle: MAIN_IN,
        },
    ],
    mainFlowIn: true,
    mainFlowOut: false,
};

export const ITERATOR_TASK_WIRING: TaskPluginWiring = {
    outputs: [
        {
            kind: 'param',
            handleId: ITER_LOOP_OUT,
            label: 'Loop',
            paramKey: ITERATOR_LOOP_BODY_START_PARAM,
            color: '#0ea5e9',
            routeKind: 'loop',
            targetHandle: MAIN_IN,
            stubBehavior: 'add-task',
        },
        {
            kind: 'param',
            handleId: LOOP_DONE_OUT,
            label: 'Done',
            paramKey: ITERATOR_DONE_NEXT_PARAM,
            color: '#10b981',
            routeKind: 'loop-done',
            targetHandle: MAIN_IN,
            stubBehavior: 'add-task',
        },
    ],
    mainFlowIn: true,
    mainFlowOut: false,
};

// Re-export handle helpers for tests / docs
export { condBranchHandle, parBranchHandle };
