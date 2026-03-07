import {
  createContext,
  MutableRefObject,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { ClientWidgetApi } from 'matrix-widget-api';
import { MatrixRTCSession } from 'matrix-js-sdk/lib/matrixrtc/MatrixRTCSession';
import { Box } from 'folds';
import {
  createVirtualWidget,
  SmallWidget,
  getWidgetData,
  getWidgetUrl,
  getCallIntentParams,
} from '$features/call/SmallWidget';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useClientConfig } from '$hooks/useClientConfig';
import { ScreenSize, useScreenSizeContext } from '$hooks/useScreenSize';
import { ThemeKind, useTheme } from '$hooks/useTheme';
import { useCallState } from './CallProvider';

interface PersistentCallContainerProps {
  children: ReactNode;
}

export const CallRefContext = createContext<MutableRefObject<HTMLIFrameElement | null> | null>(
  null
);

export function PersistentCallContainer({ children }: PersistentCallContainerProps) {
  const callIframeRef = useRef<HTMLIFrameElement | null>(null);
  const callWidgetApiRef = useRef<ClientWidgetApi | null>(null);
  const callSmallWidgetRef = useRef<SmallWidget | null>(null);
  // After any lobby join, reload EC with join_existing for proper in-call view.
  const hasReloadedAfterLobbyRef = useRef(false);
  const postLobbyIntentRef = useRef<'join_existing' | null>(null);

  const {
    activeCallRoomId,
    viewedCallRoomId,
    isChatOpen,
    isActiveCallReady,
    registerActiveClientWidgetApi,
    activeClientWidget,
    resetActiveCallReady,
    hangUp,
  } = useCallState();
  const mx = useMatrixClient();
  const clientConfig = useClientConfig();
  const screenSize = useScreenSizeContext();
  const theme = useTheme();
  const isMobile = screenSize === ScreenSize.Mobile;

  /* eslint-disable no-param-reassign */

  const setupWidget = useCallback(
    (
      widgetApiRef: MutableRefObject<ClientWidgetApi | null>,
      smallWidgetRef: MutableRefObject<SmallWidget | null>,
      iframeRef: MutableRefObject<HTMLIFrameElement | null>,
      skipLobby: boolean,
      themeKind: ThemeKind | null,
      intentOverride?: 'join_existing'
    ) => {
      if (mx?.getUserId()) {
        if (activeCallRoomId && !isActiveCallReady) {
          const roomIdToSet = activeCallRoomId;
          const room = mx.getRoom(roomIdToSet);
          const { intent: intentParam, callIntentParam } = getCallIntentParams(room);
          const effectiveIntent = intentOverride ?? intentParam;

          const widgetId = `element-call-${roomIdToSet}-${Date.now()}`;
          const newUrl = getWidgetUrl(
            mx,
            roomIdToSet,
            clientConfig.elementCallUrl ?? '',
            widgetId,
            {
              skipLobby: (intentOverride === 'join_existing' ? true : skipLobby).toString(),
              returnToLobby: 'true',
              perParticipantE2EE: 'true',
              theme: themeKind,
              intent: effectiveIntent,
              callIntent: callIntentParam,
            }
          );

          if (
            callSmallWidgetRef.current?.roomId &&
            activeClientWidget?.roomId &&
            activeClientWidget.roomId === callSmallWidgetRef.current?.roomId
          ) {
            return;
          }

          if (
            iframeRef.current &&
            (!iframeRef.current.src || iframeRef.current.src !== newUrl.toString())
          ) {
            iframeRef.current.src = newUrl.toString();
          }

          const iframeElement = iframeRef.current;
          if (!iframeElement) {
            return;
          }

          const userId = mx.getUserId() ?? '';
          const app = createVirtualWidget(
            mx,
            widgetId,
            userId,
            'Element Call',
            'm.call',
            newUrl,
            false,
            getWidgetData(mx, roomIdToSet, {}, { skipLobby: true, intent: effectiveIntent, callIntent: callIntentParam }),
            roomIdToSet
          );

          const smallWidget = new SmallWidget(app);
          smallWidgetRef.current = smallWidget;

          const widgetApiInstance = smallWidget.startMessaging(iframeElement);
          widgetApiRef.current = widgetApiInstance;
          registerActiveClientWidgetApi(
            roomIdToSet,
            widgetApiRef.current,
            smallWidget,
            iframeElement
          );
        }
      }
    },
    [
      mx,
      activeCallRoomId,
      isActiveCallReady,
      clientConfig.elementCallUrl,
      activeClientWidget,
      registerActiveClientWidgetApi,
    ]
  );

  // After any lobby join, poll until EC's call member state event has propagated to the room,
  // then reload EC with intent=join_existing + skipLobby=true so it auto-joins the existing
  // session and shows the full in-call grid. Hangs up if the session never appears.
  // Applies to all room types: DM/group (start_call) and voice rooms (join_existing) both
  // hit the same timing issue where the in-call grid is not shown after the first join.
  useEffect(() => {
    if (!activeCallRoomId) {
      hasReloadedAfterLobbyRef.current = false;
      return undefined;
    }
    if (isActiveCallReady && !hasReloadedAfterLobbyRef.current) {
      const room = mx?.getRoom(activeCallRoomId);
      if (room) {
        hasReloadedAfterLobbyRef.current = true;
        const POLL_INTERVAL_MS = 200;
        const TIMEOUT_MS = 10000;
        const startTime = Date.now();
        const pollTimer = setInterval(() => {
          if (MatrixRTCSession.callMembershipsForRoom(room).length > 0) {
            clearInterval(pollTimer);
            callSmallWidgetRef.current?.stopMessaging();
            callWidgetApiRef.current = null;
            callSmallWidgetRef.current = null;
            registerActiveClientWidgetApi(activeCallRoomId, null, null, null);
            postLobbyIntentRef.current = 'join_existing';
            resetActiveCallReady();
          } else if (Date.now() - startTime >= TIMEOUT_MS) {
            clearInterval(pollTimer);
            hangUp();
          }
        }, POLL_INTERVAL_MS);
        return () => clearInterval(pollTimer);
      }
    }
    return undefined;
  }, [isActiveCallReady, activeCallRoomId, mx, registerActiveClientWidgetApi, resetActiveCallReady, hangUp]);

  useEffect(() => {
    if (activeCallRoomId) {
      const intentOverride = postLobbyIntentRef.current ?? undefined;
      postLobbyIntentRef.current = null;
      setupWidget(callWidgetApiRef, callSmallWidgetRef, callIframeRef, true, theme.kind, intentOverride);
    }
  }, [
    theme,
    setupWidget,
    callWidgetApiRef,
    callSmallWidgetRef,
    callIframeRef,
    registerActiveClientWidgetApi,
    activeCallRoomId,
    viewedCallRoomId,
    isActiveCallReady,
  ]);

  const memoizedIframeRef = useMemo(() => callIframeRef, [callIframeRef]);

  return (
    <CallRefContext.Provider value={memoizedIframeRef}>
      <Box grow="No">
        <Box
          direction="Column"
          style={{
            position: 'relative',
            zIndex: 0,
            display: isMobile && isChatOpen ? 'none' : 'flex',
            width: isMobile && isChatOpen ? '0%' : '100%',
            height: isMobile && isChatOpen ? '0%' : '100%',
          }}
        >
          <Box
            grow="Yes"
            style={{
              position: 'relative',
            }}
          >
            <iframe
              ref={callIframeRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                display: 'flex',
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              title="Persistent Element Call"
              sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-modals allow-downloads"
              allow="microphone; camera; display-capture; autoplay; clipboard-write;"
              src="about:blank"
            />
          </Box>
        </Box>
      </Box>
      {children}
    </CallRefContext.Provider>
  );
}
