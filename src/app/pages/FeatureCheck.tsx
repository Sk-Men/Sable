import { ReactNode, useEffect } from 'react';
import { Box, Dialog, Text, config } from 'folds';
import { AsyncStatus, useAsyncCallback } from '$hooks/useAsyncCallback';
import { checkIndexedDBSupport } from '$utils/featureCheck';
import { SplashScreen } from '$components/splash-screen';

export function FeatureCheck({ children }: { children: ReactNode }) {
  const [idbSupportState, checkIDBSupport] = useAsyncCallback(checkIndexedDBSupport);

  useEffect(() => {
    checkIDBSupport();
  }, [checkIDBSupport]);

  if (idbSupportState.status === AsyncStatus.Success && idbSupportState.data === false) {
    return (
      <SplashScreen>
        <Box grow="Yes" alignItems="Center" justifyContent="Center">
          <Dialog>
            <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
              <Text>Missing Browser Feature</Text>
              <Text size="T300" priority="400">
                This application needs a feature called IndexedDB to save your session data on your
                device. It looks like your browser either doesn&apos;t support IndexedDB or it
                isn&apos;t working properly right now. Make sure your browser supports IndexedDB and
                that it&apos;s enabled. Please also check if you have enough free disk space, as
                IndexedDB may not work properly if your device is running low on storage.
              </Text>
              <Text size="T200">
                <a
                  href="https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  What is IndexedDB?
                </a>
              </Text>
            </Box>
          </Dialog>
        </Box>
      </SplashScreen>
    );
  }

  return children;
}
