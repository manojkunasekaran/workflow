import { PageHeader } from '@/layouts/PageHeader';
import { useNavigate } from 'react-router-dom';
import { Activity, Settings, FileText } from 'lucide-react';

export default function LandingPage() {
    const navigate = useNavigate();

    const options = [
        {
            title: 'Workflows',
            description: 'Design and manage your automation pipelines',
            icon: <FileText className="h-5 w-5 text-primary" />,
            path: '/workflows',
        },
        {
            title: 'Executions',
            description: 'Monitor running and past workflow executions',
            icon: <Activity className="h-5 w-5 text-primary" />,
            path: '/executions',
        },
        {
            title: 'Settings',
            description: 'Configure environment and check API health',
            icon: <Settings className="h-5 w-5 text-primary" />,
            path: '/settings',
        }
    ];

    return (
        <div className="flex h-full flex-col studio-dot-grid">
            <PageHeader title={<h1 data-testid="overview-heading" className="text-sm font-semibold">Overview</h1>} />
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="grid w-full max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {options.map((option) => (
                        <button
                            data-testid={`landing-card-${option.title.toLowerCase()}`}
                            key={option.title}
                            onClick={() => navigate(option.path)}
                            className="group flex flex-col items-start rounded-2xl border border-border/50 bg-card p-8 text-left transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        >
                            <div className="mb-5 inline-flex items-center justify-center rounded-xl bg-primary/10 p-3.5 transition-colors group-hover:bg-primary/20">
                                {option.icon}
                            </div>
                            <h2 className="mb-2 text-xl font-semibold tracking-tight">{option.title}</h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">{option.description}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
