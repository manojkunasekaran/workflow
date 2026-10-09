type RetryFailedInsightsConfirmDescriptionProps = {
    scope: 'integration' | 'use-case';
    failedCount: number;
};

export function RetryFailedInsightsConfirmDescription({
    scope,
    failedCount,
}: RetryFailedInsightsConfirmDescriptionProps) {
    return (
        <div className="space-y-3">
            <p>
                Confirm only if you want to <strong className="font-medium text-foreground">start new workflow runs</strong>{' '}
                for failures in this scope.
            </p>
            <div>
                <p className="font-medium text-foreground">What this will do</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5">
                    <li>Create <strong className="font-medium text-foreground">new</strong> executions for failed runs (failed history is kept).</li>
                    <li>Use the <strong className="font-medium text-foreground">same trigger inputs</strong> as each failed run.</li>
                    <li>Process the <strong className="font-medium text-foreground">most recent</strong> failures first.</li>
                    <li>
                        {scope === 'integration'
                            ? 'Include all use cases assigned to this integration.'
                            : 'Include only this use case (this workflow).'}
                    </li>
                </ul>
            </div>
            {failedCount > 0 ? (
                <p>
                    Failed runs in scope right now:{' '}
                    <strong className="font-medium text-foreground">{failedCount}</strong>
                </p>
            ) : null}
        </div>
    );
}
