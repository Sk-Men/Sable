import { useCallback, useRef, useState, useLayoutEffect } from 'react';
import { scrollToBottom as domScrollToBottom, getScrollInfo } from '$utils/dom';

type ScrollBehavior = 'auto' | 'instant' | 'smooth';

export const useScrollManager = (scrollRef: React.RefObject<HTMLElement>) => {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isAtBottomRef = useRef(true);
  const autoScrollRef = useRef(false);

  const checkAtBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { top, height, viewHeight } = getScrollInfo(el);
    const distanceToBottom = height - top - viewHeight;

    const atBottom = distanceToBottom <= 5;

    if (atBottom !== isAtBottomRef.current) {
      isAtBottomRef.current = atBottom;
      setIsAtBottom(atBottom);
    }
  }, [scrollRef]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'instant') => {
      const el = scrollRef.current;
      if (el) {
        autoScrollRef.current = true;
        domScrollToBottom(el, behavior);

        if (behavior === 'instant') {
          setTimeout(() => {
            if (scrollRef.current) domScrollToBottom(scrollRef.current, 'instant');
          }, 50);
        }
      }
    },
    [scrollRef]
  );

  const onScroll = useCallback(() => {
    if (autoScrollRef.current) {
      autoScrollRef.current = false;
      return;
    }
    checkAtBottom();
  }, [checkAtBottom]);

  useLayoutEffect(() => {
    const el = scrollRef.current;

    if (!el) {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(() => {
      if (isAtBottomRef.current) {
        scrollToBottom('instant');
      }
    });

    if (el.firstElementChild) {
      resizeObserver.observe(el.firstElementChild);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [scrollRef, scrollToBottom]);

  return {
    isAtBottom,
    onScroll,
    scrollToBottom,
    checkAtBottom,
  };
};
