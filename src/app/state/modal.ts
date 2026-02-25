import { atom } from 'jotai';
import { MatrixEvent, Room } from 'matrix-js-sdk';
import { Relations } from 'matrix-js-sdk/lib/models/relations';

export enum ModalType {
    Delete = 'delete',
    Report = 'report',
    Source = 'source',
    Reactions = 'reactions',
    ReadReceipts = 'read_receipts',
}

export type ModalState =
    | { type: ModalType.Delete; room: Room; mEvent: MatrixEvent }
    | { type: ModalType.Report; room: Room; mEvent: MatrixEvent }
    | { type: ModalType.Source; room: Room; mEvent: MatrixEvent }
    | { type: ModalType.Reactions; room: Room; relations: Relations }
    | { type: ModalType.ReadReceipts; room: Room; eventId: string }
    | null;

export const modalAtom = atom<ModalState>(null);