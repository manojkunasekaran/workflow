import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
    buildWorkflowGraphFromContract,
    collectSpawnTree,
    isLeafInbound,
    isValidBranchForkTarget,
    resolveBranchForkWires,
    resolveBranchPaths,
    resolveJoinInbounds,
} from '@/features/workflow-studio/lib/workflowTopology';

interface ContractFixture {
    name: string;
    graph: {
        tasks: Record<string, { type: string; parameters?: Record<string, unknown> }>;
        chainOut?: Record<string, string>;
        joinInbounds?: Record<string, string[]>;
    };
    expectations: {
        resolveJoinInbounds?: Record<string, string[]>;
        resolveBranchPaths?: Record<
            string,
            Array<{ branchIndex: number; startTaskId: string; tipTaskId: string }>
        >;
        isLeafInbound?: Record<string, boolean>;
        collectSpawnTree?: Record<string, string[]>;
        resolveBranchForkWires?: Array<{
            branchTaskId: string;
            rowIndex: number;
            targetTaskId: string;
            label: string;
            sourceHandle: string;
        }>;
        isValidBranchForkTarget?: Record<string, boolean>;
    };
}

const contractDir = resolve(__dirname, '../../../../../../test-fixtures/workflow-topology');
const fixtures = readdirSync(contractDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
        const raw = readFileSync(join(contractDir, file), 'utf8');
        return JSON.parse(raw) as ContractFixture;
    });

describe('workflowTopology contract fixtures', () => {
    for (const fixture of fixtures) {
        describe(fixture.name, () => {
            const graph = buildWorkflowGraphFromContract(fixture.graph);

            it('resolveJoinInbounds', () => {
                for (const [joinId, expected] of Object.entries(fixture.expectations.resolveJoinInbounds ?? {})) {
                    expect(resolveJoinInbounds(joinId, graph)).toEqual(expected);
                }
            });

            it('resolveBranchPaths', () => {
                for (const [branchId, expected] of Object.entries(fixture.expectations.resolveBranchPaths ?? {})) {
                    expect(resolveBranchPaths(branchId, graph)).toEqual(expected);
                }
            });

            it('isLeafInbound', () => {
                for (const [key, expected] of Object.entries(fixture.expectations.isLeafInbound ?? {})) {
                    const [joinId, inboundId] = key.split(':');
                    expect(isLeafInbound(inboundId, joinId, graph)).toBe(expected);
                }
            });

            it('collectSpawnTree', () => {
                for (const [branchId, expected] of Object.entries(fixture.expectations.collectSpawnTree ?? {})) {
                    const actual = [...collectSpawnTree(branchId, graph)];
                    expect(actual).toEqual(expected);
                }
            });

            it('resolveBranchForkWires', () => {
                const expected = fixture.expectations.resolveBranchForkWires;
                if (!expected) return;
                expect(resolveBranchForkWires(graph)).toEqual(expected);
            });

            it('isValidBranchForkTarget', () => {
                const spineIds = Object.keys(fixture.graph.tasks).filter(
                    (id) => fixture.graph.tasks[id]?.type === 'BRANCH' && id === 'outer',
                );
                for (const [key, expected] of Object.entries(fixture.expectations.isValidBranchForkTarget ?? {})) {
                    const [branchId, targetId] = key.split(':');
                    expect(isValidBranchForkTarget(branchId, targetId, graph, spineIds)).toBe(expected);
                }
            });
        });
    }
});
