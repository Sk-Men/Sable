import { useState, useEffect } from 'react';

const imageBlobCache = new Map<string, string>();

export function useBlobCache(url?: string): string | undefined {
    const [cacheState, setCacheState] = useState<{ sourceUrl?: string; blobUrl?: string }>({
        sourceUrl: url,
        blobUrl: url ? imageBlobCache.get(url) : undefined,
    });

    if (url !== cacheState.sourceUrl) {
        setCacheState({
            sourceUrl: url,
            blobUrl: url ? imageBlobCache.get(url) : undefined,
        });
    }

    useEffect(() => {
        let isMounted = true;

        if (url && !imageBlobCache.has(url)) {
            fetch(url, { mode: 'cors' })
                .then((res) => (res.ok ? res.blob() : Promise.reject()))
                .then((blob) => {
                    if (isMounted) {
                        const objectUrl = URL.createObjectURL(blob);
                        imageBlobCache.set(url, objectUrl);
                        setCacheState({ sourceUrl: url, blobUrl: objectUrl });
                    }
                })
                .catch(() => {
                    // silently fail... mrow
                });
        }

        return () => {
            isMounted = false;
        };
    }, [url]);

    return cacheState.blobUrl || url;
}