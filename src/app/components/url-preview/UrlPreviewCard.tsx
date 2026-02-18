import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IPreviewUrlResponse } from 'matrix-js-sdk';
import { Box, Icon, IconButton, Icons, Scroll, Spinner, Text, as, color, config } from 'folds';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { UrlPreview, UrlPreviewContent, UrlPreviewDescription, UrlPreviewImg } from './UrlPreview';
import {
  getIntersectionObserverEntry,
  useIntersectionObserver,
} from '../../hooks/useIntersectionObserver';
import * as css from './UrlPreviewCard.css';
import { tryDecodeURIComponent } from '../../utils/dom';
import { mxcUrlToHttp } from '../../utils/matrix';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { ImageViewer } from '../image-viewer';
import { Image, Video } from '../media';
import { ImageContent, VideoContent } from '../message';

const linkStyles = { color: color.Success.Main };
const TARGET_HEIGHT = 300;

export const UrlPreviewCard = as<'div', { url: string; ts: number, mediaType?: string | null }>(
  ({ url, ts, mediaType, ...props }, ref) => {
    const mx = useMatrixClient();
    const useAuthentication = useMediaAuthentication();

    const isDirect = !!mediaType;

    const [mediaDim, setMediaDim] = useState<{ w: number; h: number } | null>(null);
    const calculatedWidth = mediaDim ? Math.ceil((TARGET_HEIGHT * mediaDim.w) / mediaDim.h) : undefined;

    const [previewStatus, loadPreview] = useAsyncCallback(
      useCallback(() => {
        if (isDirect) return Promise.resolve(null);
        return mx.getUrlPreview(url, ts);
      }, [url, ts, mx, isDirect])
    );

    useEffect(() => {
      loadPreview();
    }, [url, loadPreview]);

    if (previewStatus.status === AsyncStatus.Error) return null;

    const renderContent = (prev: IPreviewUrlResponse | null) => {
      const imgUrl = isDirect
        ? url
        : mxcUrlToHttp(mx, prev?.['og:image'] || '', useAuthentication, 256, 256, 'scale', false);

      if (!imgUrl) return null;

      const title = prev?.['og:title'] || (isDirect ? 'Image Preview' : '');
      const siteName = prev?.['og:site_name'];
      const description = prev?.['og:description'];

      if (isDirect) {
        if (mediaType === 'video') {
          return (
            <VideoContent
              body={title}
              mimeType="video/mp4"
              url={imgUrl}
              info={{} as any}
              autoPlay
              style={{
                display: 'block',
                height: TARGET_HEIGHT,
                width: calculatedWidth ? `${calculatedWidth}px` : 'auto',
                minWidth: calculatedWidth ? 0 : 200,
                position: 'relative',
              }}
              renderVideo={(p) => (
                <Video
                  {...p}
                  src={p.src || imgUrl}
                  autoPlay={true}
                  muted={true}
                  loop={true}
                  controls={false}
                  playsInline={true}
                  onLoadedMetadata={(e: any) => {
                    const vid = e.target;
                    if (vid && vid.videoWidth && vid.videoHeight) {
                      setMediaDim({ w: vid.videoWidth, h: vid.videoHeight });
                    }
                    if (p.onLoadedMetadata) p.onLoadedMetadata();
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    borderRadius: 8,
                    objectFit: 'contain',
                  }}
                />
              )}
            />
          );
        }

        return (
          <ImageContent
            body={title}
            url={imgUrl}
            autoPlay
            style={{
              display: 'block',
              height: TARGET_HEIGHT,
              width: calculatedWidth ? `${calculatedWidth}px` : 'auto',
              minWidth: calculatedWidth ? 0 : 100,
              position: 'relative',
            }}
            renderImage={(p) => (
              <Image
                {...p}
                src={p.src || imgUrl}
                loading="lazy"
                onLoad={(e: any) => {
                  const img = e.target;
                  if (img && img.naturalWidth && img.naturalHeight) {
                    setMediaDim({ w: img.naturalWidth, h: img.naturalHeight });
                  }
                  if (p.onLoad) p.onLoad();
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  borderRadius: 8,
                  objectFit: 'contain',
                }}
              />
            )}
            renderViewer={(p) => <ImageViewer {...p} src={p.src || imgUrl} />}
          />
        );
      }

      return (
        <>
          <UrlPreviewImg
            src={imgUrl}
            alt="Media"
            style={{
              width: 'auto',
              height: 'auto',
              maxWidth: '100%',
              maxHeight: '100px',
              borderRadius: '8px',
              objectFit: 'contain',
              display: 'block',
            }}
          />
          <UrlPreviewContent>
            <Text style={linkStyles} truncate as="a" href={url} target="_blank" rel="no-referrer" size="T200" priority="300">
              {typeof siteName === 'string' && `${siteName} | `}
              {tryDecodeURIComponent(url)}
            </Text>
            {title && (
              <Text truncate priority="400">
                <b>{title}</b>
              </Text>
            )}
            {description && (
              <Text size="T200" priority="300">
                <UrlPreviewDescription>{description}</UrlPreviewDescription>
              </Text>
            )}
          </UrlPreviewContent>
        </>
      );
    };

    return (
      <UrlPreview
        {...props}
        ref={ref}
        style={
          isDirect
            ? {
              background: 'transparent',
              border: 'none',
              padding: 0,
              boxShadow: 'none',
              display: 'inline-block',
              verticalAlign: 'middle',
              width: calculatedWidth ? `${calculatedWidth}px` : 'max-content',
              minWidth: 0,
              maxWidth: '100%',
              margin: 0,
            }
            : {
              width: '600px',
            }
        }
      >
        {previewStatus.status === AsyncStatus.Success ? (
          renderContent(previewStatus.data)
        ) : (
          <Box grow="Yes" alignItems="Center" justifyContent="Center">
            <Spinner variant="Secondary" size="400" />
          </Box>
        )}
      </UrlPreview>
    );
  }
);

export const UrlPreviewHolder = as<'div'>(({ children, ...props }, ref) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const backAnchorRef = useRef<HTMLDivElement>(null);
  const frontAnchorRef = useRef<HTMLDivElement>(null);
  const [backVisible, setBackVisible] = useState(true);
  const [frontVisible, setFrontVisible] = useState(true);

  const intersectionObserver = useIntersectionObserver(
    useCallback((entries) => {
      const backAnchor = backAnchorRef.current;
      const frontAnchor = frontAnchorRef.current;
      const backEntry = backAnchor && getIntersectionObserverEntry(backAnchor, entries);
      const frontEntry = frontAnchor && getIntersectionObserverEntry(frontAnchor, entries);
      if (backEntry) {
        setBackVisible(backEntry.isIntersecting);
      }
      if (frontEntry) {
        setFrontVisible(frontEntry.isIntersecting);
      }
    }, []),
    useCallback(
      () => ({
        root: scrollRef.current,
        rootMargin: '10px',
      }),
      []
    )
  );

  useEffect(() => {
    const backAnchor = backAnchorRef.current;
    const frontAnchor = frontAnchorRef.current;
    if (backAnchor) intersectionObserver?.observe(backAnchor);
    if (frontAnchor) intersectionObserver?.observe(frontAnchor);
    return () => {
      if (backAnchor) intersectionObserver?.unobserve(backAnchor);
      if (frontAnchor) intersectionObserver?.unobserve(frontAnchor);
    };
  }, [intersectionObserver]);

  const handleScrollBack = () => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const { offsetWidth, scrollLeft } = scroll;
    scroll.scrollTo({
      left: scrollLeft - offsetWidth / 1.3,
      behavior: 'smooth',
    });
  };
  const handleScrollFront = () => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const { offsetWidth, scrollLeft } = scroll;
    scroll.scrollTo({
      left: scrollLeft + offsetWidth / 1.3,
      behavior: 'smooth',
    });
  };

  return (
    <Box
      direction="Column"
      {...props}
      ref={ref}
      style={{ marginTop: config.space.S200, position: 'relative' }}
    >
      <Scroll ref={scrollRef} direction="Horizontal" size="0" visibility="Hover" hideTrack>
        <Box shrink="No" alignItems="Center">
          <div ref={backAnchorRef} />
          {!backVisible && (
            <>
              <div className={css.UrlPreviewHolderGradient({ position: 'Left' })} />
              <IconButton
                className={css.UrlPreviewHolderBtn({ position: 'Left' })}
                variant="Secondary"
                radii="Pill"
                size="300"
                outlined
                onClick={handleScrollBack}
              >
                <Icon size="300" src={Icons.ArrowLeft} />
              </IconButton>
            </>
          )}
          <Box alignItems="Inherit" gap="200">
            {children}

            {!frontVisible && (
              <>
                <div className={css.UrlPreviewHolderGradient({ position: 'Right' })} />
                <IconButton
                  className={css.UrlPreviewHolderBtn({ position: 'Right' })}
                  variant="Primary"
                  radii="Pill"
                  size="300"
                  outlined
                  onClick={handleScrollFront}
                >
                  <Icon size="300" src={Icons.ArrowRight} />
                </IconButton>
              </>
            )}
            <div ref={frontAnchorRef} />
          </Box>
        </Box>
      </Scroll>
    </Box>
  );
});