import { Shuffle } from 'lucide-react';
import { defineTaskPlugin } from '../pluginTypes';
import { TRANSFORM_OPERATIONS } from './shared';

export const dataTransformTaskPlugin = defineTaskPlugin({
    type: 'DATA_TRANSFORM',
    label: 'Data Transform',
    icon: Shuffle,
    accentColor: '#7c3aed',
    defaultTaskId: 'transform_task',
    fields: [
        {
            key: 'operation',
            label: 'Operation',
            type: 'select',
            defaultValue: 'JSON_EXTRACT',
            options: TRANSFORM_OPERATIONS,
        },
        {
            key: 'inputData',
            label: 'Input data',
            type: 'text',
            mono: true,
            placeholder: '{{$tasks.previous_task.body}}',
        },
        {
            key: 'expression',
            label: 'Expression',
            type: 'textarea',
            mono: true,
            rows: 4,
            placeholder: '$.users[?(@.active==true)].email',
        },
    ],
    preview(params) {
        return { primary: String(params.operation ?? 'JSON_EXTRACT').replace(/_/g, ' ') };
    },
});
