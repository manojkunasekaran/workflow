import { PageHeader } from '@/layouts/PageHeader';
import { CredentialsList } from '@/features/settings/components/CredentialsList';
import { ShieldCheck } from 'lucide-react';

export default function CredentialsPage() {
    return (
        <div className="flex h-full flex-col bg-background">
            <PageHeader
                title={
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        <h1 data-testid="credentials-page-heading" className="text-sm font-semibold">
                            Credentials
                        </h1>
                    </div>
                }
            />

            <div className="flex-1 overflow-auto p-6">
                <CredentialsList />
            </div>
        </div>
    );
}
