import type { TaskTypePlugin } from '@/features/workflow-studio/task-type-schema/pluginTypes';
import type { TaskParameterErrors } from '@/features/workflow-studio/task-type-schema/types';
import { TaskFieldRenderer } from './TaskFieldRenderer';

interface TaskParametersFormProps {
    plugin: TaskTypePlugin;
    parameters: Record<string, unknown>;
    onChange: (parameters: Record<string, unknown>) => void;
    errors?: TaskParameterErrors;
}

export function TaskParametersForm({
    plugin,
    parameters,
    onChange,
    errors = {},
}: TaskParametersFormProps) {
    return (
        <div className="space-y-5">
            {plugin.fields.map((field) => (
                <TaskFieldRenderer
                    key={field.key}
                    field={field}
                    parameters={parameters}
                    onChange={onChange}
                    error={errors[field.key]}
                    fieldErrors={errors}
                />
            ))}
        </div>
    );
}
