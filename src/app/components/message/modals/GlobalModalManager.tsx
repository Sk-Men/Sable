import React from 'react';
import { useAtom } from 'jotai';
import { Overlay, OverlayBackdrop, OverlayCenter, Modal, Box } from 'folds';
import FocusTrap from 'focus-trap-react';
import { MessageReportInternal } from './MessageReport';
import { MessageDeleteInternal } from './MessageDelete';
import { MessageSourceInternal } from './MessageSource';
import { MessageAllReactionInternal } from './MessageReactions';
import { stopPropagation } from '../../../utils/keyboard';
import { modalAtom, ModalType } from '../../../state/modal';
import { MessageReadReceiptInternal } from './MessageReadRecipts';

export function GlobalModalManager() {
    const [modal, setModal] = useAtom(modalAtom);

    if (!modal) return null;

    const close = () => setModal(null);

    return (
        <Overlay open backdrop={<OverlayBackdrop />}>
            <OverlayCenter>
                <FocusTrap
                    focusTrapOptions={{
                        initialFocus: false,
                        onDeactivate: close,
                        clickOutsideDeactivates: true,
                        escapeDeactivates: stopPropagation,
                    }}
                >
                    <Box>
                        {modal.type === ModalType.Report && (
                            <MessageReportInternal room={modal.room} mEvent={modal.mEvent} onClose={close} />
                        )}
                        {modal.type === ModalType.Delete && (
                            <MessageDeleteInternal room={modal.room} mEvent={modal.mEvent} onClose={close} />
                        )}
                        {modal.type === ModalType.Source && (
                            <MessageSourceInternal room={modal.room} mEvent={modal.mEvent} onClose={close} />
                        )}
                        {modal.type === ModalType.Reactions && (
                            <MessageAllReactionInternal room={modal.room} relations={modal.relations} onClose={close} />
                        )}
                        {modal.type === ModalType.ReadReceipts && (
                            <MessageReadReceiptInternal room={modal.room} eventId={modal.eventId} onClose={close} />
                        )}
                    </Box>
                </FocusTrap>
            </OverlayCenter>
        </Overlay>
    );
}