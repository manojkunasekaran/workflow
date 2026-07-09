import { useNavigate, useParams } from 'react-router-dom';
import { ExecutionView } from '@/features/executions/ExecutionView';

export default function ExecutionDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    if (!id) {
        return null;
    }

    return (
        <ExecutionView
            executionId={id}
            onBack={() => navigate('/executions')}
        />
    );
}
