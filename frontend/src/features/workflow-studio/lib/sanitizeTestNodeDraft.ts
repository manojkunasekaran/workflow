import type { WorkflowDefinition } from '@/types/api';
import { isExpression } from '@/features/workflow-studio/lib/variableExplorer';

const SECRET_PARAMETER_KEYS = new Set([
    'smtpPassword',
    'password',
    'apiKey',
    'token',
    'accessToken',
    'clientSecret',
]);

function redactTaskParameters(parameters: Record<string, unknown>): Record<string, unknown> {
    const next: Record<string, unknown> = { ...parameters };
    for (const key of Object.keys(next)) {
        if (SECRET_PARAMETER_KEYS.has(key)) {
            const value = next[key];
            if (typeof value === 'string' && value.trim() && !isExpression(value)) {
                delete next[key];
            }
        }
    }
    return next;
}

/** Strip cleartext secrets from a draft before POST /workflows/test-node. */
export function sanitizeWorkflowDefinitionForTestNode(
    definition: WorkflowDefinition,
): WorkflowDefinition {
    const tasks = definition.tasks.map((task) => ({
        ...task,
        parameters: redactTaskParameters(task.parameters ?? {}),
    }));

    let trigger = definition.trigger;
    if (trigger?.webhook?.inbound?.secret) {
        trigger = {
            ...trigger,
            webhook: {
                ...trigger.webhook,
                inbound: {
                    ...trigger.webhook.inbound,
                    secret: undefined,
                },
            },
        };
    }

    return { ...definition, tasks, trigger };
}
