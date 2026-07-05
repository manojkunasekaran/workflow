import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Panel,
    useEdgesState,
    useNodesState,
    type Connection,
    type Edge,
    type EdgeChange,
    type Node,
    type NodeChange,
    type ReactFlowInstance,
    ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { BrushCleaning, Minus, Plus } from 'lucide-react';
import { TippyHint } from '@/components/ui/tippy-hint';
import { TaskNode } from '@/features/workflow-studio/nodes/TaskNode';
import { StartNode } from '@/features/workflow-studio/nodes/StartNode';
import { RouteEdge } from '@/features/workflow-studio/edges/RouteEdge';
import { ChainEdge } from '@/features/workflow-studio/edges/ChainEdge';
import { CanvasActionsContext } from '@/features/workflow-studio/CanvasActionsContext';
import type { StudioMode } from '@/features/workflow-studio/StudioHeader';
import type { StudioTaskType } from '@/features/workflow-studio/constants/taskPalette';
import { STUDIO_TASK_DRAG_MIME } from '@/features/workflow-studio/constants/studioDrag';
import {
    ADD_TASK_NODE_ID,
    WORKFLOW_START_ID,
} from '@/features/workflow-studio/constants/studioCanvas';
import {
    STUDIO_EDGE_CLASS,
    STUDIO_SEQUENCE_STROKE,
    studioEdgeMarkerEnd,
    studioRouteMarkerEnd,
} from '@/features/workflow-studio/edges/studioEdgeTheme';
import {
    getMainSpineIdsFromEdges
} from '@/features/workflow-studio/lib/branchFlow';
import type { StudioCanvasNode } from '@/features/workflow-studio/lib/workflowGraph';
import { getTaskNodes, isValidStudioConnection } from '@/features/workflow-studio/lib/workflowGraph';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import {
    mergeDisplayEdges,
    resolveTaskOutputViews,
} from '@/features/workflow-studio/lib/graphRouting';
import {
    inlineAddKey,
    isStubEdgeId,
    resolveInlineAddHandles,
    shouldShowStartAdd,
} from '@/features/workflow-studio/lib/branchAddStubs';
import { isRouteEdgeId, isBranchChainEdgeId } from '@/features/workflow-studio/lib/graphHandles';
import { classifyStudioEdge } from '@/features/workflow-studio/lib/studioEdgeActions';
import type { RouteEdgeData } from '@/features/workflow-studio/lib/pluginWiringRuntime';
import type { TaskParameterErrors } from '@/features/workflow-studio/task-type-schema/types';
import { STUDIO_NODE_ORIGIN } from '@/features/workflow-studio/constants/taskNodeLayout';
import { cn } from '@/lib/utils';

const CANVAS_TOOL_BUTTON_CLASS = cn(
    'flex h-8 w-8 items-center justify-center rounded-md border border-[#c6c6cd] bg-white/95 text-[#64748b] shadow-lg backdrop-blur',
    'transition-colors hover:border-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#475569]',
);

/** Same fit-view glyph as React Flow's built-in Controls. */
function FitViewIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 30" className={className} aria-hidden>
            <path
                fill="currentColor"
                d="M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0027.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94c-.531 0-.939-.4-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z"
            />
        </svg>
    );
}

const nodeTypes = {
    start: StartNode,
    task: TaskNode,
};

const edgeTypes = {
    route: RouteEdge,
    studioChain: ChainEdge,
};

interface WorkflowCanvasProps {
    nodes: StudioCanvasNode[];
    chainEdges: Edge[];
    mode: StudioMode;
    taskValidationErrors?: Map<string, TaskParameterErrors>;
    onNodesChange: (changes: NodeChange<StudioCanvasNode>[]) => void;
    onChainEdgesChange: (changes: EdgeChange[]) => void;
    onGraphConnect: (connection: Connection) => void;
    onRouteEdgeRemove: (edge: Edge) => void;
    onAddTaskClick: () => void;
    onBranchAddClick: (sourceTaskId: string, sourceHandle: string) => void;
    onEdgeInsert: (edge: Edge) => void;
    onEdgeDelete: (edge: Edge) => void;
    onTaskSelect: (taskId: string) => void;
    onTaskDelete: (taskId: string) => void;
    onTidyUp: () => void;
    onTaskDrop?: (type: StudioTaskType, position: { x: number; y: number }) => void;
}

function WorkflowCanvasInner({
    nodes,
    chainEdges,
    mode,
    taskValidationErrors,
    onNodesChange,
    onChainEdgesChange,
    onGraphConnect,
    onRouteEdgeRemove,
    onAddTaskClick,
    onBranchAddClick,
    onEdgeInsert,
    onEdgeDelete,
    onTaskSelect,
    onTaskDelete,
    onTidyUp,
    onTaskDrop,
}: WorkflowCanvasProps) {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const reactFlowInstance = useRef<ReactFlowInstance<StudioCanvasNode, Edge> | null>(null);
    const readOnly = mode === 'inspect';
    const hasFitViewRef = useRef(false);

    const displayNodes = useMemo((): StudioCanvasNode[] => {
        const spineIds = getMainSpineIdsFromEdges(nodes, chainEdges);
        const spineSet = new Set(spineIds);
        const branchChainOut = new Set(
            chainEdges.filter((edge) => isBranchChainEdgeId(edge.id)).map((edge) => edge.source),
        );

        const addHandleKeys = resolveInlineAddHandles(nodes, chainEdges);
        const showStartAdd = shouldShowStartAdd(nodes, chainEdges);
        const workflowTasks = getTaskNodes(nodes).map((node) => node.data);

        return nodes
            .filter((node) => node.id !== ADD_TASK_NODE_ID)
            .map((node) => {
                if (node.id === WORKFLOW_START_ID) {
                    return {
                        ...node,
                        data: { ...(node.data as { label: string }), showAdd: showStartAdd },
                    };
                }
                if (node.type !== 'task') return node;
                const taskNode = node as Node<TaskNodeData>;
                const addHandleIds = [...resolveTaskOutputViews(taskNode.data).outputs]
                    .map((output) => output.handleId)
                    .filter((handleId) => addHandleKeys.has(inlineAddKey(node.id, handleId)));
                return {
                    ...taskNode,
                    data: {
                        ...taskNode.data,
                        studioGraph: {
                            onMainSpine: spineSet.has(node.id),
                            hasBranchChainOut: branchChainOut.has(node.id),
                            workflowTasks,
                            validationErrors: taskValidationErrors?.get(node.id),
                            addHandleIds,
                        },
                    },
                };
            });
    }, [chainEdges, nodes, taskValidationErrors]);

    const displayEdges = useMemo((): Edge[] => {
        const merged = mergeDisplayEdges(chainEdges, nodes);
        return merged.map((edge) => {
            const routeData = edge.data as RouteEdgeData | undefined;
            const routeKind = routeData?.routeKind;
            const isStubToAdd = edge.target === ADD_TASK_NODE_ID;
            const markerEnd =
                edge.markerEnd ??
                (isStubToAdd
                    ? undefined
                    : edge.type === 'route'
                      ? studioRouteMarkerEnd(routeKind)
                      : studioEdgeMarkerEnd(STUDIO_SEQUENCE_STROKE));

            return {
                ...edge,
                markerEnd,
                data: {
                    ...(edge.data ?? {}),
                    studioActionKind: classifyStudioEdge(edge, nodes, chainEdges),
                },
            };
        });
    }, [chainEdges, nodes]);

    const [rfNodes, setRfNodes, onRfNodesChange] = useNodesState(displayNodes);
    const [rfEdges, setRfEdges, onRfEdgesChange] = useEdgesState(displayEdges);

    useEffect(() => {
        setRfNodes(displayNodes);
    }, [displayNodes, setRfNodes]);

    useEffect(() => {
        setRfEdges(displayEdges);
    }, [displayEdges, setRfEdges]);

    const canvasActions = useMemo(
        () => ({
            onAddTaskClick: readOnly ? undefined : onAddTaskClick,
            onBranchAddClick: readOnly ? undefined : onBranchAddClick,
            onEdgeInsert: readOnly ? undefined : onEdgeInsert,
            onEdgeDelete: readOnly ? undefined : onEdgeDelete,
            onTaskEdit: readOnly ? undefined : onTaskSelect,
            onTaskDelete: readOnly ? undefined : onTaskDelete,
            readOnly,
        }),
        [onAddTaskClick, onBranchAddClick, onEdgeDelete, onEdgeInsert, onTaskDelete, onTaskSelect, readOnly],
    );

    const handleInit = useCallback((instance: ReactFlowInstance<StudioCanvasNode, Edge>) => {
        reactFlowInstance.current = instance;
        if (!hasFitViewRef.current) {
            instance.fitView({ padding: 0.2 });
            hasFitViewRef.current = true;
        }
    }, []);

    const handleDragOver = useCallback((event: React.DragEvent) => {
        if (!event.dataTransfer.types.includes(STUDIO_TASK_DRAG_MIME)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }, []);

    const handleDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            if (readOnly || !onTaskDrop) return;

            const type = event.dataTransfer.getData(STUDIO_TASK_DRAG_MIME) as StudioTaskType;
            if (!type) return;

            const instance = reactFlowInstance.current;
            if (!instance) return;

            const position = instance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });
            onTaskDrop(type, position);
        },
        [onTaskDrop, readOnly],
    );

    const handleNodeClick = useCallback(
        (_: React.MouseEvent, node: StudioCanvasNode) => {
            if (readOnly) return;
            if (node.type === 'task') {
                onTaskSelect(node.id);
            }
        },
        [onTaskSelect, readOnly],
    );

    const handlePaneClick = useCallback(() => {
        if (!readOnly) onTaskSelect('');
    }, [onTaskSelect, readOnly]);

    const handleNodesChange = useCallback(
        (changes: NodeChange<StudioCanvasNode>[]) => {
            onRfNodesChange(changes);
            const filtered = changes.filter((change) => {
                if (change.type !== 'remove') return true;
                return change.id !== WORKFLOW_START_ID && change.id !== ADD_TASK_NODE_ID;
            });
            if (filtered.length > 0) onNodesChange(filtered);
        },
        [onNodesChange, onRfNodesChange],
    );

    const handleEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            if (readOnly) return;

            onRfEdgesChange(changes);

            const routeRemovals = changes.filter(
                (change) => change.type === 'remove' && isRouteEdgeId(change.id),
            );
            const chainChanges = changes.filter((change) => {
                if ('id' in change && isStubEdgeId(change.id)) return false;
                if (change.type !== 'remove') return true;
                return !isRouteEdgeId(change.id);
            });

            for (const removal of routeRemovals) {
                if (removal.type !== 'remove') continue;
                const edge = rfEdges.find((item) => item.id === removal.id);
                if (edge && !edge.id.includes('stub:')) onRouteEdgeRemove(edge);
            }

            if (chainChanges.length > 0) {
                onChainEdgesChange(chainChanges);
            }
        },
        [onChainEdgesChange, onRouteEdgeRemove, onRfEdgesChange, readOnly, rfEdges],
    );

    const handleConnect = useCallback(
        (connection: Connection) => {
            if (readOnly) return;
            onGraphConnect(connection);
        },
        [onGraphConnect, readOnly],
    );

    const isValidConnection = useCallback(
        (connection: Edge | Connection) => {
            if (readOnly) return false;
            const { source, target, sourceHandle, targetHandle } = connection;
            if (!source || !target || source === target) return false;
            if (!sourceHandle || !targetHandle) return false;
            return isValidStudioConnection({ source, target, sourceHandle, targetHandle }, nodes, chainEdges);
        },
        [chainEdges, nodes, readOnly],
    );

    return (
        <CanvasActionsContext.Provider value={canvasActions}>
            <div ref={reactFlowWrapper} className="relative h-full w-full studio-dot-grid">
                <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                onInit={handleInit}
                onNodesChange={readOnly ? undefined : handleNodesChange}
                onEdgesChange={readOnly ? undefined : handleEdgesChange}
                onConnect={handleConnect}
                isValidConnection={isValidConnection}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                nodesDraggable={!readOnly}
                nodesConnectable={!readOnly}
                edgesReconnectable={false}
                deleteKeyCode={readOnly ? null : 'Backspace'}
                elementsSelectable
                defaultEdgeOptions={{
                    type: 'studioChain',
                    className: STUDIO_EDGE_CLASS,
                    markerEnd: studioEdgeMarkerEnd(STUDIO_SEQUENCE_STROKE),
                }}
                nodeOrigin={STUDIO_NODE_ORIGIN}
                proOptions={{ hideAttribution: true }}
                className={cn(readOnly && 'opacity-95')}
            >
                <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#cbd5e1" />
                <Panel position="bottom-left" className="m-6 flex items-center gap-2">
                    <TippyHint content="Zoom in">
                        <button
                            type="button"
                            onClick={() => reactFlowInstance.current?.zoomIn()}
                            aria-label="Zoom in"
                            className={CANVAS_TOOL_BUTTON_CLASS}
                        >
                            <Plus className="h-4 w-4" strokeWidth={2.25} />
                        </button>
                    </TippyHint>
                    <TippyHint content="Zoom out">
                        <button
                            type="button"
                            onClick={() => reactFlowInstance.current?.zoomOut()}
                            aria-label="Zoom out"
                            className={CANVAS_TOOL_BUTTON_CLASS}
                        >
                            <Minus className="h-4 w-4" strokeWidth={2.25} />
                        </button>
                    </TippyHint>
                    <TippyHint content="Fit view">
                        <button
                            type="button"
                            onClick={() => reactFlowInstance.current?.fitView({ padding: 0.2 })}
                            aria-label="Fit view"
                            className={CANVAS_TOOL_BUTTON_CLASS}
                        >
                            <FitViewIcon className="h-3.5 w-4" />
                        </button>
                    </TippyHint>
                    {!readOnly ? (
                        <TippyHint content="Tidy up — auto-arrange the canvas">
                            <button
                                type="button"
                                onClick={onTidyUp}
                                aria-label="Tidy up — auto-arrange the canvas"
                                className={CANVAS_TOOL_BUTTON_CLASS}
                            >
                                <BrushCleaning className="h-4 w-4" strokeWidth={2.25} />
                            </button>
                        </TippyHint>
                    ) : null}
                </Panel>
                </ReactFlow>
            </div>
        </CanvasActionsContext.Provider>
    );
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
    return (
        <ReactFlowProvider>
            <WorkflowCanvasInner {...props} />
        </ReactFlowProvider>
    );
}

export function useWorkflowCanvasState(initialNodes: StudioCanvasNode[], initialEdges: Edge[]) {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const resetCanvas = useCallback((nextNodes: StudioCanvasNode[], nextEdges: Edge[]) => {
        setNodes(nextNodes);
        setEdges(nextEdges);
    }, [setNodes, setEdges]);

    return {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        setNodes,
        setEdges,
        resetCanvas,
    };
}
