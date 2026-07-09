import { executionApi, type WorkflowExecution, type WorkflowTaskExecution } from '@/api/executionApi';
import { workflowApi } from '@/api/workflowApi';
import { definitionToFlow } from '@/features/workflow-studio/lib/workflowGraph';
import type { StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import type { WorkflowDefinition } from '@/types/api';
import type { Edge } from '@xyflow/react';

export type ExecutionGraphData = {
    execution: WorkflowExecution;
    taskExecutions: WorkflowTaskExecution[];
    definition: WorkflowDefinition;
    nodes: StudioCanvasNode[];
    edges: Edge[];
};

export async function loadExecutionGraph(executionId: string): Promise<ExecutionGraphData> {
    const execution = await executionApi.getById(executionId);
    const [taskExecutions, definition] = await Promise.all([
        executionApi.getTaskExecutions(executionId),
        workflowApi.getById(execution.workflowId),
    ]);

    const { nodes, edges } = definitionToFlow(definition);
    const frozenNodes = nodes.map((node) => ({ ...node, draggable: false }));

    return {
        execution,
        taskExecutions,
        definition,
        nodes: frozenNodes,
        edges,
    };
}
