import React, { ReactNode } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import { useAtomValue } from 'jotai';
import { settingsAtom, RightSwipeAction } from '../state/settings';

interface SwipeableChatWrapperProps {
    children: ReactNode;
    onOpenSidebar?: () => void;
    onOpenMembers?: () => void;
    onReply?: () => void;
}

export function SwipeableChatWrapper({
    children,
    onOpenSidebar,
    onOpenMembers,
    onReply
}: SwipeableChatWrapperProps) {
    const settings = useAtomValue(settingsAtom);
    const x = useMotionValue(0);
    const springX = useSpring(x, { stiffness: 400, damping: 40 });

    const bind = useDrag(({ active, movement: [mx], velocity: [vx], direction: [dx] }) => {
        if (!settings.mobileGestures) return;

        if (active) {
            x.set(mx);
        } else {
            const swipeThreshold = 120;
            const velocityThreshold = 0.5;

            if (mx > swipeThreshold || (vx > velocityThreshold && dx > 0)) {
                onOpenSidebar?.();
            } else if (mx < -swipeThreshold || (vx > velocityThreshold && dx < 0)) {
                if (settings.rightSwipeAction === RightSwipeAction.Members) {
                    onOpenMembers?.();
                } else {
                    onReply?.();
                }
            }
            x.set(0);
        }
    }, {
        axis: 'x',
        bounds: { left: -200, right: 200 },
        rubberband: true,
        filterTaps: true,
    });

    return (
        <div
            {...bind()}
            style={{
                touchAction: 'pan-y',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
                height: '100%',
                width: '100%',
            }}
        >
            <motion.div
                style={{
                    x: springX,
                    display: 'flex',
                    flexDirection: 'column',
                    flexGrow: 1,
                    height: '100%',
                }}
            >
                {children}
            </motion.div>
        </div>
    );
}