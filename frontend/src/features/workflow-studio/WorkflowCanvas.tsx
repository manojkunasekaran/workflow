import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Controls, ControlButton, MiniMap,
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
import { Wand2 } from 'lucide-react';
import { TaskNode } from '@/features/workflow-studio/nodes/TaskNode';
import { StartNode } from '@/features/workflow-studio/nodes/StartNode';
import { RouteEdge } from '@/features/workflow-studio/edges/RouteEdge';
import { ChainEdge } from '@/features/workflow-studio/edges/ChainEdge';
import { CanvasActionsContext } from '@/features/workflow-studio/CanvasActionsContext';
import type { StudioMode } from '@/features/workflow-studio/StudioHeader';
import {
    ADD_TASK_NODE_ID,
    WORKFLOW_START_ID,
} from '@/features/workflow-studio/constants/studioCanvas';
import {
    getMainSpineIdsFromEdges
} from '@/features/workflow-studio/lib/branchFlow';
import type { StudioCanvasNode } from '@/features/workflow-studio/lib/workflowGraph';
import { getTaskNodes } from '@/features/workflow-studio/lib/workflowGraph';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import {
    mergeDisplayEdges,
    isValidPluginConnection,
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
import type { TaskParameterErrors } from '@/features/workflow-studio/task-type-schema/types';
import { cn } from '@/lib/utils';

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
    onTidyUp: () => void;
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
    onTidyUp,
}: WorkflowCanvasProps) {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
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
        return merged.map((edge) => ({
            ...edge,
            data: {
                ...(edge.data ?? {}),
                studioActionKind: classifyStudioEdge(edge, nodes, chainEdges),
            },
        }));
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
            readOnly,
        }),
        [onAddTaskClick, onBranchAddClick, onEdgeDelete, onEdgeInsert, readOnly],
    );

    const handleInit = useCallback((instance: ReactFlowInstance<StudioCanvasNode, Edge>) => {
        if (!hasFitViewRef.current) {
            instance.fitView({ padding: 0.2 });
            hasFitViewRef.current = true;
        }
    }, []);

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
            return isValidPluginConnection({ source, target, sourceHandle, targetHandle }, nodes, chainEdges);
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
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                nodesDraggable={!readOnly}
                nodesConnectable={!readOnly}
                edgesReconnectable={false}
                deleteKeyCode={readOnly ? null : 'Backspace'}
                elementsSelectable
                defaultEdgeOptions={{ type: 'studioChain' }}
                nodeOrigin={[0, 0.5]}
                proOptions={{ hideAttribution: true }}
                className={cn(readOnly && 'opacity-95')}
            >
                <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#cbd5e1" />
                <Panel position="bottom-right" className="m-6 flex items-center gap-4">
                    <MiniMap
                        className="!static !h-24 !w-32 !rounded-xl !border-[#c6c6cd] !bg-white/90 !shadow-lg"
                        nodeColor={(node) => {
                            if (node.type === 'start') return '#0d9488';
                            if (node.type === 'addTask' || node.type === 'branchAdd') {
                                return '#94a3b8';
                            }
                            return '#2170e4';
                        }}
                        maskColor="rgba(0, 88, 190, 0.08)"
                    />
                    <Controls
                        showInteractive={false}
                        className="!static !shadow-lg !border-[#c6c6cd]"
                    >
                        {!readOnly && (
                            <ControlButton onClick={onTidyUp} title="Tidy up — auto-arrange the canvas">
                                <Wand2 />
                            </ControlButton>
                        )}
                    </Controls>
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
