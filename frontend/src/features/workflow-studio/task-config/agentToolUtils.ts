import type { AgentTool, AgentToolSource, McpToolDescriptor } from '@/types/api';

export function isMcpTool(tool: AgentTool | Record<string, unknown>): boolean {
    const sourceType = tool.sourceType as AgentToolSource | undefined;
    const credentialId = String(tool.credentialId ?? '').trim();
    return sourceType === 'MCP' || credentialId.length > 0;
}

export function isTaskTool(tool: AgentTool | Record<string, unknown>): boolean {
    return !isMcpTool(tool);
}

export function parseAgentTools(value: unknown): AgentTool[] {
    if (!Array.isArray(value) || value.length === 0) {
        return [];
    }
    return value.map((item, index) => {
        if (!item || typeof item !== 'object') {
            return {
                name: `tool_${index + 1}`,
                description: '',
                targetTaskId: '',
                inputSchema: { type: 'object', properties: {} },
                sourceType: 'TASK' as AgentToolSource,
            };
        }
        const row = item as Record<string, unknown>;
        const mcp = isMcpTool(row);
        return {
            name: String(row.name ?? ''),
            description: String(row.description ?? ''),
            targetTaskId: mcp ? undefined : String(row.targetTaskId ?? ''),
            inputSchema: (row.inputSchema as Record<string, unknown>) || { type: 'object', properties: {} },
            sourceType: mcp ? 'MCP' : ('TASK' as AgentToolSource),
            credentialId: mcp ? String(row.credentialId ?? '') : undefined,
            remoteToolName: mcp ? String(row.remoteToolName ?? '') : undefined,
        };
    });
}

/** Mirrors backend AgentsTaskParameters.credentialNameSlug */
export function credentialNameSlug(credentialName: string | undefined): string {
    if (!credentialName || !credentialName.trim()) {
        return 'mcp';
    }
    const slug = credentialName.toLowerCase().replace(/ /g, '_');
    return slug.length > 32 ? slug.substring(0, 32) : slug;
}

export function resolveLlmToolName(tool: AgentTool, credentialName?: string): string {
    if (isMcpTool(tool)) {
        const slug = credentialNameSlug(credentialName);
        return `${slug}__${tool.remoteToolName ?? ''}`;
    }
    return tool.name;
}

export function mcpToolKey(credentialId: string, remoteToolName: string): string {
    return `${credentialId}::${remoteToolName}`;
}

export function buildMcpToolFromDescriptor(
    credentialId: string,
    credentialName: string,
    descriptor: McpToolDescriptor,
): AgentTool {
    const slug = credentialNameSlug(credentialName);
    return {
        sourceType: 'MCP',
        credentialId,
        remoteToolName: descriptor.name,
        name: `${slug}__${descriptor.name}`,
        description: descriptor.description ?? '',
        inputSchema: descriptor.inputSchema ?? { type: 'object', properties: {} },
    };
}
