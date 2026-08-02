/**
 * VariableExplorerContext.tsx
 *
 * Carries the live React Flow graph (nodes + edges) into the task config
 * dialog so that any field renderer can perform graph-aware variable
 * resolution without prop-drilling through every intermediate component.
 */

import { createContext, useContext } from 'react';
import type { Edge } from '@xyflow/react';
import type { StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import type { WorkflowInput, VariableValue } from '@/types/api';

interface VariableExplorerContextValue {
    currentNodeId: string;
    nodes: StudioCanvasNode[];
    edges: Edge[];
    workflowInputs?: WorkflowInput[];
    workflowVariables?: Record<string, VariableValue>;
}

const defaultValue: VariableExplorerContextValue = {
    currentNodeId: '',
    nodes: [],
    edges: [],
};

export const VariableExplorerContext =
    createContext<VariableExplorerContextValue>(defaultValue);

export function useVariableExplorerContext(): VariableExplorerContextValue {
    return useContext(VariableExplorerContext);
}
