import { Provider as JotaiProvider } from 'jotai';
import { OverlayContainerProvider, PopOutContainerProvider, TooltipContainerProvider } from 'folds';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from 'react-error-boundary';

import { ClientConfigLoader } from '$components/ClientConfigLoader';
import { ClientConfigProvider } from '$hooks/useClientConfig';
import { ScreenSizeProvider, useScreenSize } from '$hooks/useScreenSize';
import { useCompositionEndTracking } from '$hooks/useComposingCheck';
import { ErrorPage } from '$components/DefaultErrorPage';
import { ConfigConfigError, ConfigConfigLoading } from './ConfigConfig';
import { FeatureCheck } from './FeatureCheck';
import { createRouter } from './Router';

const queryClient = new QueryClient();

function App() {
  const screenSize = useScreenSize();
  useCompositionEndTracking();

  const portalContainer = document.getElementById('portalContainer') ?? undefined;

  return (
    <ErrorBoundary FallbackComponent={ErrorPage}>
      <TooltipContainerProvider value={portalContainer}>
        <PopOutContainerProvider value={portalContainer}>
          <OverlayContainerProvider value={portalContainer}>
            <ScreenSizeProvider value={screenSize}>
              <FeatureCheck>
                <ClientConfigLoader
                  fallback={() => <ConfigConfigLoading />}
                  error={(err, retry, ignore) => (
                    <ConfigConfigError error={err} retry={retry} ignore={ignore} />
                  )}
                >
                  {(clientConfig) => (
                    <ClientConfigProvider value={clientConfig}>
                      <QueryClientProvider client={queryClient}>
                        <JotaiProvider>
                          <RouterProvider router={createRouter(clientConfig, screenSize)} />
                        </JotaiProvider>
                        <ReactQueryDevtools initialIsOpen={false} />
                      </QueryClientProvider>
                    </ClientConfigProvider>
                  )}
                </ClientConfigLoader>
              </FeatureCheck>
            </ScreenSizeProvider>
          </OverlayContainerProvider>
        </PopOutContainerProvider>
      </TooltipContainerProvider>
    </ErrorBoundary>
  );
}

export default App;
