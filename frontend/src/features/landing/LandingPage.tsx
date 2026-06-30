import { PageHeader } from '@/layouts/PageHeader';

export default function LandingPage() {
    return (
        <div className="flex h-full flex-col bg-background">
            <PageHeader title={<h1 className="text-sm font-semibold">Home</h1>} />
            <div className="flex-1 p-6" />
        </div>
    );
}
