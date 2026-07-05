import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';
import { MAIN_OUT } from '@/features/workflow-studio/lib/graphHandles';
import { EdgePortHandle } from '@/features/workflow-studio/nodes/EdgePortHandle';
import { StudioNodeShell } from '@/features/workflow-studio/nodes/StudioNodeShell';
import { useCanvasActions } from '@/features/workflow-studio/CanvasActionsContext';
import { TRIGGER_ACCENT_COLOR } from '@/features/workflow-studio/constants/studioNodeTheme';
import { studioIconBoxHeight, studioTaskNodeHeight } from '@/features/workflow-studio/constants/taskNodeLayout';

const ICON_BOX_HEIGHT = studioIconBoxHeight(1, false);
const TOTAL_HEIGHT = studioTaskNodeHeight(1, false);

export type StartNodeData = {
    label: string;
    showAdd?: boolean;
};

function StartNodeComponent({ data, selected }: NodeProps & { data: StartNodeData }) {
    const { onAddTaskClick } = useCanvasActions();

    return (
        <StudioNodeShell
            iconBoxHeight={ICON_BOX_HEIGHT}
            totalHeight={TOTAL_HEIGHT}
            accentColor={TRIGGER_ACCENT_COLOR}
            icon={Play}
            iconClassName="fill-current"
            label={data.label}
            selected={selected}
        >
            <EdgePortHandle
                type="source"
                side="right"
                id={MAIN_OUT}
                top="50%"
                onAddClick={data.showAdd && onAddTaskClick ? () => onAddTaskClick() : undefined}
            />
        </StudioNodeShell>
    );
}

export const StartNode = memo(StartNodeComponent);

/** @deprecated Use studioTaskNodeHeight — kept for any external imports. */
export const START_NODE_HEIGHT = TOTAL_HEIGHT;
