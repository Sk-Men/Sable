import { useCallback, useEffect, useRef, useState } from 'react';
import { scrollToBottom as domScrollToBottom } from '$utils/dom';

type ScrollBehavior = 'auto' | 'instant' | 'smooth';

export const useScrollManager = (scrollRef: React.RefObject<HTMLElement>) => {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isAtBottomRef = useRef(true);
  const sentryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentryEl = sentryRef.current;
    const scrollEl = scrollRef.current;

    let observer: IntersectionObserver | undefined;

    if (sentryEl && scrollEl) {
      observer = new IntersectionObserver(
        ([entry]) => {
          const atBottom = entry.isIntersecting;

          isAtBottomRef.current = atBottom;
          setIsAtBottom(atBottom);
        },
        {
          root: scrollEl,
          rootMargin: '10px 0px 0px 0px',
          threshold: 0,
        }
      );

      observer.observe(sentryEl);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [scrollRef]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'instant') => {
      const el = scrollRef.current;
      if (el) {
        domScrollToBottom(el, behavior);

        isAtBottomRef.current = true;
        setIsAtBottom(true);

        if (behavior === 'instant') {
          requestAnimationFrame(() => {
            if (scrollRef.current) domScrollToBottom(scrollRef.current, 'instant');
          });
        }
      }
    },
    [scrollRef]
  );

  const onScroll = useCallback(() => {}, []);

  return {
    isAtBottom,
    onScroll,
    scrollToBottom,
    sentryRef,
  };
};
