/// <reference lib="WebWorker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { EventType } from 'matrix-js-sdk/lib/@types/event';
import { usePushNotifications } from './sw/pushNotification';

export type {};
declare const self: ServiceWorkerGlobalScope;

let notificationSoundEnabled = true;
const { handlePushNotificationPushData } = usePushNotifications(self, () => ({
  notificationSoundEnabled,
}));

type SessionInfo = {
  accessToken: string;
  baseUrl: string;
};

/**
 * Store session per client (tab)
 */
const sessions = new Map<string, SessionInfo>();

const clientToResolve = new Map<string, (value: SessionInfo | undefined) => void>();
const clientToSessionPromise = new Map<string, Promise<SessionInfo | undefined>>();

async function cleanupDeadClients() {
  const activeClients = await self.clients.matchAll();
  const activeIds = new Set(activeClients.map((c) => c.id));

  Array.from(sessions.keys()).forEach((id) => {
    if (!activeIds.has(id)) {
      sessions.delete(id);
      clientToResolve.delete(id);
      clientToSessionPromise.delete(id);
    }
  });
}

const pendingReplies = new Map();
let messageIdCounter = 0;
function sendAndWaitForReply(client: WindowClient, type: string, payload: object) {
  messageIdCounter += 1;
  const id = messageIdCounter;
  const promise = new Promise((resolve) => {
    pendingReplies.set(id, resolve);
  });
  client.postMessage({ type, id, payload });
  return promise;
}

async function fetchWithRetry(
  url: string,
  token: string,
  retries = 3,
  delay = 250
): Promise<Response> {
  let lastError: Error | undefined;

  /*  eslint-disable no-await-in-loop */
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        console.warn(
          `Fetch attempt ${attempt} failed: ${lastError.message}. Retrying in ${delay}ms...`
        );
        await new Promise((res) => {
          setTimeout(res, delay);
        });
      }
    }
  }
  /*  eslint-enable no-await-in-loop */
  throw new Error(`Fetch failed after ${retries} retries. Last error: ${lastError?.message}`);
}

function setSession(clientId: string, accessToken: unknown, baseUrl: unknown) {
  if (typeof accessToken === 'string' && typeof baseUrl === 'string') {
    sessions.set(clientId, { accessToken, baseUrl });
  } else {
    // Logout or invalid session
    sessions.delete(clientId);
  }

  const resolveSession = clientToResolve.get(clientId);
  if (resolveSession) {
    resolveSession(sessions.get(clientId));
    clientToResolve.delete(clientId);
    clientToSessionPromise.delete(clientId);
  }
}

function requestSession(client: Client): Promise<SessionInfo | undefined> {
  const promise =
    clientToSessionPromise.get(client.id) ??
    new Promise((resolve) => {
      clientToResolve.set(client.id, resolve);
      client.postMessage({ type: 'requestSession' });
    });

  if (!clientToSessionPromise.has(client.id)) {
    clientToSessionPromise.set(client.id, promise);
  }

  return promise;
}

async function requestSessionWithTimeout(
  clientId: string,
  timeoutMs = 3000
): Promise<SessionInfo | undefined> {
  const client = await self.clients.get(clientId);
  if (!client) return undefined;

  const sessionPromise = requestSession(client);

  const timeout = new Promise<undefined>((resolve) => {
    setTimeout(() => resolve(undefined), timeoutMs);
  });

  return Promise.race([sessionPromise, timeout]);
}

self.addEventListener('install', () => {
  void self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      await cleanupDeadClients();
    })()
  );
});

/**
 * Receive session updates from clients
 */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const client = event.source as Client | null;
  if (!client) return;

  const data: unknown = event.data;
  if (!data || typeof data !== 'object') return;
  const { type, accessToken, baseUrl } = data as Record<string, unknown>;

  if (type === 'setSession') {
    setSession(client.id, accessToken, baseUrl);
    void cleanupDeadClients();
  }
  if (type === 'setNotificationSettings') {
    if (typeof (data as { notificationSoundEnabled?: unknown }).notificationSoundEnabled === 'boolean') {
      notificationSoundEnabled = (data as { notificationSoundEnabled: boolean }).notificationSoundEnabled;
    }
  }
});

const MEDIA_PATHS = ['/_matrix/client/v1/media/download', '/_matrix/client/v1/media/thumbnail'];

function mediaPath(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return MEDIA_PATHS.some((p) => pathname.startsWith(p));
  } catch {
    return false;
  }
}

function validMediaRequest(url: string, baseUrl: string): boolean {
  return MEDIA_PATHS.some((p) => {
    const validUrl = new URL(p, baseUrl);
    return url.startsWith(validUrl.href);
  });
}

function fetchConfig(token: string): RequestInit {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'default',
  };
}

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data.type === 'togglePush') {
    const token = event.data?.token;
    const fetchOptions = fetchConfig(token);
    event.waitUntil(
      fetch(`${event.data.url}/_matrix/client/v3/pushers/set`, {
        method: 'POST',
        ...fetchOptions,
        body: JSON.stringify(event.data.pusherData),
      })
    );
    return;
  }
  const { replyTo } = event.data;
  if (replyTo) {
    const resolve = pendingReplies.get(replyTo);
    if (resolve) {
      pendingReplies.delete(replyTo);
      resolve(event.data.payload);
    }
  }
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
    })()
  );
});

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', (event: FetchEvent) => {
  const { url, method } = event.request;

  if (method !== 'GET' || !mediaPath(url)) return;

  const { clientId } = event;
  if (!clientId) return;

  const session = sessions.get(clientId);
  if (session) {
    if (validMediaRequest(url, session.baseUrl)) {
      event.respondWith(fetch(url, fetchConfig(session.accessToken)));
    }
    return;
  }

  event.respondWith(
    requestSessionWithTimeout(clientId).then((s) => {
      if (s && validMediaRequest(url, s.baseUrl)) {
        return fetch(url, fetchConfig(s.accessToken));
      }
      return fetch(event.request);
    })
  );

  event.waitUntil(
    (async function () {
      console.log('Ensuring fetch processing completes before worker termination.');
    })()
  );
});

const onPushNotification = async (event: PushEvent) => {
  if (!event?.data) {
    return;
  }
  const pushData = event.data.json();
  console.log(pushData);

  // try {
  //   if (typeof pushData?.unread === 'number') {
  //     self.navigator.setAppBadge(pushData.unread);

  //     if (pushData.unread == 0) {
  //       self.registration
  //         .getNotifications()
  //         .then((notifications) => notifications.forEach((notification) => notification.close()));
  //       await navigator.clearAppBadge();
  //       return;
  //     }
  //   } else {
  //     await navigator.clearAppBadge();
  //   }
  // } catch (_) {
  //   // Likely Firefox/Gecko-based and doesn't support badging API
  // }

  await handlePushNotificationPushData(pushData);
};

self.addEventListener('push', (event: PushEvent) => event.waitUntil(onPushNotification(event)));

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const messageData = event.notification.data;
  const { scope } = self.registration;

  console.log(messageData);
  const eventType = messageData?.type as EventType | undefined;
  if (!eventType) return Promise.resolve();

  let targetUrl = `${scope}inbox/`;
  if (
    (eventType === EventType.RoomMessage || eventType === EventType.RoomMessageEncrypted) &&
    messageData?.room_id &&
    messageData?.event_id
  )
    targetUrl = `${scope}to/${messageData.room_id}/${messageData.event_id}`;
  if (eventType === EventType.RoomMember && messageData?.content?.membership === 'invite')
    targetUrl = `${scope}inbox/invites/`;
  console.log(`target url = ${targetUrl}`);

  const postMessageToClient = (client: WindowClient) => {
    client.postMessage({
      type: 'notificationToRoomEvent',
      message: messageData,
    });
  };

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return (client as WindowClient).focus().then(postMessageToClient);
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return Promise.resolve();
    })
  );

  return Promise.resolve();
});

if (self.__WB_MANIFEST) {
  precacheAndRoute(self.__WB_MANIFEST);
}
cleanupOutdatedCaches();
