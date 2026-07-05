import type { Connection, Edge } from '@xyflow/react';
import type { TaskNodeData } from '@/features/workflow-studio/nodes/TaskNode';
import { getTaskTypePlugin } from '@/features/workflow-studio/task-type-schema/registry';
import type {
    BilateralWireRule,
    ListWireOutput,
    ParamWireOutput,
    TaskPluginWiring,
    WireHandle,
    WireRouteKind,
    WireOutputDef,
    WireStubBehavior,
} from '@/features/workflow-studio/task-type-schema/pluginWiringTypes';
import {
    DEFAULT_TASK_WIRING,
    MAIN_FLOW_INPUT,
    MAIN_FLOW_OUTPUT,
} from '@/features/workflow-studio/task-type-schema/pluginWiringTypes';
import {
    MAIN_IN,
    MAIN_OUT,
    ROUTE_EDGE_PREFIX,
    isRouteEdgeId,
    isJoinMergeInput,
    JOIN_MERGE_IN,
} from '@/features/workflow-studio/lib/graphHandles';
import {
    ADD_TASK_NODE_ID,
    WORKFLOW_START_ID,
} from '@/features/workflow-studio/constants/studioCanvas';
import { getTaskNodes, type StudioCanvasNode } from '@/features/workflow-studio/lib/canvasNodeUtils';
import { injectParameterType } from '@/features/workflow-studio/task-type-schema/utils';
import { handleTopPercent, resolveOutputHandleTop } from '@/features/workflow-studio/constants/taskNodeLayout';
import { isStubEdgeId } from '@/features/workflow-studio/lib/branchAddStubs';
import { ITERATOR_NESTED_TYPES } from '@/features/workflow-studio/task-type-schema/iteratorTask';
import { ITER_LOOP_OUT } from '@/features/workflow-studio/lib/graphHandles';
import { studioRouteMarkerEnd } from '@/features/workflow-studio/edges/studioEdgeTheme';
import {
    findBranchTaskForChainTask,
    readBranchEndTaskId,
    resolveLinkedBranchData,
    resolveBranchIndexForEndTask,
    syncBranchJoinPair,
    writeBranchEndTaskId,
    type WireGraphContext,
} from '@/features/workflow-studio/lib/joinWiring';

export type { WireGraphContext };

export type RouteEdgeData = {
    label?: string;
    routeKind: WireRouteKind;
    /** Matches the source handle color from plugin wiring. */
    strokeColor?: string;
};

function workflowContextFromNodes(nodes: StudioCanvasNode[]): WireGraphContext {
    return {
        workflowTasks: getTaskNodes(nodes).map((node) => node.data as TaskNodeData),
    };
}

function getWiring(type: string): TaskPluginWiring {
    return getTaskTypePlugin(type)?.wiring ?? DEFAULT_TASK_WIRING;
}

function hasMainFlowIn(wiring: TaskPluginWiring): boolean {
    if (wiring.mainFlow === false) return false;
    if (wiring.mainFlowIn === false) return false;
    return true;
}

function hasMainFlowOut(wiring: TaskPluginWiring): boolean {
    if (wiring.mainFlow === false) return false;
    if (wiring.mainFlowOut === false) return false;
    return true;
}

export function terminatesMainSpine(type: string): boolean {
    return !hasMainFlowOut(getWiring(type)) && listRoutingOutputs(getWiring(type)).length > 0;
}

function listRoutingOutputs(wiring: TaskPluginWiring): WireOutputDef[] {
    return wiring.outputs;
}

export type RoutingEndpoint = {
    handleId: string;
    label: string;
    color: string;
    routeKind: WireRouteKind;
    targetTaskId: string;
};

export function listRoutingEndpoints(data: TaskNodeData): RoutingEndpoint[] {
    const wiring = getWiring(data.type);
    const endpoints: RoutingEndpoint[] = [];

    for (const output of wiring.outputs) {
        if (output.kind === 'param') {
            endpoints.push({
                handleId: output.handleId,
                label: output.label,
                color: output.color,
                routeKind: output.routeKind,
                targetTaskId: readTargetId(output, data.parameters),
            });
        } else {
            const rows = listRows(data.parameters, output.listParam);
            const count = Math.max(rows.length, 1);
            for (let i = 0; i < count; i++) {
                endpoints.push({
                    handleId: listHandleId(output, i),
                    label: outputLabel(output, data.parameters, i),
                    color: output.color,
                    routeKind: output.routeKind,
                    targetTaskId: readTargetId(output, data.parameters, i),
                });
            }
        }
    }

    return endpoints;
}

export function resolveOutputStubBehavior(def: WireOutputDef): WireStubBehavior {
    if (def.stubBehavior) return def.stubBehavior;
    return def.routeKind === 'join' ? 'connect-only' : 'add-task';
}

export type TaskOutputView = {
    handleId: string;
    label: string;
    color: string;
    top: string;
    wired: boolean;
    stubBehavior: WireStubBehavior;
};

export type TaskInputView = {
    id: string;
    label: string;
    top: string;
};

export function resolveTaskOutputViews(data: TaskNodeData): {
    inputs: TaskInputView[];
    outputs: TaskOutputView[];
    isRoutingTerminator: boolean;
} {
    const { sources, targets } = resolvePluginHandles(data);
    const endpointMap = new Map(
        listRoutingEndpoints(data).map((endpoint) => [endpoint.handleId, endpoint]),
    );
    const isRoutingTerminator = terminatesMainSpine(data.type);
    const wiring = getWiring(data.type);

    const outputs: TaskOutputView[] = sources.map((source, index) => {
        const endpoint = endpointMap.get(source.id);
        const match = findOutputDef(wiring, source.id);
        return {
            handleId: source.id,
            label: source.label,
            color: source.color,
            top: resolveOutputHandleTop(index, sources.length, isRoutingTerminator),
            wired: Boolean(endpoint?.targetTaskId?.trim()),
            stubBehavior: match ? resolveOutputStubBehavior(match.def) : 'connect-only',
        };
    });

    const inputs: TaskInputView[] = targets.map((target, index) => ({
        id: target.id,
        label: target.label,
        top: handleTopPercent(index, targets.length),
    }));

    return { inputs, outputs, isRoutingTerminator };
}

export function clearTaskWireReferences(
    nodes: StudioCanvasNode[],
    removedTaskId: string,
): StudioCanvasNode[] {
    let next = nodes;

    for (const node of getTaskNodes(nodes)) {
        if (node.data.type === 'BRANCH') {
            const branchParams = node.data.parameters;
            const joinTaskId = String(branchParams.joinTaskId ?? '').trim();
            let changed = false;
            let nextParams = branchParams;

            if (joinTaskId === removedTaskId) {
                changed = true;
                const rows = listRows(branchParams, 'branches').map((row) => ({
                    ...row,
                    endTaskId: '',
                }));
                nextParams = injectParameterType('BRANCH', {
                    ...branchParams,
                    joinTaskId: '',
                    branches: rows,
                });
            } else {
                const rows = listRows(branchParams, 'branches');
                const nextRows = rows.map((row) => {
                    if (String(row.endTaskId ?? '').trim() === removedTaskId) {
                        changed = true;
                        return { ...row, endTaskId: '' };
                    }
                    return row;
                });
                if (changed) {
                    nextParams = injectParameterType('BRANCH', {
                        ...branchParams,
                        branches: nextRows,
                    });
                }
            }

            if (changed) {
                next = updateTaskNode(next, node.id, nextParams);
            }
        }

        if (node.data.type === 'JOIN') {
            const joinParams = node.data.parameters;
            const branchTaskId = String(joinParams.branchTaskId ?? '').trim();
            if (branchTaskId === removedTaskId) {
                next = updateTaskNode(
                    next,
                    node.id,
                    injectParameterType('JOIN', {
                        ...joinParams,
                        branchTaskId: '',
                    }),
                );
            }
        }

        for (const endpoint of listRoutingEndpoints(node.data)) {
            if (endpoint.targetTaskId !== removedTaskId) continue;
            const match = findOutputDef(getWiring(node.data.type), endpoint.handleId);
            if (!match) continue;
            const cleared = writeTargetId(
                node.data.type,
                match.def,
                node.data.parameters,
                null,
                match.index,
            );
            next = updateTaskNode(next, node.id, cleared);
        }
    }
    return next;
}

function listRows(parameters: Record<string, unknown>, listParam: string): Record<string, unknown>[] {
    const raw = parameters[listParam];
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object');
}

function listHandleId(def: ListWireOutput, index: number): string {
    return `${def.handlePrefix}-${index}`;
}

function parseListIndex(handleId: string, prefix: string): number | null {
    if (!handleId.startsWith(`${prefix}-`)) return null;
    const index = Number.parseInt(handleId.slice(prefix.length + 1), 10);
    return Number.isNaN(index) ? null : index;
}

function findOutputDef(
    wiring: TaskPluginWiring,
    sourceHandle: string,
): { def: ListWireOutput | ParamWireOutput; index?: number } | null {
    for (const output of wiring.outputs) {
        if (output.kind === 'param' && output.handleId === sourceHandle) {
            return { def: output };
        }
        if (output.kind === 'list') {
            const index = parseListIndex(sourceHandle, output.handlePrefix);
            if (index !== null) return { def: output, index };
        }
    }
    return null;
}

function readTargetId(
    def: ListWireOutput | ParamWireOutput,
    parameters: Record<string, unknown>,
    index?: number,
): string {
    if (def.kind === 'param') {
        return String(parameters[def.paramKey] ?? '').trim();
    }
    const rows = listRows(parameters, def.listParam);
    const row = rows[index ?? 0];
    if (!row) return '';
    return String(row[def.targetParam] ?? '').trim();
}

function writeTargetId(
    taskType: string,
    def: ListWireOutput | ParamWireOutput,
    parameters: Record<string, unknown>,
    targetTaskId: string | null,
    index?: number,
): Record<string, unknown> {
    if (def.kind === 'param') {
        return injectParameterType(taskType, {
            ...parameters,
            [def.paramKey]: targetTaskId ?? '',
        });
    }
    const rows = listRows(parameters, def.listParam);
    const nextRows = rows.map((row, i) =>
        i === index ? { ...row, [def.targetParam]: targetTaskId ?? '' } : row,
    );
    return injectParameterType(taskType, { ...parameters, [def.listParam]: nextRows });
}

function outputLabel(
    def: ListWireOutput | ParamWireOutput,
    parameters: Record<string, unknown>,
    index?: number,
): string {
    if (def.kind === 'param') return def.label;
    const rows = listRows(parameters, def.listParam);
    const row = rows[index ?? 0];
    const fromField = row ? String(row[def.labelField] ?? '').trim() : '';
    return fromField || def.fallbackLabel(index ?? 0);
}

export function resolveWireTargetHandle(sourceType: string, sourceHandle: string): string {
    const match = findOutputDef(getWiring(sourceType), sourceHandle);
    return match?.def.targetHandle ?? MAIN_IN;
}

export function resolvePluginHandles(data: TaskNodeData): {
    sources: Array<{ id: string; label: string; color: string }>;
    targets: Array<{ id: string; label: string }>;
} {
    const wiring = getWiring(data.type);
    const sources: Array<{ id: string; label: string; color: string }> = [];
    const targets: WireHandle[] = [];

    if (hasMainFlowIn(wiring)) {
        targets.push(MAIN_FLOW_INPUT);
    }
    for (const input of wiring.inputs ?? []) {
        if ('kind' in input) continue;
        targets.push(input);
    }

    for (const output of wiring.outputs) {
        if (output.kind === 'param') {
            sources.push({ id: output.handleId, label: output.label, color: output.color });
        } else {
            const rows = listRows(data.parameters, output.listParam);
            const count = Math.max(rows.length, 1);
            for (let i = 0; i < count; i++) {
                sources.push({
                    id: listHandleId(output, i),
                    label: outputLabel(output, data.parameters, i),
                    color: output.color,
                });
            }
        }
    }

    if (hasMainFlowOut(wiring)) {
        sources.push({
            id: MAIN_FLOW_OUTPUT.id,
            label: MAIN_FLOW_OUTPUT.label,
            color: MAIN_FLOW_OUTPUT.color ?? '#2170e4',
        });
    } else if (sources.length === 0) {
        sources.push({ id: MAIN_OUT, label: 'out', color: '#2170e4' });
    }

    return {
        sources,
        targets: targets.map((t) => ({ id: t.id, label: t.label })),
    };
}

function makeRouteEdge(
    source: string,
    sourceHandle: string,
    target: string,
    targetHandle: string,
    data: RouteEdgeData,
): Edge {
    return {
        id: `${ROUTE_EDGE_PREFIX}${source}:${sourceHandle}->${target}`,
        source,
        sourceHandle,
        target,
        targetHandle,
        type: 'route',
        className: 'studio-edge',
        animated: false,
        markerEnd: studioRouteMarkerEnd(data.routeKind),
        data,
    };
}

export function buildRouteEdgesFromNodes(nodes: StudioCanvasNode[]): Edge[] {
    const edges: Edge[] = [];

    for (const node of getTaskNodes(nodes)) {
        const { taskId, type, parameters } = node.data;
        const wiring = getWiring(type);

        for (const output of wiring.outputs) {
            if (output.kind === 'param') {
                const target = readTargetId(output, parameters);
                if (!target) continue;
                edges.push(
                    makeRouteEdge(taskId, output.handleId, target, output.targetHandle, {
                        label: output.label,
                        routeKind: output.routeKind,
                    }),
                );
            } else {
                const rows = listRows(parameters, output.listParam);
                rows.forEach((_, index) => {
                    const target = readTargetId(output, parameters, index);
                    if (!target) return;
                    edges.push(
                        makeRouteEdge(
                            taskId,
                            listHandleId(output, index),
                            target,
                            output.targetHandle,
                            {
                                label: outputLabel(output, parameters, index),
                                routeKind: output.routeKind,
                            },
                        ),
                    );
                });
            }
        }
    }

    return edges;
}

export function buildJoinConvergeEdges(nodes: StudioCanvasNode[]): Edge[] {
    const edges: Edge[] = [];
    const context = workflowContextFromNodes(nodes);
    const taskIds = new Set(getTaskNodes(nodes).map((node) => node.id));
    const added = new Set<string>();

    const pushConverge = (endTaskId: string, joinTaskId: string) => {
        if (!endTaskId || !joinTaskId || !taskIds.has(endTaskId) || !taskIds.has(joinTaskId)) {
            return;
        }
        const key = `${endTaskId}:${joinTaskId}`;
        if (added.has(key)) return;
        added.add(key);
        edges.push(
            makeRouteEdge(endTaskId, MAIN_OUT, joinTaskId, JOIN_MERGE_IN, {
                routeKind: 'join',
            }),
        );
    };

    for (const node of getTaskNodes(nodes)) {
        if (node.data.type !== 'JOIN') continue;
        const joinData = node.data as TaskNodeData;
        const branchData = resolveLinkedBranchData(joinData, context);
        if (!branchData) continue;

        const rows = listRows(branchData.parameters, 'branches');
        rows.forEach((_, index) => {
            pushConverge(readBranchEndTaskId(branchData, index), joinData.taskId);
        });
    }

    for (const node of getTaskNodes(nodes)) {
        if (node.data.type !== 'BRANCH') continue;
        const branchData = node.data as TaskNodeData;
        const joinTaskId = String(branchData.parameters.joinTaskId ?? '').trim();
        if (!joinTaskId) continue;

        const rows = listRows(branchData.parameters, 'branches');
        rows.forEach((_, index) => {
            pushConverge(readBranchEndTaskId(branchData, index), joinTaskId);
        });
    }

    return edges;
}

export function mergeDisplayEdges(chainEdges: Edge[], nodes: StudioCanvasNode[]): Edge[] {
    const routeEdges = buildRouteEdgesFromNodes(nodes);
    const routeTargetsBySource = new Map<string, Set<string>>();
    for (const edge of routeEdges) {
        if (!edge.target) continue;
        const targets = routeTargetsBySource.get(edge.source) ?? new Set<string>();
        targets.add(edge.target);
        routeTargetsBySource.set(edge.source, targets);
    }

    const types = new Map(
        getTaskNodes(nodes).map((node) => [node.id, (node.data as TaskNodeData).type]),
    );

    const spineEdges = chainEdges.filter((edge) => {
        if (isRouteEdgeId(edge.id) || isStubEdgeId(edge.id)) return false;
        if (edge.target?.startsWith('__')) return false;

        const sourceType = types.get(edge.source ?? '');
        if (sourceType && terminatesMainSpine(sourceType)) return false;

        const routeTargets = routeTargetsBySource.get(edge.source ?? '');
        if (routeTargets?.has(edge.target ?? '')) return false;

        return true;
    });

    return [...spineEdges, ...routeEdges, ...buildJoinConvergeEdges(nodes)];
}

function updateTaskNode(
    nodes: StudioCanvasNode[],
    taskId: string,
    parameters: Record<string, unknown>,
): StudioCanvasNode[] {
    return nodes.map((node) => {
        if (node.type !== 'task' || node.id !== taskId) return node;
        return { ...node, data: { ...(node.data as TaskNodeData), parameters } };
    });
}

function applyBilateral(
    nodes: StudioCanvasNode[],
    rule: BilateralWireRule,
    sourceTaskId: string,
    targetTaskId: string,
    sourceType: string,
    targetType: string,
): StudioCanvasNode[] {
    const sourceData = nodes.find((n) => n.id === sourceTaskId)?.data as TaskNodeData;
    const targetData = nodes.find((n) => n.id === targetTaskId)?.data as TaskNodeData;
    if (!sourceData || !targetData) return nodes;

    let next = updateTaskNode(
        nodes,
        sourceTaskId,
        injectParameterType(sourceType, {
            ...sourceData.parameters,
            [rule.sourceParamKey]: targetTaskId,
        }),
    );
    const updatedTarget = next.find((n) => n.id === targetTaskId)?.data as TaskNodeData;
    next = updateTaskNode(
        next,
        targetTaskId,
        injectParameterType(targetType, {
            ...updatedTarget.parameters,
            [rule.targetParamKey]: sourceTaskId,
        }),
    );
    return next;
}

function matchBilateral(
    wiring: TaskPluginWiring,
    sourceHandle: string,
    targetHandle: string,
): BilateralWireRule | undefined {
    return wiring.bilateral?.find(
        (rule) => rule.sourceHandle === sourceHandle && rule.targetHandle === targetHandle,
    );
}

export function applyGraphConnection(
    connection: Connection,
    nodes: StudioCanvasNode[],
    chainEdges: Edge[] = [],
): StudioCanvasNode[] | null {
    const { source, target, sourceHandle, targetHandle } = connection;
    if (!source || !target || !sourceHandle || !targetHandle || source === target) return null;
    if (target === ADD_TASK_NODE_ID || target === WORKFLOW_START_ID) return null;
    if (source === ADD_TASK_NODE_ID || source === WORKFLOW_START_ID) return null;

    const sourceNode = nodes.find((n) => n.id === source && n.type === 'task');
    const targetNode = nodes.find((n) => n.id === target && n.type === 'task');
    if (!sourceNode || !targetNode) return null;

    const sourceData = sourceNode.data as TaskNodeData;
    const targetData = targetNode.data as TaskNodeData;

    if (
        sourceHandle === ITER_LOOP_OUT &&
        !ITERATOR_NESTED_TYPES.includes(targetData.type as (typeof ITERATOR_NESTED_TYPES)[number])
    ) {
        return null;
    }

    if (targetData.type === 'JOIN' && isJoinMergeInput(targetHandle) && sourceHandle === MAIN_OUT) {
        const context = workflowContextFromNodes(nodes);
        let branchData =
            resolveLinkedBranchData(targetData, context) ??
            findBranchTaskForChainTask(nodes, source, chainEdges);
        if (!branchData) return null;

        const branchIndex = resolveBranchIndexForEndTask(branchData, source, chainEdges);
        if (branchIndex === null) return null;

        let next = updateTaskNode(
            nodes,
            branchData.taskId,
            writeBranchEndTaskId(branchData, branchIndex, source),
        );
        next = syncBranchJoinPair(next, branchData.taskId, targetData.taskId);
        return next;
    }

    const wiring = getWiring(sourceData.type);

    const bilateral = matchBilateral(wiring, sourceHandle, targetHandle);
    if (bilateral) {
        if (bilateral.requireTargetType && targetData.type !== bilateral.requireTargetType) {
            return null;
        }
        return applyBilateral(
            nodes,
            bilateral,
            source,
            target,
            sourceData.type,
            targetData.type,
        );
    }

    const match = findOutputDef(wiring, sourceHandle);
    if (!match || match.def.targetHandle !== targetHandle) return null;

    const nextParams = writeTargetId(
        sourceData.type,
        match.def,
        sourceData.parameters,
        target,
        match.index,
    );
    return updateTaskNode(nodes, source, nextParams);
}

export function applyRouteEdgeRemoval(
    edge: Edge,
    nodes: StudioCanvasNode[],
    chainEdges: Edge[] = [],
): StudioCanvasNode[] | null {
    if (!isRouteEdgeId(edge.id)) return null;
    const { source, sourceHandle, target, targetHandle } = edge;
    if (!source || !sourceHandle) return null;

    if (target && targetHandle && isJoinMergeInput(targetHandle) && sourceHandle === MAIN_OUT) {
        const targetNode = nodes.find((n) => n.id === target && n.type === 'task');
        if (!targetNode) return null;
        const targetData = targetNode.data as TaskNodeData;
        const context = workflowContextFromNodes(nodes);
        const branchData =
            resolveLinkedBranchData(targetData, context) ??
            findBranchTaskForChainTask(nodes, source, chainEdges);
        if (!branchData) return null;

        const branchIndex = resolveBranchIndexForEndTask(branchData, source, chainEdges);
        if (branchIndex === null) return null;

        return updateTaskNode(
            nodes,
            branchData.taskId,
            writeBranchEndTaskId(branchData, branchIndex, null),
        );
    }

    const sourceNode = nodes.find((n) => n.id === source && n.type === 'task');
    if (!sourceNode) return null;
    const sourceData = sourceNode.data as TaskNodeData;
    const wiring = getWiring(sourceData.type);

    if (targetHandle) {
        const bilateral = matchBilateral(wiring, sourceHandle, targetHandle);
        if (bilateral && target) {
            let next = updateTaskNode(
                nodes,
                source,
                injectParameterType(sourceData.type, {
                    ...sourceData.parameters,
                    [bilateral.sourceParamKey]: null,
                }),
            );
            const targetNode = next.find((n) => n.id === target && n.type === 'task');
            if (targetNode) {
                const td = targetNode.data as TaskNodeData;
                next = updateTaskNode(
                    next,
                    target,
                    injectParameterType(td.type, {
                        ...td.parameters,
                        [bilateral.targetParamKey]: null,
                    }),
                );
            }
            return next;
        }
    }

    const match = findOutputDef(wiring, sourceHandle);
    if (!match) return null;

    const nextParams = writeTargetId(
        sourceData.type,
        match.def,
        sourceData.parameters,
        null,
        match.index,
    );
    return updateTaskNode(nodes, source, nextParams);
}

export function isValidPluginConnection(
    connection: Connection,
    nodes: StudioCanvasNode[],
    chainEdges: Edge[] = [],
): boolean {
    return applyGraphConnection(connection, nodes, chainEdges) !== null;
}
