import { createContext, useContext } from 'react';
import type { TaskValidationContext } from '@/features/workflow-studio/task-type-schema/types';

const defaultContext: TaskValidationContext = {
    workflowTasks: [],
    taskOrder: [],
};

export const TaskConfigContext = createContext<TaskValidationContext>(defaultContext);

export function useTaskConfigContext(): TaskValidationContext {
    return useContext(TaskConfigContext);
}
