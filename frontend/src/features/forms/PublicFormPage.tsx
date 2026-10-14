import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { fetchPublicForm, submitPublicForm } from '@/api/formPublicApi';
import { FormRenderer } from '@/features/forms/FormRenderer';
import type { FormPublicView } from '@/types/form';
import { Loader2 } from 'lucide-react';

export default function PublicFormPage() {
    const { slug } = useParams<{ slug: string }>();
    const [searchParams] = useSearchParams();
    const testMode = searchParams.get('test') === '1';

    const [view, setView] = useState<FormPublicView | null>(null);
    const [sessionToken, setSessionToken] = useState<string | undefined>();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!slug) return;
        setLoading(true);
        setError(null);
        try {
            const data = await fetchPublicForm(slug, testMode);
            setView(data);
            setSessionToken(data.sessionToken);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load form');
        } finally {
            setLoading(false);
        }
    }, [slug, testMode]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleSubmit = async (answers: Record<string, unknown>) => {
        if (!slug) return;
        const res = await submitPublicForm(slug, testMode, { answers, sessionToken });
        setView(res.next);
        setSessionToken(res.next.sessionToken);
        if (res.next.completionType === 'REDIRECT' && res.next.redirectUrl) {
            window.location.href = res.next.redirectUrl;
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !view) {
        return (
            <div className="flex min-h-screen items-center justify-center p-6">
                <p className="text-destructive text-sm">{error ?? 'Form not found'}</p>
            </div>
        );
    }

    if (view.phase === 'COMPLETE') {
        if (view.completionType === 'REDIRECT' && view.redirectUrl) {
            window.location.href = view.redirectUrl;
            return null;
        }
        return (
            <div className="mx-auto max-w-lg p-8 space-y-4">
                {testMode ? (
                    <p className="text-xs font-medium text-amber-700 bg-amber-500/10 px-2 py-1 rounded">Test mode</p>
                ) : null}
                {view.completionType === 'CUSTOM_HTML' && view.customHtml ? (
                    <div
                        className="prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: view.customHtml }}
                    />
                ) : (
                    <>
                        <h1 className="text-xl font-semibold">Thank you</h1>
                        <p className="text-muted-foreground">
                            {view.completionMessage ?? 'Your response has been recorded.'}
                        </p>
                    </>
                )}
            </div>
        );
    }

    if (!view.page) {
        return null;
    }

    return (
        <div className="mx-auto max-w-2xl p-6 md:p-10">
            {testMode ? (
                <p className="text-xs font-medium text-amber-700 bg-amber-500/10 px-2 py-1 rounded mb-4">Test mode</p>
            ) : null}
            {view.workflowName ? (
                <p className="text-xs text-muted-foreground mb-2">{view.workflowName}</p>
            ) : null}
            <FormRenderer page={view.page} submitLabel={view.page.submitButtonLabel} onSubmit={handleSubmit} />
        </div>
    );
}
