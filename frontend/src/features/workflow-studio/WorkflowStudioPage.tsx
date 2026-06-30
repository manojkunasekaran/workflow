import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Connection, Edge, NodeChange } from '@xyflow/react';
import { workflowApi } from '@/api/workflowApi';
import type { WorkflowDefinition } from '@/types/api';
import { StudioHeader, type StudioMode } from '@/features/workflow-studio/StudioHeader';
import {
    WorkflowCanvas,
    useWorkflowCanvasState,
} from '@/features/workflow-studio/WorkflowCanvas';
import { TaskConfigDialog } from '@/features/workflow-studio/TaskConfigDialog';
import { StudioTaskCatalog } from '@/features/workflow-studio/StudioTaskCatalog';
import { applyTaskWithBranchJoinSync } from '@/features/workflow-studio/lib/branchJoinSync';
import {
    applyGraphConnection,
    applyRouteEdgeRemoval,
} from '@/features/workflow-studio/lib/graphRouting';
import {
    EMPTY_WORKFLOW,
    TASK_PALETTE,
    type StudioTaskType,
} from '@/features/workflow-studio/constants/taskPalette';
import {
    addBranchTask,
    appendBranchChainTask,
    appendJoinAtBranchEnd,
    appendTaskToChain,
    definitionToFlow,
    findFirstTaskValidationError,
    flowToDefinition,
    getOrderedTaskIds,
    getTaskNodes,
    nextTaskId,
    removeTaskFromChain,
    syncWorkflowLayout,
    tidyUpWorkflowGraph,
    type StudioCanvasNode
} from '@/features/workflow-studio/lib/workflowGraph';
import { getTaskTypePlugin } from '@/features/workflow-studio/task-type-schema/registry';
import type { TaskParameterErrors } from '@/features/workflow-studio/task-type-schema/types';
import { injectParameterType, validateTaskParameters } from '@/features/workflow-studio/task-type-schema/utils';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import { Loader2 } from 'lucide-react';
import { WORKFLOW_START_ID, ADD_TASK_NODE_ID } from '@/features/workflow-studio/constants/studioCanvas';
import {
    getMainSpineIdsFromEdges,
    isMainSpineTerminated,
    taskTypeById,
} from '@/features/workflow-studio/lib/branchFlow';
import { MAIN_OUT } from '@/features/workflow-studio/lib/graphHandles';
import {
    deleteStudioEdge,
    insertTaskOnStudioEdge,
} from '@/features/workflow-studio/lib/studioEdgeActions';

export default function WorkflowStudioPage() {
    const { id: routeId } = useParams();
    const navigate = useNavigate();
    const isNew = routeId === 'new';
    const [workflowId, setWorkflowId] = useState<string | null>(isNew ? null : (routeId ?? null));
    const [workflowName, setWorkflowName] = useState(EMPTY_WORKFLOW.name);
    const [mode, setMode] = useState<StudioMode>('design');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [isDirty, setIsDirty] = useState(true);
    const [message, setMessage] = useState<string | null>(null);
    const [catalogOpen, setCatalogOpen] = useState(false);
    const [creatingTask, setCreatingTask] = useState<TaskNodeData | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [configOpen, setConfigOpen] = useState(false);
    const [configDraft, setConfigDraft] = useState<TaskNodeData | null>(null);
    const [pendingBranchWire, setPendingBranchWire] = useState<{
        sourceTaskId: string;
        sourceHandle: string;
    } | null>(null);
    const [pendingEdgeInsert, setPendingEdgeInsert] = useState<Edge | null>(null);
    const [savedDefinition, setSavedDefinition] = useState<WorkflowDefinition | null>(null);

    const skipNextLoadRef = useRef(false);
    const loadGenerationRef = useRef(0);

    const initial = useMemo(() => definitionToFlow(EMPTY_WORKFLOW), []);
    const { nodes, edges, onNodesChange, onEdgesChange, setNodes, setEdges, resetCanvas } =
        useWorkflowCanvasState(initial.nodes, initial.edges);

    const applyDefinition = useCallback(
        (definition: WorkflowDefinition) => {
            const { nodes: nextNodes, edges: nextEdges } = definitionToFlow(definition);
            resetCanvas(nextNodes, nextEdges);
            setWorkflowName(definition.name);
            setWorkflowId(definition.id ?? null);
            setSavedDefinition(definition);
            setIsDirty(false);
        },
        [resetCanvas],
    );

    useEffect(() => {
        const generation = ++loadGenerationRef.current;

        const load = async () => {
            try {
                if (skipNextLoadRef.current && routeId && routeId !== 'new') {
                    skipNextLoadRef.current = false;
                    setWorkflowId(routeId);
                    setIsLoading(false);
                    return;
                }

                setIsLoading(true);
                setMessage(null);
                setConfigOpen(false);
                setCatalogOpen(false);
                setCreatingTask(null);
                setSelectedTaskId(null);
                setMode('design');

                if (isNew) {
                    if (generation !== loadGenerationRef.current) return;
                    applyDefinition(EMPTY_WORKFLOW);
                    setWorkflowId(null);
                    setIsDirty(true);
                    return;
                }

                if (!routeId) {
                    navigate('/workflows', { replace: true });
                    return;
                }

                const definition = await workflowApi.getById(routeId);
                if (generation !== loadGenerationRef.current) return;
                applyDefinition(definition);
            } catch (error) {
                if (generation !== loadGenerationRef.current) return;
                console.error('Failed to load workflow', error);
                setMessage('Failed to load workflow');
                navigate('/workflows', { replace: true });
            } finally {
                if (generation === loadGenerationRef.current) {
                    setIsLoading(false);
                }
            }
        };

        load();
    }, [routeId, isNew, navigate, applyDefinition]);

    const selectedTask = useMemo((): TaskNodeData | null => {
        if (creatingTask && selectedTaskId === creatingTask.taskId) {
            return creatingTask;
        }
        const node = getTaskNodes(nodes).find((item) => item.id === selectedTaskId);
        return node?.data ?? null;
    }, [creatingTask, nodes, selectedTaskId]);

    const workflowTasksForConfig = useMemo(
        () =>
            getTaskNodes(nodes).map((node) => ({
                taskId: node.data.taskId,
                type: node.data.type,
                parameters: node.data.parameters,
            })),
        [nodes],
    );

    const taskOrderForConfig = useMemo(
        () => getOrderedTaskIds(nodes, edges),
        [nodes, edges],
    );

    const canvasNodes = useMemo((): StudioCanvasNode[] => {
        if (!configOpen || !configDraft) return nodes;
        return nodes.map((node) => {
            if (node.type !== 'task' || node.id !== configDraft.taskId) return node;
            return { ...node, data: configDraft };
        });
    }, [configDraft, configOpen, nodes]);

    const taskValidationErrors = useMemo(() => {
        const workflowTasks = workflowTasksForConfig;
        const taskOrder = taskOrderForConfig;
        const errorsByTaskId = new Map<string, TaskParameterErrors>();

        for (const node of getTaskNodes(canvasNodes)) {
            const plugin = getTaskTypePlugin(node.data.type);
            if (!plugin) continue;
            const { errors } = validateTaskParameters(plugin, node.data.parameters, {
                workflowTasks,
                taskOrder,
                currentTaskId: node.data.taskId,
                isNewTask: creatingTask?.taskId === node.data.taskId,
            });
            if (Object.keys(errors).length > 0) {
                errorsByTaskId.set(node.data.taskId, errors);
            }
        }
        return errorsByTaskId;
    }, [canvasNodes, creatingTask?.taskId, taskOrderForConfig, workflowTasksForConfig]);

    const markDirty = useCallback(() => setIsDirty(true), []);

    const handleGraphConnect = useCallback(
        (connection: Connection) => {
            const workingNodes: StudioCanvasNode[] = configDraft
                ? nodes.map((node) => {
                      if (node.type !== 'task' || node.id !== configDraft.taskId) return node;
                      return { ...node, data: configDraft };
                  })
                : nodes;
            const nextNodes = applyGraphConnection(connection, workingNodes, edges);
            if (nextNodes) {
                const { nodes: laid, edges: chain } = syncWorkflowLayout(nextNodes, edges);
                setNodes(laid);
                setEdges(chain);
                const wiredSource = connection.source;
                if (wiredSource && configDraft?.taskId === wiredSource) {
                    const updated = nextNodes.find((node) => node.id === wiredSource);
                    if (updated?.type === 'task') {
                        setConfigDraft(updated.data as TaskNodeData);
                    }
                }
                markDirty();
            }
        },
        [configDraft, edges, markDirty, nodes, setEdges, setNodes],
    );

    const handleRouteEdgeRemove = useCallback(
        (edge: Edge) => {
            const workingNodes: StudioCanvasNode[] = configDraft
                ? nodes.map((node) => {
                      if (node.type !== 'task' || node.id !== configDraft.taskId) return node;
                      return { ...node, data: configDraft };
                  })
                : nodes;
            const nextNodes = applyRouteEdgeRemoval(edge, workingNodes, edges);
            if (nextNodes) {
                const { nodes: laid, edges: chain } = syncWorkflowLayout(nextNodes, edges);
                setNodes(laid);
                setEdges(chain);
                if (edge.source && configDraft?.taskId === edge.source) {
                    const updated = nextNodes.find((node) => node.id === edge.source);
                    if (updated?.type === 'task') {
                        setConfigDraft(updated.data as TaskNodeData);
                    }
                }
                markDirty();
            }
        },
        [configDraft, edges, markDirty, nodes, setEdges, setNodes],
    );

    const handleNodesChange = useCallback(
        (changes: NodeChange<StudioCanvasNode>[]) => {
            const filtered = changes.filter((change) => {
                if (change.type !== 'remove') return true;
                return (
                    change.id !== WORKFLOW_START_ID &&
                    change.id !== ADD_TASK_NODE_ID &&
                    !getTaskNodes(nodes).some((node) => node.id === change.id)
                );
            });
            if (filtered.length > 0) onNodesChange(filtered);

            // Persist manual drags: a finished position change makes the workflow dirty.
            const dragged = changes.some(
                (change) => change.type === 'position' && change.dragging === false,
            );
            if (dragged) markDirty();
        },
        [markDirty, nodes, onNodesChange],
    );

    const handleChainEdgesChange = useCallback(
        (changes: Parameters<typeof onEdgesChange>[0]) => {
            onEdgesChange(changes);
            const structural = changes.some((change) => change.type === 'add' || change.type === 'remove');
            if (structural) markDirty();
        },
        [onEdgesChange, markDirty],
    );

    const handleAddTaskClick = useCallback(() => {
        if (mode === 'inspect') return;
        const spineIds = getMainSpineIdsFromEdges(nodes, edges);
        if (isMainSpineTerminated(spineIds, taskTypeById(nodes))) return;
        setPendingBranchWire(null);
        setPendingEdgeInsert(null);
        setCatalogOpen(true);
    }, [edges, mode, nodes]);

    const handleBranchAddClick = useCallback(
        (sourceTaskId: string, sourceHandle: string) => {
            if (mode === 'inspect') return;
            setPendingEdgeInsert(null);
            setPendingBranchWire({ sourceTaskId, sourceHandle });
            setCatalogOpen(true);
        },
        [mode],
    );

    const handleEdgeInsert = useCallback(
        (edge: Edge) => {
            if (mode === 'inspect') return;
            setPendingBranchWire(null);
            setPendingEdgeInsert(edge);
            setCatalogOpen(true);
        },
        [mode],
    );

    const handleEdgeDelete = useCallback(
        (edge: Edge) => {
            if (mode === 'inspect') return;
            const result = deleteStudioEdge(edge, nodes, edges);
            if (!result) return;
            setNodes(result.nodes);
            setEdges(result.edges);
            markDirty();
        },
        [edges, markDirty, nodes, setEdges, setNodes],
    );

    const handleCatalogSelectType = useCallback(
        (type: StudioTaskType) => {
            const paletteItem = TASK_PALETTE.find((item) => item.type === type);
            if (!paletteItem) return;

            const existingIds = new Set(getTaskNodes(nodes).map((node) => node.id));
            const taskId = nextTaskId(existingIds, paletteItem.defaultTaskId);
            const { type: paramType, ...rest } = paletteItem.defaultParameters;

            const draft: TaskNodeData = {
                taskId,
                type: paletteItem.type,
                parameters: injectParameterType(
                    paletteItem.type,
                    rest as Record<string, unknown>,
                ),
            };

            const wire = pendingBranchWire;
            const insertEdge = pendingEdgeInsert;
            let result: { nodes: StudioCanvasNode[]; edges: Edge[] } | null;
            if (insertEdge) {
                result = insertTaskOnStudioEdge(insertEdge, draft, nodes, edges);
            } else if (wire) {
                result =
                    wire.sourceHandle === MAIN_OUT
                        ? draft.type === 'JOIN'
                            ? appendJoinAtBranchEnd(nodes, edges, draft, wire.sourceTaskId)
                            : appendBranchChainTask(nodes, edges, draft, wire.sourceTaskId)
                        : addBranchTask(nodes, edges, draft, wire);
            } else {
                result = appendTaskToChain(nodes, edges, draft);
            }
            if (!result) return;

            const placed = getTaskNodes(result.nodes).find((node) => node.id === taskId);
            const taskData = (placed?.data as TaskNodeData | undefined) ?? draft;
            const syncedNodes = applyTaskWithBranchJoinSync(result.nodes, taskId, taskData);
            const laid = syncWorkflowLayout(syncedNodes, result.edges);
            const configTask =
                getTaskNodes(laid.nodes).find((node) => node.id === taskId)?.data ?? taskData;

            setNodes(laid.nodes);
            setEdges(laid.edges);
            setCreatingTask(configTask as TaskNodeData);
            setSelectedTaskId(taskId);
            setConfigOpen(true);
            setCatalogOpen(false);
            setPendingBranchWire(null);
            setPendingEdgeInsert(null);
            markDirty();
        },
        [edges, markDirty, nodes, pendingBranchWire, pendingEdgeInsert, setEdges, setNodes],
    );

    const handleTaskSelect = useCallback(
        (taskId: string) => {
            if (mode === 'inspect') return;
            if (!taskId) {
                setSelectedTaskId(null);
                setConfigOpen(false);
                return;
            }
            setCreatingTask(null);
            setSelectedTaskId(taskId);
            setConfigOpen(true);
        },
        [mode],
    );

    const handleConfigOpenChange = useCallback((open: boolean) => {
        setConfigOpen(open);
        if (!open) {
            setCreatingTask(null);
            setSelectedTaskId(null);
            setConfigDraft(null);
        }
    }, []);

    const handleConfigDraftChange = useCallback((draft: TaskNodeData | null) => {
        setConfigDraft(draft);
    }, []);

    const handleTaskApply = useCallback(
        (updated: TaskNodeData) => {
            const onCanvas = getTaskNodes(nodes).some((node) => node.id === updated.taskId);
            let nextNodes: StudioCanvasNode[];
            let nextEdges = edges;

            if (creatingTask && !onCanvas) {
                let result: { nodes: StudioCanvasNode[]; edges: Edge[] } | null;
                if (pendingEdgeInsert) {
                    result = insertTaskOnStudioEdge(pendingEdgeInsert, updated, nodes, edges);
                } else if (pendingBranchWire) {
                    result =
                        pendingBranchWire.sourceHandle === MAIN_OUT
                            ? updated.type === 'JOIN'
                                ? appendJoinAtBranchEnd(
                                      nodes,
                                      edges,
                                      updated,
                                      pendingBranchWire.sourceTaskId,
                                  )
                                : appendBranchChainTask(
                                      nodes,
                                      edges,
                                      updated,
                                      pendingBranchWire.sourceTaskId,
                                  )
                            : addBranchTask(nodes, edges, updated, pendingBranchWire);
                } else {
                    result = appendTaskToChain(nodes, edges, updated);
                }
                if (!result) return;
                nextNodes = applyTaskWithBranchJoinSync(result.nodes, updated.taskId, updated);
                nextEdges = result.edges;
            } else {
                nextNodes = applyTaskWithBranchJoinSync(nodes, updated.taskId, updated);
            }

            const synced = syncWorkflowLayout(nextNodes, nextEdges);
            setNodes(synced.nodes);
            setEdges(synced.edges);
            setCreatingTask(null);
            setPendingBranchWire(null);
            setPendingEdgeInsert(null);
            setSelectedTaskId(updated.taskId);
            markDirty();
        },
        [creatingTask, edges, markDirty, nodes, pendingBranchWire, pendingEdgeInsert, setEdges, setNodes],
    );

    const handleDeleteTask = useCallback(
        (taskId: string) => {
            const { nodes: nextNodes, edges: nextEdges } = removeTaskFromChain(nodes, edges, taskId);
            setNodes(nextNodes);
            setEdges(nextEdges);
            setCreatingTask(null);
            setSelectedTaskId(null);
            setConfigOpen(false);
            markDirty();
        },
        [edges, markDirty, nodes, setEdges, setNodes],
    );

    const handleTidyUp = useCallback(() => {
        if (mode === 'inspect') return;
        const { nodes: laid, edges: chain } = tidyUpWorkflowGraph(nodes, edges);
        setNodes(laid);
        setEdges(chain);
        markDirty();
    }, [edges, markDirty, mode, nodes, setEdges, setNodes]);

    const buildDefinition = useCallback((): WorkflowDefinition => {
        return flowToDefinition(
            workflowName,
            nodes,
            edges,
            savedDefinition ?? undefined,
            workflowId,
        );
    }, [edges, nodes, savedDefinition, workflowId, workflowName]);

    const confirmDiscardChanges = useCallback(() => {
        if (!isDirty) return true;
        return window.confirm('You have unsaved changes. Leave without saving?');
    }, [isDirty]);

    const handleBack = useCallback(() => {
        if (!confirmDiscardChanges()) return;
        navigate('/workflows');
    }, [confirmDiscardChanges, navigate]);

    const handleSave = async () => {
        const validationError = findFirstTaskValidationError(nodes, edges);
        if (validationError) {
            setMessage(validationError);
            return;
        }

        try {
            setIsSaving(true);
            setMessage(null);
            const definition = buildDefinition();
            const saved = workflowId
                ? await workflowApi.update(workflowId, definition)
                : await workflowApi.create(definition);
            const savedId = saved.id ?? null;
            setWorkflowId(savedId);
            setSavedDefinition(saved);
            setIsDirty(false);
            setMessage('Workflow saved');
            if (!workflowId && savedId) {
                skipNextLoadRef.current = true;
                navigate(`/workflows/${savedId}`, { replace: true });
            }
        } catch (error) {
            console.error('Save failed', error);
            setMessage('Failed to save workflow');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRun = async () => {
        const validationError = findFirstTaskValidationError(nodes, edges);
        if (validationError) {
            setMessage(validationError);
            return;
        }

        try {
            setIsRunning(true);
            setMessage(null);
            let id = workflowId;
            if (!id || isDirty) {
                const definition = buildDefinition();
                const saved = id
                    ? await workflowApi.update(id, definition)
                    : await workflowApi.create(definition);
                id = saved.id ?? null;
                setWorkflowId(id);
                setSavedDefinition(saved);
                setIsDirty(false);
                if (isNew && id) {
                    skipNextLoadRef.current = true;
                    navigate(`/workflows/${id}`, { replace: true });
                }
            }
            if (!id) throw new Error('No workflow id');
            await workflowApi.run(id);
            setMessage('Workflow run started');
            setMode('inspect');
            setCatalogOpen(false);
            setConfigOpen(false);
        } catch (error) {
            console.error('Run failed', error);
            setMessage('Failed to run workflow');
        } finally {
            setIsRunning(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center bg-[#f8f9ff]">
                <Loader2 className="h-8 w-8 animate-spin text-[#45464d]" />
            </div>
        );
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f8f9ff] text-[#0b1c30]">
            <StudioHeader
                workflowName={workflowName}
                onWorkflowNameChange={(name) => {
                    setWorkflowName(name);
                    markDirty();
                }}
                mode={mode}
                onModeChange={setMode}
                isDirty={isDirty}
                isSaving={isSaving}
                isRunning={isRunning}
                onSave={handleSave}
                onRun={handleRun}
                onBack={handleBack}
            />

            {message && (
                <div className="border-b border-[#c6c6cd]/60 bg-[#eff4ff] px-6 py-2 text-xs text-[#45464d]">
                    {message}
                </div>
            )}

            <div className="flex min-h-0 flex-1">
                <div className="relative min-h-0 min-w-0 flex-1">
                    <WorkflowCanvas
                        key={workflowId ?? routeId ?? 'studio'}
                        nodes={canvasNodes}
                        chainEdges={edges}
                        mode={mode}
                        taskValidationErrors={taskValidationErrors}
                        onNodesChange={handleNodesChange}
                        onChainEdgesChange={handleChainEdgesChange}
                        onGraphConnect={handleGraphConnect}
                        onRouteEdgeRemove={handleRouteEdgeRemove}
                        onAddTaskClick={handleAddTaskClick}
                        onBranchAddClick={handleBranchAddClick}
                        onEdgeInsert={handleEdgeInsert}
                        onEdgeDelete={handleEdgeDelete}
                        onTaskSelect={handleTaskSelect}
                        onTidyUp={handleTidyUp}
                    />
                </div>

                <StudioTaskCatalog
                    open={catalogOpen}
                    onOpenChange={(open) => {
                        setCatalogOpen(open);
                        if (!open) {
                            setPendingBranchWire(null);
                            setPendingEdgeInsert(null);
                        }
                    }}
                    onSelectType={handleCatalogSelectType}
                    disabled={mode === 'inspect'}
                />
            </div>

            <TaskConfigDialog
                open={configOpen}
                task={selectedTask}
                isNewTask={creatingTask !== null}
                workflowTasks={workflowTasksForConfig}
                taskOrder={taskOrderForConfig}
                onOpenChange={handleConfigOpenChange}
                onApply={handleTaskApply}
                onDelete={handleDeleteTask}
                onDraftChange={handleConfigDraftChange}
            />
        </div>
    );
}
