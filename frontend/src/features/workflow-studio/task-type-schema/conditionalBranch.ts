import type { TaskParameterErrors, TaskValidationContext } from './types';

export type ConditionalConditionMode = 'expression' | 'rules';

export interface RuleConditionRow {
    field: string;
    operator: string;
    value: string;
    negated: boolean;
}

export interface RuleGroupRow {
    operator: 'AND' | 'OR';
    conditions: RuleConditionRow[];
    nestedGroups: RuleGroupRow[];
}

export interface ConditionalBranchRow {
    name: string;
    conditionMode: ConditionalConditionMode;
    expression: string;
    rules: RuleGroupRow;
    nextTaskId: string;
}

export const RULE_OPERATORS = [
    { value: 'EQUALS', label: 'equals' },
    { value: 'NOT_EQUALS', label: 'not equals' },
    { value: 'IS_NULL', label: 'is null' },
    { value: 'IS_NOT_NULL', label: 'is not null' },
    { value: 'IS_TRUE', label: 'is true' },
    { value: 'IS_FALSE', label: 'is false' },
    { value: 'IS_EMPTY', label: 'is empty' },
    { value: 'IS_NOT_EMPTY', label: 'is not empty' },
    { value: 'CONTAINS', label: 'contains' },
    { value: 'NOT_CONTAINS', label: 'not contains' },
    { value: 'STARTS_WITH', label: 'starts with' },
    { value: 'ENDS_WITH', label: 'ends with' },
    { value: 'MATCHES_REGEX', label: 'matches regex' },
    { value: 'GREATER_THAN', label: 'greater than' },
    { value: 'GREATER_OR_EQUAL', label: 'greater or equal' },
    { value: 'LESS_THAN', label: 'less than' },
    { value: 'LESS_OR_EQUAL', label: 'less or equal' },
    { value: 'BETWEEN', label: 'between' },
    { value: 'NOT_BETWEEN', label: 'not between' },
    { value: 'IN', label: 'in list' },
    { value: 'NOT_IN', label: 'not in list' },
    { value: 'ARRAY_CONTAINS', label: 'array contains' },
    { value: 'ARRAY_SIZE_EQUALS', label: 'array size equals' },
    { value: 'ARRAY_SIZE_GREATER_THAN', label: 'array size greater than' },
    { value: 'ARRAY_SIZE_LESS_THAN', label: 'array size less than' },
] as const;

const VALUE_OPTIONAL_OPERATORS = new Set([
    'IS_NULL',
    'IS_NOT_NULL',
    'IS_TRUE',
    'IS_FALSE',
    'IS_EMPTY',
    'IS_NOT_EMPTY',
]);

const LIST_VALUE_OPERATORS = new Set(['BETWEEN', 'NOT_BETWEEN', 'IN', 'NOT_IN']);

export function operatorNeedsValue(operator: string): boolean {
    return !VALUE_OPTIONAL_OPERATORS.has(operator);
}

export function defaultRuleCondition(): RuleConditionRow {
    return { field: '', operator: 'EQUALS', value: '', negated: false };
}

export function defaultRuleGroup(): RuleGroupRow {
    return { operator: 'AND', conditions: [defaultRuleCondition()], nestedGroups: [] };
}

export function defaultConditionalBranch(index = 0): ConditionalBranchRow {
    return {
        name: index === 0 ? 'If' : `Else if ${index}`,
        conditionMode: 'expression',
        expression: '',
        rules: defaultRuleGroup(),
        nextTaskId: '',
    };
}

function isRuleGroupEmpty(group: RuleGroupRow | null | undefined): boolean {
    if (!group) return true;
    const hasConditions = group.conditions.some((c) => c.field.trim());
    return !hasConditions && group.nestedGroups.length === 0;
}

function parseRuleCondition(raw: unknown): RuleConditionRow {
    if (!raw || typeof raw !== 'object') return defaultRuleCondition();
    const row = raw as Record<string, unknown>;
    return {
        field: String(row.field ?? ''),
        operator: String(row.operator ?? 'EQUALS'),
        value: formatConditionValue(row.value),
        negated: Boolean(row.negated),
    };
}

function formatConditionValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value) || typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}

function parseRuleGroup(raw: unknown): RuleGroupRow {
    if (!raw || typeof raw !== 'object') return defaultRuleGroup();
    const group = raw as Record<string, unknown>;
    const conditions = Array.isArray(group.conditions)
        ? group.conditions.map(parseRuleCondition)
        : [defaultRuleCondition()];
    return {
        operator: group.operator === 'OR' ? 'OR' : 'AND',
        conditions: conditions.length > 0 ? conditions : [defaultRuleCondition()],
        nestedGroups: [],
    };
}

export function parseConditionalBranches(value: unknown): ConditionalBranchRow[] {
    if (!Array.isArray(value) || value.length === 0) {
        return [defaultConditionalBranch(0)];
    }

    return value.map((item, index) => {
        if (!item || typeof item !== 'object') {
            return defaultConditionalBranch(index);
        }
        const row = item as Record<string, unknown>;
        const rules = parseRuleGroup(row.rules);
        const hasRules = row.rules != null && !isRuleGroupEmpty(rules);
        const expression = String(row.expression ?? '');

        return {
            name: String(row.name ?? `Branch ${index + 1}`),
            conditionMode: hasRules && !expression.trim() ? 'rules' : 'expression',
            expression,
            rules,
            nextTaskId: String(row.nextTaskId ?? ''),
        };
    });
}

function parseConditionValue(operator: string, value: string): unknown {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (LIST_VALUE_OPERATORS.has(operator)) {
        try {
            return JSON.parse(trimmed);
        } catch {
            if (operator === 'BETWEEN' || operator === 'NOT_BETWEEN') {
                const parts = trimmed.split(',').map((part) => part.trim());
                if (parts.length === 2) {
                    return parts.map((part) => (Number.isNaN(Number(part)) ? part : Number(part)));
                }
            }
            if (operator === 'IN' || operator === 'NOT_IN') {
                return trimmed.split(',').map((part) => part.trim());
            }
        }
    }
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        return Number(trimmed);
    }
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    return trimmed;
}

export function normalizeRuleGroupForApi(group: RuleGroupRow): Record<string, unknown> {
    const conditions = group.conditions
        .filter((condition) => condition.field.trim())
        .map((condition) => ({
            field: condition.field.trim(),
            operator: condition.operator,
            value: operatorNeedsValue(condition.operator)
                ? parseConditionValue(condition.operator, condition.value)
                : null,
            negated: condition.negated,
        }));

    return {
        operator: group.operator,
        conditions,
        nestedGroups: [],
    };
}

export function normalizeConditionalBranchesForApi(
    branches: ConditionalBranchRow[],
): Array<Record<string, unknown>> {
    return branches.map((branch) => {
        const base = {
            name: branch.name.trim(),
            nextTaskId: branch.nextTaskId.trim() || null,
        };

        if (branch.conditionMode === 'rules') {
            return {
                ...base,
                expression: null,
                rules: normalizeRuleGroupForApi(branch.rules),
            };
        }

        return {
            ...base,
            expression: branch.expression.trim(),
            rules: null,
        };
    });
}

function findWorkflowTask(context: TaskValidationContext | undefined, taskId: string) {
    return context?.workflowTasks.find((task) => task.taskId === taskId);
}

export function validateConditionalParameters(
    parameters: Record<string, unknown>,
    errors: TaskParameterErrors,
    context?: TaskValidationContext,
): void {
    const branches = parameters.branches;
    if (!Array.isArray(branches) || branches.length === 0) {
        errors.branches = 'At least one condition branch is required';
        return;
    }

    const names = new Set<string>();

    for (let i = 0; i < branches.length; i++) {
        const entry = branches[i];
        if (!entry || typeof entry !== 'object') {
            errors[`branches.${i}`] = 'Invalid branch entry';
            continue;
        }

        const row = entry as ConditionalBranchRow;
        const name = String(row.name ?? '').trim();
        const nextTaskId = String(row.nextTaskId ?? '').trim();

        if (!name) {
            errors[`branches.${i}.name`] = 'Branch name is required';
        } else if (names.has(name)) {
            errors[`branches.${i}.name`] = 'Branch names must be unique';
        } else {
            names.add(name);
        }

        if (nextTaskId && context) {
            if (nextTaskId === context.currentTaskId) {
                errors[`branches.${i}.nextTaskId`] = 'Cannot route to the conditional task itself';
            } else if (!findWorkflowTask(context, nextTaskId)) {
                errors[`branches.${i}.nextTaskId`] = 'Task not found in this workflow';
            }
        }

        if (row.conditionMode === 'expression') {
            if (!String(row.expression ?? '').trim() && !context?.isNewTask) {
                errors[`branches.${i}.expression`] = 'SpEL expression is required';
            }
            continue;
        }

        const activeConditions = row.rules?.conditions?.filter((c) => c.field.trim()) ?? [];
        if (activeConditions.length === 0 && !context?.isNewTask) {
            errors[`branches.${i}.rules`] = 'Add at least one rule condition';
            continue;
        }

        for (let j = 0; j < activeConditions.length; j++) {
            const condition = activeConditions[j];
            if (!condition.operator) {
                errors[`branches.${i}.rules.${j}.operator`] = 'Operator is required';
            }
            if (operatorNeedsValue(condition.operator) && !String(condition.value ?? '').trim()) {
                errors[`branches.${i}.rules.${j}.value`] = 'Value is required for this operator';
            }
            if (LIST_VALUE_OPERATORS.has(condition.operator) && condition.value.trim()) {
                const parsed = parseConditionValue(condition.operator, condition.value);
                if (
                    (condition.operator === 'BETWEEN' || condition.operator === 'NOT_BETWEEN') &&
                    (!Array.isArray(parsed) || parsed.length !== 2)
                ) {
                    errors[`branches.${i}.rules.${j}.value`] =
                        'Use two values, e.g. [1, 100] or min, max';
                }
            }
        }
    }

    const defaultNext = parameters.defaultNextTaskId;
    if (!isEmptyOptionalRef(defaultNext) && context) {
        const defaultId = String(defaultNext).trim();
        if (defaultId === context.currentTaskId) {
            errors.defaultNextTaskId = 'Cannot route to the conditional task itself';
        } else if (!findWorkflowTask(context, defaultId)) {
            errors.defaultNextTaskId = 'Task not found in this workflow';
        }
    }
}

function isEmptyOptionalRef(value: unknown): boolean {
    return value === undefined || value === null || value === '';
}
