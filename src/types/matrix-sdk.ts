import { MatrixClient, ICreateClientOpts } from 'matrix-js-sdk/lib/client';
import { MatrixScheduler } from 'matrix-js-sdk/lib/scheduler';
import { MemoryStore } from 'matrix-js-sdk/lib/store/memory';
import { MemoryCryptoStore } from 'matrix-js-sdk/lib/crypto/store/memory-crypto-store';

// App-facing Matrix SDK import boundary.
// Import Matrix symbols from this module instead of matrix-js-sdk directly.
export * from 'matrix-js-sdk/lib/client';
export * from 'matrix-js-sdk/lib/serverCapabilities';
export * from 'matrix-js-sdk/lib/http-api/index';
export * from 'matrix-js-sdk/lib/autodiscovery';
export * from 'matrix-js-sdk/lib/errors';
export * from 'matrix-js-sdk/lib/interactive-auth';
export * from 'matrix-js-sdk/lib/content-repo';
export * from 'matrix-js-sdk/lib/sync';
export * from 'matrix-js-sdk/lib/sync-accumulator';
<<<<<<< HEAD
export * from 'matrix-js-sdk/lib/sliding-sync';
export { createClient } from 'matrix-js-sdk/lib/matrix';
=======

const amendClientOpts = (opts: ICreateClientOpts): ICreateClientOpts => ({
  ...opts,
  store: opts.store ?? new MemoryStore({ localStorage: globalThis.localStorage }),
  scheduler: opts.scheduler ?? new MatrixScheduler(),
  cryptoStore: opts.cryptoStore ?? new MemoryCryptoStore(),
});

// Intentionally avoid importing createClient from matrix-js-sdk/lib/matrix to sidestep
// a production bundling init-order bug involving RoomWidgetClient re-exports.
export const createClient = (opts: ICreateClientOpts): MatrixClient =>
  new MatrixClient(amendClientOpts(opts));
>>>>>>> origin

export * from 'matrix-js-sdk/lib/models/event';
export * from 'matrix-js-sdk/lib/models/room';
export * from 'matrix-js-sdk/lib/models/room-member';
export * from 'matrix-js-sdk/lib/models/room-state';
export * from 'matrix-js-sdk/lib/models/user';
export * from 'matrix-js-sdk/lib/models/search-result';
export * from 'matrix-js-sdk/lib/models/event-timeline';
export * from 'matrix-js-sdk/lib/models/event-timeline-set';
export { Relations, RelationsEvent } from 'matrix-js-sdk/lib/models/relations';

export * from 'matrix-js-sdk/lib/store/indexeddb';
export * from 'matrix-js-sdk/lib/crypto/store/indexeddb-crypto-store';
export * from 'matrix-js-sdk/lib/crypto-api/index';

export * from 'matrix-js-sdk/lib/@types/common';
export * from 'matrix-js-sdk/lib/@types/uia';
export * from 'matrix-js-sdk/lib/@types/event';
export * from 'matrix-js-sdk/lib/@types/events';
export * from 'matrix-js-sdk/lib/@types/PushRules';
export * from 'matrix-js-sdk/lib/@types/partials';
export * from 'matrix-js-sdk/lib/@types/requests';
export * from 'matrix-js-sdk/lib/@types/search';
export * from 'matrix-js-sdk/lib/@types/state_events';
export * from 'matrix-js-sdk/lib/@types/location';
export * from 'matrix-js-sdk/lib/@types/auth';
export * from 'matrix-js-sdk/lib/@types/spaces';
export * from 'matrix-js-sdk/lib/@types/read_receipts';
export * from 'matrix-js-sdk/lib/@types/membership';
export * from 'matrix-js-sdk/lib/@types/registration';

export * from 'matrix-js-sdk/lib/oidc/validate';
export { VerificationMethod } from 'matrix-js-sdk/lib/types';
export * from 'matrix-js-sdk/lib/pushprocessor';
export * from 'matrix-js-sdk/lib/common-crypto/CryptoBackend';

export * from 'matrix-js-sdk/lib/matrixrtc/CallMembership';
export * from 'matrix-js-sdk/lib/matrixrtc/MatrixRTCSession';
