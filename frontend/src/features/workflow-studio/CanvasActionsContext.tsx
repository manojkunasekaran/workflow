import { createContext, useContext } from 'react';
import type { Edge } from '@xyflow/react';

export type CanvasActionsContextValue = {
    onAddTaskClick?: () => void;
    onBranchAddClick?: (sourceTaskId: string, sourceHandle: string) => void;
    onEdgeInsert?: (edge: Edge) => void;
    onEdgeDelete?: (edge: Edge) => void;
    readOnly?: boolean;
};

export const CanvasActionsContext = createContext<CanvasActionsContextValue>({});

export function useCanvasActions(): CanvasActionsContextValue {
    return useContext(CanvasActionsContext);
}
