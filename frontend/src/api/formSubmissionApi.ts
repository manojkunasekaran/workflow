import axios from 'axios';
import { API_BASE_URL } from '@/api/config';

export interface FormSubmissionStep {
    stepId?: string;
    taskId?: string;
    answers?: Record<string, unknown>;
    submittedAt?: string;
}

export interface FormSubmission {
    id: string;
    workflowDefinitionId: string;
    workflowExecutionId: string;
    environment?: string;
    createdAt?: string;
    updatedAt?: string;
    steps: FormSubmissionStep[];
}

export interface FormSubmissionPage {
    content: FormSubmission[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

export const formSubmissionApi = {
    list: async (workflowDefinitionId: string, page = 0, size = 20): Promise<FormSubmissionPage> => {
        const response = await axios.get<FormSubmissionPage>(
            `${API_BASE_URL}/workflows/${workflowDefinitionId}/form-submissions`,
            { params: { page, size, sort: 'createdAt,desc' } },
        );
        return response.data;
    },
};
