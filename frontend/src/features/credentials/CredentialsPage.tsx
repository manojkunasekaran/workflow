import { useRef } from 'react';
import { PageHeader } from '@/layouts/PageHeader';
import { CredentialsList, type CredentialsListHandle } from '@/features/settings/components/CredentialsList';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';

export default function CredentialsPage() {
    const listRef = useRef<CredentialsListHandle>(null);

    return (
        <div className="flex h-full flex-col bg-background">
            <PageHeader
                title={
                    <h1 data-testid="credentials-page-heading" className="text-sm font-semibold">
                        Credentials
                    </h1>
                }
                actions={
                    <>
                        <Button
                            data-testid="refresh-credentials-btn"
                            variant="outline"
                            size="sm"
                            onClick={() => void listRef.current?.refresh()}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </Button>
                        <Button
                            data-testid="add-credential-btn-header"
                            size="sm"
                            onClick={() => listRef.current?.openCreate()}
                        >
                            <Plus className="h-4 w-4" />
                            Add Credential
                        </Button>
                    </>
                }
            />

            <div className="flex-1 overflow-auto p-6">
                <CredentialsList ref={listRef} />
            </div>
        </div>
    );
}
