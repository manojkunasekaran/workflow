import Tippy from '@tippyjs/react';
import type { ReactElement, ReactNode } from 'react';
import type { Placement } from 'tippy.js';

type TippyHintProps = {
    content: ReactNode;
    children: ReactElement;
    placement?: Placement;
};

/** Styled Tippy tooltip — replaces native browser `title` hints. */
export function TippyHint({ content, children, placement = 'top' }: TippyHintProps) {
    if (content === null || content === undefined || content === '') return children;

    return (
        <Tippy
            content={content}
            placement={placement}
            delay={[350, 0]}
            arrow
            theme="studio"
            zIndex={10000}
        >
            {children}
        </Tippy>
    );
}
