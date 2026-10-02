import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Connection, Edge, NodeChange } from '@xyflow/react';
import { workflowApi } from '@/api/workflowApi';
import { executionApi } from '@/api/executionApi';
import type { WorkflowDefinition } from '@/types/api';
import { StudioHeader } from '@/features/workflow-studio/StudioHeader';
import { WorkflowCanvas } from '@/features/workflow-studio/WorkflowCanvas';
import { useWorkflowStore } from '@/features/workflow-studio/store/workflowStore';
import { TaskConfigDialog } from '@/features/workflow-studio/TaskConfigDialog';
import { StudioTaskCatalog } from '@/features/workflow-studio/StudioTaskCatalog';
import {
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
    appendTaskToChainOrBranch,
    applyStudioConnection,
    definitionToFlow,
    findFirstTaskValidationError,
    flowToDefinition,
    getOrderedTaskIds,
    getTaskNodes,
    nextTaskId,
    placeDetachedTask,
    removeTaskFromChain,
    syncWorkflowLayout,
    tidyUpWorkflowGraph,
    updateTaskInChain,
    type StudioCanvasNode
} from '@/features/workflow-studio/lib/workflowGraph';
import { getTaskTypePlugin } from '@/features/workflow-studio/task-type-schema/registry';
import type { TaskParameterErrors } from '@/features/workflow-studio/task-type-schema/types';
import { injectParameterType, validateTaskParameters } from '@/features/workflow-studio/task-type-schema/utils';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import { Loader2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ExecutionView } from '@/features/executions/ExecutionView';
import { WORKFLOW_START_ID, ADD_TASK_NODE_ID } from '@/features/workflow-studio/constants/studioCanvas';
import {
    getMainSpineIdsFromEdges,
    isMainSpineTerminated,
    taskTypeById,
} from '@/features/workflow-studio/lib/branchFlow';
import { MAIN_OUT, ITER_LOOP_OUT } from '@/features/workflow-studio/lib/graphHandles';
import { isIteratorLoopHandle, syncAllIteratorLoopBodies } from '@/features/workflow-studio/lib/iteratorLoopSync';
import { ITERATOR_NESTED_TYPES } from '@/features/workflow-studio/task-type-schema/iteratorTask';
import { nextTaskDisplayName, nextCustomDisplayName } from '@/features/workflow-studio/lib/taskDisplayName';
import {
    deleteStudioEdge,
    insertTaskOnStudioEdge,
} from '@/features/workflow-studio/lib/studioEdgeActions';
import { TriggerConfigDialog } from '@/features/workflow-studio/task-config/TriggerConfigDialog';

export type StudioMode = 'design' | 'inspect';

export default function WorkflowStudioPage() {
    const { id: routeId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isNew = routeId === 'new';
    const [workflowId, setWorkflowId] = useState<string | null>(isNew ? null : (routeId ?? null));
    const [workflowName, setWorkflowName] = useState(EMPTY_WORKFLOW.name);
    const [mode, setMode] = useState<StudioMode>('design');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [isDirty, setIsDirty] = useState(true);
    const [message, setMessage] = useState<string | null>(null);
    const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
    const [catalogOpen, setCatalogOpen] = useState(false);
    const [catalogAddIntent, setCatalogAddIntent] = useState(false);
    const [creatingTask, setCreatingTask] = useState<TaskNodeData | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [configOpen, setConfigOpen] = useState(false);
    const [triggerDialogOpen, setTriggerDialogOpen] = useState(false);
    const [configDraft, setConfigDraft] = useState<TaskNodeData | null>(null);
    const [pendingBranchWire, setPendingBranchWire] = useState<{
        sourceTaskId: string;
        sourceHandle: string;
    } | null>(null);
    const [pendingEdgeInsert, setPendingEdgeInsert] = useState<Edge | null>(null);
    const [savedDefinition, setSavedDefinition] = useState<WorkflowDefinition | null>(null);
    const [lastExecutionId, setLastExecutionId] = useState<string | null>(null);

    const skipNextLoadRef = useRef(false);
    const loadGenerationRef = useRef(0);
    const allowNavigationRef = useRef(false);

    const { nodes, edges, onNodesChange, onEdgesChange, setCanvasState, resetCanvas } =
        useWorkflowStore();

    // Make sure we initialize the store with EMPTY_WORKFLOW once on mount if empty
    useEffect(() => {
        const currentNodes = useWorkflowStore.getState().nodes;
        if (currentNodes.length === 0) {
            const initial = definitionToFlow(EMPTY_WORKFLOW);
            useWorkflowStore.getState().resetCanvas(initial.nodes, initial.edges);
            useWorkflowStore.temporal.getState().clear();
        }

        // Whenever an undo/redo happens (user performs action), mark the page as dirty
        const unsub = useWorkflowStore.temporal.subscribe((state, prevState) => {
            if (state.pastStates.length > prevState.pastStates.length) {
                setIsDirty(true);
            }
        });
        return () => unsub();
    }, []);

    const applyDefinition = useCallback(
        (definition: WorkflowDefinition) => {
            const { nodes: nextNodes, edges: nextEdges } = definitionToFlow(definition);
            const layoutRepaired = nextNodes.some((node) => {
                const stored = definition.layout?.[node.id];
                if (!stored?.x || !stored?.y || !node.position) return false;
                return (
                    Math.abs(stored.x - node.position.x) > 1 ||
                    Math.abs(stored.y - node.position.y) > 1
                );
            });
            resetCanvas(nextNodes, nextEdges);
            // Clear history after loading a workflow so you can't undo into the previous workflow
            setTimeout(() => {
                useWorkflowStore.temporal.getState().clear();
                setIsDirty(layoutRepaired);
            }, 0);
            setWorkflowName(definition.name);
            setWorkflowId(definition.id ?? null);
            setSavedDefinition(definition);
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
                    allowNavigationRef.current = true;
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
                allowNavigationRef.current = true;
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
                displayName: (node.data as TaskNodeData).displayName,
                parameters: node.data.parameters,
            })),
        [nodes],
    );

    const catalogAllowedTypes = useMemo((): StudioTaskType[] | undefined => {
        if (!pendingBranchWire) return undefined;
        if (isIteratorLoopHandle(pendingBranchWire.sourceHandle)) {
            return [...ITERATOR_NESTED_TYPES];
        }
        return undefined;
    }, [pendingBranchWire]);

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
        const syncedNodes = syncAllIteratorLoopBodies(canvasNodes, edges);
        const workflowTasks = getTaskNodes(syncedNodes).map((node) => ({
            taskId: node.data.taskId,
            type: node.data.type,
            displayName: (node.data as TaskNodeData).displayName,
            parameters: node.data.parameters,
        }));
        const taskOrder = taskOrderForConfig;
        const errorsByTaskId = new Map<string, TaskParameterErrors>();

        for (const node of getTaskNodes(syncedNodes)) {
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

    const shouldBlockLeave = useCallback(
        ({
            currentLocation,
            nextLocation,
        }: {
            currentLocation: { pathname: string };
            nextLocation: { pathname: string };
        }) => {
            if (!isDirty || allowNavigationRef.current) return false;
            return currentLocation.pathname !== nextLocation.pathname;
        },
        [isDirty],
    );

    const blocker = useBlocker(shouldBlockLeave);

    useEffect(() => {
        if (blocker.state === 'blocked') {
            setLeaveConfirmOpen(true);
        }
    }, [blocker.state]);

    useEffect(() => {
        allowNavigationRef.current = false;
    }, [location.pathname]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if we are typing in an input or textarea
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
                return;
            }

            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                useWorkflowStore.temporal.getState().undo();
            } else if (
                ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
                ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')
            ) {
                e.preventDefault();
                useWorkflowStore.temporal.getState().redo();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (!isDirty) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const dismissTaskConfig = useCallback(() => {
        setConfigOpen(false);
        setCreatingTask(null);
        setSelectedTaskId(null);
        setConfigDraft(null);
    }, []);

    const handleGraphConnect = useCallback(
        (connection: Connection) => {
            const workingNodes: StudioCanvasNode[] = configDraft
                ? nodes.map((node) => {
                      if (node.type !== 'task' || node.id !== configDraft.taskId) return node;
                      return { ...node, data: configDraft };
                  })
                : nodes;
            const result = applyStudioConnection(connection, workingNodes, edges);
            if (result) {
                const syncedNodes = syncAllIteratorLoopBodies(result.nodes, result.edges);
                setCanvasState({ nodes: syncedNodes, edges: result.edges });
                if (configDraft) {
                    const updated = syncedNodes.find((node) => node.id === configDraft.taskId);
                    if (updated?.type === 'task') {
                        setConfigDraft(updated.data as TaskNodeData);
                    }
                }
                markDirty();
            }
        },
        [configDraft, edges, markDirty, nodes, setCanvasState],
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
                const synced = syncAllIteratorLoopBodies(laid, chain);
                setCanvasState({ nodes: synced, edges: chain });
                if (edge.source && configDraft?.taskId === edge.source) {
                    const updated = nextNodes.find((node) => node.id === edge.source);
                    if (updated?.type === 'task') {
                        setConfigDraft(updated.data as TaskNodeData);
                    }
                }
                markDirty();
            }
        },
        [configDraft, edges, markDirty, nodes, setCanvasState],
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
            
            const isStructural = changes.some(
                (change) =>
                    (change.type === 'position' && change.dragging === false) ||
                    change.type === 'remove' ||
                    change.type === 'add' ||
                    change.type === 'replace'
            );

            if (!isStructural) {
                useWorkflowStore.temporal.getState().pause();
            }

            if (filtered.length > 0) onNodesChange(filtered);

            if (!isStructural) {
                useWorkflowStore.temporal.getState().resume();
            }

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
            const isStructural = changes.some(
                (change) => change.type === 'add' || change.type === 'remove'
            );

            if (!isStructural) {
                useWorkflowStore.temporal.getState().pause();
            }

            onEdgesChange(changes);

            if (!isStructural) {
                useWorkflowStore.temporal.getState().resume();
            }

            if (isStructural) markDirty();
        },
        [onEdgesChange, markDirty],
    );

    const handleAddTaskClick = useCallback(() => {
        if (mode === 'inspect') return;
        const spineIds = getMainSpineIdsFromEdges(nodes, edges);
        if (isMainSpineTerminated(spineIds, taskTypeById(nodes))) return;
        dismissTaskConfig();
        setPendingBranchWire(null);
        setPendingEdgeInsert(null);
        setCatalogAddIntent(true);
        setCatalogOpen(true);
    }, [dismissTaskConfig, edges, mode, nodes]);

    const handleBranchAddClick = useCallback(
        (sourceTaskId: string, sourceHandle: string) => {
            if (mode === 'inspect') return;
            dismissTaskConfig();
            setPendingEdgeInsert(null);
            setPendingBranchWire({ sourceTaskId, sourceHandle });
            setCatalogAddIntent(true);
            setCatalogOpen(true);
        },
        [dismissTaskConfig, mode],
    );

    const handleEdgeInsert = useCallback(
        (edge: Edge) => {
            if (mode === 'inspect') return;
            dismissTaskConfig();
            setPendingBranchWire(null);
            setPendingEdgeInsert(edge);
            setCatalogAddIntent(true);
            setCatalogOpen(true);
        },
        [dismissTaskConfig, mode],
    );

    const handleEdgeDelete = useCallback(
        (edge: Edge) => {
            if (mode === 'inspect') return;
            const workingNodes: StudioCanvasNode[] = configDraft
                ? nodes.map((node) => {
                      if (node.type !== 'task' || node.id !== configDraft.taskId) return node;
                      return { ...node, data: configDraft };
                  })
                : nodes;
            const result = deleteStudioEdge(edge, workingNodes, edges);
            if (!result) return;
            const synced = syncAllIteratorLoopBodies(result.nodes, result.edges);
            setCanvasState({ nodes: synced, edges: result.edges });
            if (edge.source && configDraft?.taskId === edge.source) {
                const updated = result.nodes.find((node) => node.id === edge.source);
                if (updated?.type === 'task') {
                    setConfigDraft(updated.data as TaskNodeData);
                }
            }
            markDirty();
        },
        [configDraft, edges, markDirty, mode, nodes, setCanvasState],
    );

    const handleTaskDrop = useCallback(
        (typeOrPayload: string, position: { x: number; y: number }) => {
            if (mode === 'inspect') return;

            let type: StudioTaskType;
            let initialParams: Record<string, unknown> = {};
            if (typeOrPayload.startsWith('{')) {
                try {
                    const parsed = JSON.parse(typeOrPayload);
                    type = parsed.type;
                    initialParams = { ...parsed };
                    delete initialParams.type;
                } catch {
                    // Fallback to typeOrPayload as type if JSON fails
                    type = typeOrPayload as StudioTaskType;
                }
            } else {
                type = typeOrPayload as StudioTaskType;
            }

            const paletteItem = TASK_PALETTE.find((item) => item.type === type);
            if (!paletteItem) return;
            if (catalogAllowedTypes && !catalogAllowedTypes.includes(type)) return;

            const existingIds = new Set(getTaskNodes(nodes).map((node) => node.id));
            let customTaskId = paletteItem.defaultTaskId;
            if (type === 'CONNECTOR_TASK' && initialParams.connectorId) {
                customTaskId = `connector_${initialParams.connectorId}`;
            }
            const taskId = nextTaskId(existingIds, customTaskId);
            const { type: paramType, ...rest } = paletteItem.defaultParameters;

            const baseName = type === 'CONNECTOR_TASK' && (initialParams.connectorName || initialParams.connectorId)
                ? String(initialParams.connectorName || (String(initialParams.connectorId).charAt(0).toUpperCase() + String(initialParams.connectorId).slice(1)))
                : null;

            const draft: TaskNodeData = {
                taskId,
                displayName: baseName ? nextCustomDisplayName(nodes, baseName) : nextTaskDisplayName(nodes, paletteItem.type),
                type: paletteItem.type,
                parameters: injectParameterType(
                    paletteItem.type,
                    { ...rest, ...initialParams, _isNewNode: true } as Record<string, unknown>,
                ),
            };

            const result = placeDetachedTask(nodes, edges, draft, position);
            const syncedNodes = updateTaskInChain(result.nodes, taskId, draft);
            const withIteratorSync = syncAllIteratorLoopBodies(syncedNodes, result.edges);
            const configTask =
                getTaskNodes(withIteratorSync).find((node) => node.id === taskId)?.data ?? draft;

            setCanvasState({ nodes: withIteratorSync, edges: result.edges });
            setCreatingTask(configTask as TaskNodeData);
            setSelectedTaskId(taskId);
            setConfigOpen(true);
            setCatalogOpen(false);
            setPendingBranchWire(null);
            setPendingEdgeInsert(null);
            markDirty();
        },
        [catalogAllowedTypes, edges, markDirty, mode, nodes, setCanvasState],
    );

    const handleCatalogSelectType = useCallback(
        (typeOrPayload: string) => {
            if (mode === 'inspect' || !catalogAddIntent) return;

            let type: StudioTaskType;
            let initialParams: Record<string, unknown> = {};
            if (typeOrPayload.startsWith('{')) {
                try {
                    const parsed = JSON.parse(typeOrPayload);
                    type = parsed.type;
                    initialParams = { ...parsed };
                    delete initialParams.type;
                } catch {
                    return;
                }
            } else {
                type = typeOrPayload as StudioTaskType;
            }

            const paletteItem = TASK_PALETTE.find((item) => item.type === type);
            if (!paletteItem) return;

            const existingIds = new Set(getTaskNodes(nodes).map((node) => node.id));
            const wire = pendingBranchWire;
            const fromIteratorLoop =
                wire?.sourceHandle === ITER_LOOP_OUT || isIteratorLoopHandle(wire?.sourceHandle ?? '');
            let customTaskId = fromIteratorLoop ? 'loop_action' : paletteItem.defaultTaskId;
            if (type === 'CONNECTOR_TASK' && initialParams.connectorId) {
                customTaskId = `connector_${initialParams.connectorId}`;
            }
            const taskId = nextTaskId(existingIds, customTaskId);
            const { type: paramType, ...rest } = paletteItem.defaultParameters;

            const baseName = type === 'CONNECTOR_TASK' && (initialParams.connectorName || initialParams.connectorId)
                ? String(initialParams.connectorName || (String(initialParams.connectorId).charAt(0).toUpperCase() + String(initialParams.connectorId).slice(1)))
                : null;

            const draft: TaskNodeData = {
                taskId,
                displayName: baseName ? nextCustomDisplayName(nodes, baseName) : nextTaskDisplayName(nodes, paletteItem.type),
                type: paletteItem.type,
                parameters: injectParameterType(
                    paletteItem.type,
                    { ...rest, ...initialParams, _isNewNode: true } as Record<string, unknown>,
                ),
            };

            const workingNodes: StudioCanvasNode[] = configDraft
                ? nodes.map((node) => {
                      if (node.type !== 'task' || node.id !== configDraft.taskId) return node;
                      return { ...node, data: configDraft };
                  })
                : nodes;

            const insertEdge = pendingEdgeInsert;
            let result: { nodes: StudioCanvasNode[]; edges: Edge[] } | null;
            if (insertEdge) {
                result = insertTaskOnStudioEdge(insertEdge, draft, workingNodes, edges);
            } else if (wire) {
                result =
                    wire.sourceHandle === MAIN_OUT
                        ? draft.type === 'JOIN'
                            ? appendJoinAtBranchEnd(workingNodes, edges, draft, wire.sourceTaskId)
                            : appendBranchChainTask(workingNodes, edges, draft, wire.sourceTaskId)
                        : addBranchTask(workingNodes, edges, draft, wire);
            } else {
                result = appendTaskToChainOrBranch(workingNodes, edges, draft);
            }
            if (!result) return;

            const placed = getTaskNodes(result.nodes).find((node) => node.id === taskId);
            const taskData = (placed?.data as TaskNodeData | undefined) ?? draft;
            const syncedNodes = updateTaskInChain(result.nodes, taskId, taskData);
            const laid = syncWorkflowLayout(syncedNodes, result.edges);
            const withIteratorSync = syncAllIteratorLoopBodies(laid.nodes, laid.edges);
            const configTask =
                getTaskNodes(withIteratorSync).find((node) => node.id === taskId)?.data ?? taskData;

            setCanvasState({ nodes: withIteratorSync, edges: laid.edges });
            setCreatingTask(configTask as TaskNodeData);
            setSelectedTaskId(taskId);
            setConfigOpen(true);
            setCatalogOpen(false);
            setCatalogAddIntent(false);
            setPendingBranchWire(null);
            setPendingEdgeInsert(null);
            markDirty();
        },
        [
            catalogAddIntent,
            configDraft,
            edges,
            markDirty,
            mode,
            nodes,
            pendingBranchWire,
            pendingEdgeInsert,
            setCanvasState,
        ],
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

    // Keep config draft wiring in sync when canvas connections update the store first.
    useEffect(() => {
        if (!configOpen || !configDraft) return;
        const storeNode = getTaskNodes(nodes).find((node) => node.id === configDraft.taskId);
        if (!storeNode) return;
        const storeData = storeNode.data as TaskNodeData;
        if (JSON.stringify(storeData.parameters) === JSON.stringify(configDraft.parameters)) return;
        setConfigDraft(storeData);
    }, [configDraft, configOpen, nodes]);

    const handleTaskApply = useCallback(
        (updated: TaskNodeData) => {
            if (updated.parameters._isNewNode) {
                delete updated.parameters._isNewNode;
            }
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
                    result = appendTaskToChainOrBranch(nodes, edges, updated);
                }
                if (!result) return;
                nextNodes = updateTaskInChain(result.nodes, updated.taskId, updated);
                nextEdges = result.edges;
            } else {
                nextNodes = updateTaskInChain(nodes, updated.taskId, updated);
            }

            const synced = syncWorkflowLayout(nextNodes, nextEdges);
            const withIteratorSync = syncAllIteratorLoopBodies(synced.nodes, synced.edges);
            setCanvasState({ nodes: withIteratorSync, edges: synced.edges });
            setCreatingTask(null);
            setPendingBranchWire(null);
            setPendingEdgeInsert(null);
            setSelectedTaskId(updated.taskId);
            markDirty();
        },
        [creatingTask, edges, markDirty, nodes, pendingBranchWire, pendingEdgeInsert, setCanvasState],
    );

    const handleDeleteTask = useCallback(
        (taskId: string) => {
            const { nodes: nextNodes, edges: nextEdges } = removeTaskFromChain(nodes, edges, taskId);
            setCanvasState({ nodes: nextNodes, edges: nextEdges });
            setCreatingTask(null);
            setSelectedTaskId(null);
            setConfigOpen(false);
            markDirty();
        },
        [edges, markDirty, nodes, setCanvasState],
    );

    const handleTidyUp = useCallback(() => {
        if (mode === 'inspect') return;
        const { nodes: laid, edges: chain } = tidyUpWorkflowGraph(nodes, edges);
        setCanvasState({ nodes: laid, edges: chain });
        markDirty();
    }, [edges, markDirty, mode, nodes, setCanvasState]);

    const buildDefinition = useCallback((): WorkflowDefinition => {
        const nodesForExport =
            configOpen && configDraft
                ? nodes.map((node) => {
                      if (node.type !== 'task' || node.id !== configDraft.taskId) return node;
                      return { ...node, data: configDraft };
                  })
                : nodes;
        return flowToDefinition(
            workflowName,
            nodesForExport,
            edges,
            savedDefinition ?? undefined,
            workflowId,
        );
    }, [configDraft, configOpen, edges, nodes, savedDefinition, workflowId, workflowName]);

    const handleBack = useCallback(() => {
        navigate('/workflows');
    }, [navigate]);

    const confirmLeave = useCallback(() => {
        setLeaveConfirmOpen(false);
        allowNavigationRef.current = true;
        if (blocker.state === 'blocked') {
            blocker.proceed();
            return;
        }
        navigate('/workflows');
    }, [blocker, navigate]);

    const handleLeaveDialogOpenChange = useCallback(
        (open: boolean) => {
            if (open) {
                setLeaveConfirmOpen(true);
                return;
            }
            setLeaveConfirmOpen(false);
            if (blocker.state === 'blocked') {
                blocker.reset();
            }
        },
        [blocker],
    );

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
            applyDefinition(saved);
            setMessage('Workflow saved');
            setIsDirty(false);
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
            const execution = await executionApi.trigger(id, 'ASYNC');
            if (execution.id) {
                setLastExecutionId(execution.id);
            }
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
            <div className="flex flex-1 items-center justify-center bg-[#f8fafc]">
                <Loader2 className="h-8 w-8 animate-spin text-[#45464d]" />
            </div>
        );
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f8fafc] text-[#0b1c30]">
            <StudioHeader
                workflowName={workflowName}
                onWorkflowNameChange={(name) => {
                    setWorkflowName(name);
                    markDirty();
                }}
                isDirty={isDirty}
                isSaving={isSaving}
                isRunning={isRunning}
                lastExecutionId={lastExecutionId}
                onSave={handleSave}
                onRun={handleRun}
                onBack={handleBack}
            />

            {message && (
                <div data-testid="studio-status-message" className="border-b border-[#c6c6cd]/60 bg-muted/40 px-6 py-2 text-xs text-[#45464d]">
                    {message}
                </div>
            )}

            <div data-testid="studio-canvas-container" className="flex min-h-0 flex-1">
                {mode === 'inspect' && lastExecutionId ? (
                    <div className="min-h-0 min-w-0 flex-1">
                        <ExecutionView
                            executionId={lastExecutionId}
                            embedded
                            showHeader={false}
                        />
                    </div>
                ) : mode === 'inspect' ? (
                    <div data-testid="studio-no-execution-message" className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                        <p className="text-sm font-medium text-foreground">No execution to inspect</p>
                        <p className="max-w-md text-sm text-muted-foreground">
                            Switch to Design and run the workflow. Inspect will show the latest run here.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="relative min-h-0 min-w-0 flex-1">
                        <WorkflowCanvas
                        key={workflowId ?? routeId ?? 'studio'}
                        nodes={canvasNodes}
                        edgeTopologyNodes={nodes}
                        chainEdges={edges}
                        triggerConfig={savedDefinition?.trigger}
                        taskValidationErrors={taskValidationErrors}
                        onNodesChange={handleNodesChange}
                        onChainEdgesChange={handleChainEdgesChange}
                        onGraphConnect={handleGraphConnect}
                        onRouteEdgeRemove={handleRouteEdgeRemove}
                        onStartNodeClick={() => setTriggerDialogOpen(true)}
                        onAddTaskClick={handleAddTaskClick}
                        onBranchAddClick={handleBranchAddClick}
                        onEdgeInsert={handleEdgeInsert}
                        onEdgeDelete={handleEdgeDelete}
                        onTaskSelect={handleTaskSelect}
                        onTaskDelete={handleDeleteTask}
                        onTidyUp={handleTidyUp}
                        onTaskDrop={handleTaskDrop}
                    />
                </div>

                <StudioTaskCatalog
                    open={catalogOpen}
                    onOpenChange={(open) => {
                        setCatalogOpen(open);
                        if (!open) {
                            setPendingBranchWire(null);
                            setPendingEdgeInsert(null);
                            setCatalogAddIntent(false);
                        }
                    }}
                    onBrowseOpen={() => setCatalogAddIntent(false)}
                    onSelectType={catalogAddIntent ? handleCatalogSelectType : undefined}
                    disabled={false}
                    allowedTypes={catalogAllowedTypes}
                />
                    </>
                )}
            </div>

            <TaskConfigDialog
                open={configOpen}
                task={selectedTask}
                isNewTask={creatingTask !== null}
                workflowTasks={workflowTasksForConfig}
                taskOrder={taskOrderForConfig}
                nodes={canvasNodes}
                edges={edges}
                workflowInputs={savedDefinition?.inputs}
                workflowVariables={savedDefinition?.variables}
                onOpenChange={handleConfigOpenChange}
                onApply={handleTaskApply}
                onDelete={handleDeleteTask}
                onDraftChange={handleConfigDraftChange}
            />

            <TriggerConfigDialog
                open={triggerDialogOpen}
                onOpenChange={setTriggerDialogOpen}
                workflowId={workflowId || 'NEW_WORKFLOW'}
                tasks={savedDefinition?.tasks ?? []}
                config={savedDefinition?.trigger}
                onSave={(config) => {
                    const nextDef = { ...savedDefinition, name: workflowName, trigger: config } as WorkflowDefinition;
                    setSavedDefinition(nextDef);
                    markDirty();
                }}
                onForceSave={handleSave}
            />

            <ConfirmDialog
                open={leaveConfirmOpen}
                onOpenChange={handleLeaveDialogOpenChange}
                title="Unsaved changes"
                description="You have unsaved changes. Leave without saving?"
                confirmLabel="Leave"
                cancelLabel="Stay"
                destructive
                onConfirm={confirmLeave}
            />
        </div>
    );
}
