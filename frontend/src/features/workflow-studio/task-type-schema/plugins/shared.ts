export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'].map((method) => ({
    label: method,
    value: method,
}));

export const TRANSFORM_OPERATIONS = [
    'JSON_EXTRACT',
    'ARRAY_MAP',
    'OBJECT_MERGE',
    'JSON_PARSE',
    'JSON_STRINGIFY',
    'ARRAY_FILTER',
    'ARRAY_FLATTEN',
    'DATE_FORMAT',
    'XML_TO_JSON',
    'STRING_REPLACE',
    'CALCULATE_HASH',
].map((op) => ({ label: op.replace(/_/g, ' '), value: op }));

export const JOIN_FAILURE_STRATEGIES = [
    {
        label: 'Fail fast',
        value: 'FAIL_FAST',
        description: 'Fail the workflow as soon as any branch fails (default).',
    },
    {
        label: 'Wait for all',
        value: 'WAIT_FOR_ALL',
        description: 'Wait for every branch to finish; succeed if at least one branch succeeded.',
    },
    {
        label: 'Require all',
        value: 'REQUIRE_ALL',
        description: 'All branches must succeed for the workflow to continue.',
    },
] as const;
