import { useMotionValue, useSpring, useTransform, motion } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import React, { useState } from 'react';
import { useAtomValue } from 'jotai';
import { config, Icon, Icons } from 'folds';
import { mobileOrTablet } from '../utils/user-agent';
import { RightSwipeAction, settingsAtom } from '../state/settings';

export function SwipeableMessageWrapper({
    children,
    onReply,
    messageId,
    itemIndex
}: {
    children: React.ReactNode;
    onReply: () => void;
    messageId: string;
    itemIndex: number;
}) {
    const settings = useAtomValue(settingsAtom);
    const x = useMotionValue(0);
    const springX = useSpring(x, { stiffness: 400, damping: 40 });
    const [isReady, setIsReady] = useState(false);

    const iconOpacity = useTransform(x, [0, -8], [0, 1]);

    const isSwipeToReplyEnabled =
        settings.mobileGestures &&
        mobileOrTablet() &&
        settings.rightSwipeAction !== RightSwipeAction.Members;

    const bind = useDrag(({ active, movement: [mx] }) => {
        if (!isSwipeToReplyEnabled) return;

        if (active) {
            const val = mx < 0 ? mx : 0;
            x.set(Math.max(-80, val));
            setIsReady(mx < -50);
        } else {
            if (mx < -50) {
                if ('vibrate' in navigator) navigator.vibrate(10);
                onReply();
            }
            x.set(0);
            setIsReady(false);
        }
    }, {
        axis: 'x',
        bounds: { right: 0 },
        rubberband: true,
        filterTaps: true,
        pointer: { capture: true }
    });

    if (!settings.mobileGestures || !mobileOrTablet()) {
        return (
            <div data-message-id={messageId} data-message-item={itemIndex}>
                {children}
            </div>
        );
    }

    return (
        <div
            {...bind()}
            data-message-id={messageId}
            data-message-item={itemIndex}
            style={{ position: 'relative', touchAction: 'pan-y' }}
        >
            <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: 0,
                paddingRight: config.space.S400,
                display: 'flex',
                alignItems: 'center',
                zIndex: 0,
            }}>
                <motion.div style={{ opacity: iconOpacity }}>
                    <Icon
                        src={Icons.ReplyArrow}
                        size="400"
                        style={{
                            color: isReady ? 'var(--sable-surface-on-container)' : 'var(--sable-surface-container)',
                            transition: 'color 0.2s'
                        }}
                    />
                </motion.div>
            </div>

            <motion.div style={{
                x: springX,
                background: 'var(--sable-surface-container)',
                position: 'relative',
                zIndex: 1
            }}>
                {children}
            </motion.div>
        </div>
    );
}