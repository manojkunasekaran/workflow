export type FormFieldType =
    | 'TEXT'
    | 'TEXTAREA'
    | 'EMAIL'
    | 'NUMBER'
    | 'PHONE'
    | 'SELECT'
    | 'MULTI_SELECT'
    | 'RADIO'
    | 'CHECKBOX'
    | 'DATE'
    | 'DATETIME'
    | 'FILE'
    | 'HIDDEN'
    | 'CONSENT'
    | 'SECTION_HEADER';

export type FormLayoutMode = 'STACK' | 'GRID';

export interface FormFieldLayout {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface FormFieldDefinition {
    key: string;
    type: FormFieldType;
    label?: string;
    description?: string;
    required?: boolean;
    placeholder?: string;
    defaultValue?: string;
    options?: string[];
    layout?: FormFieldLayout;
    visibleWhen?: string;
    requiredWhen?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    pii?: boolean;
}

export interface FormPageDefinition {
    pageId?: string;
    title?: string;
    descriptionHtml?: string;
    submitButtonLabel?: string;
    layoutMode?: FormLayoutMode;
    fields: FormFieldDefinition[];
}

export interface FormSchema {
    pages: FormPageDefinition[];
}

export type FormAuthMode = 'PUBLIC';

export interface FormTriggerConfig {
    active?: boolean;
    slug?: string;
    landingPage?: FormSchema;
    authMode?: FormAuthMode;
    completionMessage?: string;
    redirectUrl?: string;
    captchaEnabled?: boolean;
}

export type FormEndType = 'MESSAGE' | 'REDIRECT' | 'CUSTOM_HTML';

export interface FormTaskParameters {
    page?: FormSchema;
    endType?: FormEndType;
    message?: string;
    redirectUrl?: string;
    customHtml?: string;
}

export type FormPublicPhase = 'LANDING' | 'STEP' | 'COMPLETE';

export interface FormPublicView {
    phase: FormPublicPhase;
    workflowName?: string;
    page?: FormPageDefinition;
    sessionToken?: string;
    completionType?: FormEndType;
    completionMessage?: string;
    redirectUrl?: string;
    customHtml?: string;
    executionId?: string;
}

export interface FormSubmitRequest {
    answers: Record<string, unknown>;
    sessionToken?: string;
}

export interface FormSubmitResponse {
    next: FormPublicView;
}

export function defaultLandingFormSchema(): FormSchema {
    return {
        pages: [
            {
                pageId: 'landing',
                title: 'Get started',
                submitButtonLabel: 'Continue',
                fields: [
                    {
                        key: 'email',
                        type: 'EMAIL',
                        label: 'Email',
                        required: true,
                    },
                ],
            },
        ],
    };
}

export function defaultFormPageSchema(): FormSchema {
    return {
        pages: [
            {
                pageId: 'page',
                title: 'Form page',
                submitButtonLabel: 'Submit',
                fields: [
                    {
                        key: 'response',
                        type: 'TEXT',
                        label: 'Your answer',
                        required: true,
                    },
                ],
            },
        ],
    };
}
