import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  canFitInScrollView,
  getScrollInfo,
  isInScrollView,
  isIntersectingScrollView,
} from '$utils/dom';
import { OnIntersectionCallback, useIntersectionObserver } from './useIntersectionObserver';

const PAGINATOR_ANCHOR_ATTR = 'data-paginator-anchor';

export enum Direction {
  Backward = 'B',
  Forward = 'F',
}
export type ItemRange = { start: number; end: number };
export type ScrollToOptions = {
  offset?: number;
  align?: 'start' | 'center' | 'end';
  behavior?: 'auto' | 'instant' | 'smooth';
  stopInView?: boolean;
};
export type ScrollToElement = (element: HTMLElement, opts?: ScrollToOptions) => boolean;
export type ScrollToItem = (index: number, opts?: ScrollToOptions) => boolean;
type HandleObserveAnchor = (element: HTMLElement | null) => void;

type VirtualPaginatorOptions<TScrollElement extends HTMLElement> = {
  count: number;
  limit: number;
  range: ItemRange;
  onRangeChange: (range: ItemRange) => void;
  getScrollElement: () => TScrollElement | null;
  getItemElement: (index: number) => HTMLElement | undefined;
  onEnd?: (back: boolean) => void;
};

type VirtualPaginator = {
  getItems: () => number[];
  scrollToElement: ScrollToElement;
  scrollToItem: ScrollToItem;
  observeBackAnchor: HandleObserveAnchor;
  observeFrontAnchor: HandleObserveAnchor;
};

const generateItems = (range: ItemRange): number[] =>
  Array.from({ length: Math.max(0, range.end - range.start) }, (_, i) => i + range.start);

const getDropIndex = (
  scrollEl: HTMLElement,
  range: ItemRange,
  dropDirection: Direction,
  getItemElement: (index: number) => HTMLElement | undefined,
  pageThreshold = 6
): number | undefined => {
  const fromBackward = dropDirection === Direction.Backward;
  const items = fromBackward ? generateItems(range) : generateItems(range).reverse();
  const { viewHeight, top, height } = getScrollInfo(scrollEl);
  const { offsetTop: sOffsetTop } = scrollEl;
  const bottom = top + viewHeight;

  const dropEdgePx = fromBackward
    ? Math.max(top - viewHeight * pageThreshold, 0)
    : Math.min(bottom + viewHeight * pageThreshold, height);

  if (dropEdgePx === 0 || dropEdgePx === height) {
    return undefined;
  }

  let dropIndex: number | undefined;
  items.some((item) => {
    const el = getItemElement(item);
    if (!el) {
      dropIndex = item;
      return false;
    }
    const { clientHeight } = el;
    const offsetTop = el.offsetTop - sOffsetTop;
    const offsetBottom = offsetTop + clientHeight;
    const isInView = fromBackward ? offsetBottom > dropEdgePx : offsetTop < dropEdgePx;

    if (isInView) {
      return true;
    }

    dropIndex = item;
    return false;
  });
  return dropIndex;
};

type RestoreAnchorData = [number | undefined, HTMLElement | undefined];

const getRestoreAnchor = (
  scrollEl: HTMLElement,
  range: ItemRange,
  getItemElement: (index: number) => HTMLElement | undefined,
  direction: Direction
): RestoreAnchorData => {
  const { top: scrollTop, viewHeight } = getScrollInfo(scrollEl);
  const scrollBottom = scrollTop + viewHeight;
  const sOffsetTop = scrollEl.offsetTop;

  const items =
    direction === Direction.Backward ? generateItems(range).reverse() : generateItems(range);

  const scrollAnchorItem = items.find((i) => {
    const el = getItemElement(i);
    if (!el) {
      return false;
    }

    const elTop = el.offsetTop - sOffsetTop;
    const elBottom = elTop + el.clientHeight;

    return elBottom > scrollTop && elTop < scrollBottom;
  });

  if (scrollAnchorItem === undefined) {
    const fallbackItem = generateItems(range).find((i) => getItemElement(i));
    return [fallbackItem, fallbackItem !== undefined ? getItemElement(fallbackItem) : undefined];
  }

  return [scrollAnchorItem, getItemElement(scrollAnchorItem)];
};

const getRestoreScrollData = (scrollEl: HTMLElement, restoreAnchorData: RestoreAnchorData) => {
  const [anchorItem, anchorElement] = restoreAnchorData;
  if (anchorItem === undefined || !anchorElement) {
    return undefined;
  }
  return {
    anchorItem,
    anchorElement,
    anchorRectTop: anchorElement.getBoundingClientRect().top,
  };
};

function useObserveAnchorHandle(
  intersectionObserver: IntersectionObserver | undefined | null,
  anchorType: Direction
): HandleObserveAnchor {
  const anchorRef = useRef<HTMLElement | null>(null);

  return useCallback(
    (element) => {
      if (element === anchorRef.current) {
        return;
      }
      if (anchorRef.current) {
        intersectionObserver?.unobserve(anchorRef.current);
      }
      anchorRef.current = element;
      if (element) {
        element.setAttribute(PAGINATOR_ANCHOR_ATTR, anchorType);
        intersectionObserver?.observe(element);
      }
    },
    [intersectionObserver, anchorType]
  );
}

export const useVirtualPaginator = <TScrollElement extends HTMLElement>(
  options: VirtualPaginatorOptions<TScrollElement>
): VirtualPaginator => {
  const { count, limit, range, onRangeChange, getScrollElement, getItemElement, onEnd } = options;

  const initialRenderRef = useRef(true);
  const isPaginatingRef = useRef(false);
  const isFetchingRef = useRef<Direction | null>(null);
  const isAdjustingRef = useRef(false);

  const restoreScrollRef = useRef<{
    anchorRectTop: number;
    anchorItem: number;
    anchorElement: HTMLElement;
  }>();

  const lastAnchorRef = useRef<{ element: HTMLElement; top: number; index: number } | null>(null);
  const scrollToItemRef = useRef<{ index: number; opts?: ScrollToOptions }>();
  const propRef = useRef({ range, limit, count });

  if (propRef.current.count !== count) {
    if (isFetchingRef.current) {
      isFetchingRef.current = null;
    }
  }
  propRef.current = { range, count, limit };

  const getItems = useMemo(() => {
    const items = generateItems(range);
    return () => items;
  }, [range]);

  const scrollToElement = useCallback<ScrollToElement>(
    (element, opts) => {
      const scrollElement = getScrollElement();
      if (!scrollElement) {
        return false;
      }
      if (opts?.stopInView && isInScrollView(scrollElement, element)) {
        return false;
      }

      let scrollTo = element.offsetTop;
      if (opts?.align === 'center' && canFitInScrollView(scrollElement, element)) {
        const scrollInfo = getScrollInfo(scrollElement);
        scrollTo =
          element.offsetTop -
          Math.round(scrollInfo.viewHeight / 2) +
          Math.round(element.clientHeight / 2);
      } else if (opts?.align === 'end' && canFitInScrollView(scrollElement, element)) {
        const scrollInfo = getScrollInfo(scrollElement);
        scrollTo = element.offsetTop - Math.round(scrollInfo.viewHeight) + element.clientHeight;
      }

      const targetTop = Math.max(0, scrollTo - (opts?.offset ?? 0));
      if (opts?.behavior === 'instant') {
        scrollElement.scrollTop = targetTop;
      } else {
        scrollElement.scrollTo({ top: targetTop, behavior: opts?.behavior });
      }
      return true;
    },
    [getScrollElement]
  );

  const scrollToItem = useCallback<ScrollToItem>(
    (index, opts) => {
      const { range: currentRange, limit: currentLimit, count: currentCount } = propRef.current;
      if (index < 0 || index >= currentCount) {
        return false;
      }

      if (index < currentRange.start || index >= currentRange.end) {
        onRangeChange({
          start: Math.max(index - currentLimit, 0),
          end: Math.min(index + currentLimit, currentCount),
        });
        scrollToItemRef.current = { index, opts };
        return true;
      }

      const targetItems = generateItems({ start: currentRange.start, end: index + 1 });
      const targetItem = targetItems.reverse().find((i) => getItemElement(i) !== undefined);
      const itemElement = targetItem !== undefined ? getItemElement(targetItem) : undefined;

      if (!itemElement) {
        const scrollElement = getScrollElement();
        const targetTop = Math.max(0, opts?.offset ?? 0);
        if (scrollElement) {
          if (opts?.behavior === 'instant') {
            scrollElement.scrollTop = targetTop;
          } else {
            scrollElement.scrollTo({ top: targetTop, behavior: opts?.behavior });
          }
        }
        return true;
      }
      return scrollToElement(itemElement, opts);
    },
    [getScrollElement, scrollToElement, getItemElement, onRangeChange]
  );

  const paginate = useCallback(
    (direction: Direction): void => {
      if (isPaginatingRef.current || isFetchingRef.current === direction) {
        return;
      }

      const scrollEl = getScrollElement();
      const { range: currentRange, limit: currentLimit, count: currentCount } = propRef.current;
      let { start, end } = currentRange;

      if (direction === Direction.Backward) {
        if (start === 0) {
          isFetchingRef.current = Direction.Backward;
          onEnd?.(true);
          return;
        }
        if (scrollEl) {
          restoreScrollRef.current = getRestoreScrollData(
            scrollEl,
            getRestoreAnchor(scrollEl, currentRange, getItemElement, Direction.Backward)
          );
          end = getDropIndex(scrollEl, currentRange, Direction.Forward, getItemElement, 6) ?? end;
        }
        start = Math.max(start - currentLimit, 0);
      } else {
        if (end === currentCount) {
          isFetchingRef.current = Direction.Forward;
          onEnd?.(false);
          return;
        }
        if (scrollEl) {
          restoreScrollRef.current = getRestoreScrollData(
            scrollEl,
            getRestoreAnchor(scrollEl, currentRange, getItemElement, Direction.Forward)
          );
          start =
            getDropIndex(scrollEl, currentRange, Direction.Backward, getItemElement, 6) ?? start;
        }
        end = Math.min(end + currentLimit, currentCount);
      }

      isPaginatingRef.current = true;
      onRangeChange({ start, end });
    },
    [getScrollElement, getItemElement, onEnd, onRangeChange]
  );

  const intersectionObserver = useIntersectionObserver(
    useCallback(
      (entries) => {
        const anchorB = entries.find(
          (e) => e.target.getAttribute(PAGINATOR_ANCHOR_ATTR) === Direction.Backward
        );
        if (anchorB?.isIntersecting) {
          paginate(Direction.Backward);
        }

        const anchorF = entries.find(
          (e) => e.target.getAttribute(PAGINATOR_ANCHOR_ATTR) === Direction.Forward
        );
        if (anchorF?.isIntersecting) {
          paginate(Direction.Forward);
        }
      },
      [paginate]
    ),
    useCallback(() => ({ root: getScrollElement() }), [getScrollElement])
  );

  const observeBackAnchor = useObserveAnchorHandle(intersectionObserver, Direction.Backward);
  const observeFrontAnchor = useObserveAnchorHandle(intersectionObserver, Direction.Forward);

  useLayoutEffect(() => {
    const scrollEl = getScrollElement();
    if (!scrollEl || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const getVisibleAnchor = () => {
      const { top: scrollTop } = getScrollInfo(scrollEl);
      const items = generateItems(propRef.current.range);

      return items
        .map((i) => ({ index: i, el: getItemElement(i) }))
        .find(({ el }) => {
          if (!el) {
            return false;
          }
          const elTop = el.offsetTop - scrollEl.offsetTop;
          const elBottom = elTop + el.clientHeight;
          return elBottom > scrollTop;
        });
    };

    const observer = new ResizeObserver(() => {
      const anchorData = getVisibleAnchor();
      if (!anchorData || !anchorData.el) {
        return;
      }

      const { el: currentAnchor, index } = anchorData;
      const currentTop = currentAnchor.getBoundingClientRect().top;

      if (lastAnchorRef.current?.element === currentAnchor) {
        const drift = currentTop - lastAnchorRef.current.top;
        if (Math.abs(drift) > 0.5 && !isAdjustingRef.current) {
          isAdjustingRef.current = true;
          scrollEl.scrollTop += drift;

          requestAnimationFrame(() => {
            if (currentAnchor.isConnected) {
              const postTop = currentAnchor.getBoundingClientRect().top;
              lastAnchorRef.current = { element: currentAnchor, top: postTop, index };
            }
            isAdjustingRef.current = false;
          });
          return;
        }
      }
      lastAnchorRef.current = { element: currentAnchor, top: currentTop, index };
    });

    observer.observe(scrollEl);

    const handleScroll = () => {
      if (isAdjustingRef.current) {
        return;
      }
      const anchorData = getVisibleAnchor();
      if (anchorData?.el) {
        lastAnchorRef.current = {
          element: anchorData.el,
          top: anchorData.el.getBoundingClientRect().top,
          index: anchorData.index,
        };
      }
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      scrollEl.removeEventListener('scroll', handleScroll);
    };
  }, [getScrollElement, getItemElement, range]);

  useLayoutEffect(() => {
    const scrollEl = getScrollElement();
    if (!restoreScrollRef.current || !scrollEl) {
      isPaginatingRef.current = false;
      return undefined;
    }

    const { anchorRectTop: oldRectTop, anchorElement, anchorItem } = restoreScrollRef.current;
    let newRectTop: number | undefined;

    if (anchorElement && anchorElement.isConnected) {
      newRectTop = anchorElement.getBoundingClientRect().top;
    } else {
      const fallbackEl = getItemElement(anchorItem);
      if (fallbackEl) {
        newRectTop = fallbackEl.getBoundingClientRect().top;
      }
    }

    if (newRectTop !== undefined) {
      const shift = newRectTop - oldRectTop;
      if (Math.abs(shift) > 0.5) {
        scrollEl.scrollTop += shift;
      }
    }

    restoreScrollRef.current = undefined;
    isPaginatingRef.current = false;
    return undefined;
  }, [range, count, getScrollElement, getItemElement]);

  useLayoutEffect(() => {
    if (scrollToItemRef.current === undefined) {
      return undefined;
    }
    const { index, opts } = scrollToItemRef.current;
    scrollToItem(index, { ...opts, behavior: 'instant' });
    scrollToItemRef.current = undefined;
    return undefined;
  }, [range, count, scrollToItem]);

  useEffect(() => {
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }
    const scrollElement = getScrollElement();
    if (!scrollElement) {
      return;
    }

    const back = scrollElement.querySelector<HTMLElement>(
      `[${PAGINATOR_ANCHOR_ATTR}="${Direction.Backward}"]`
    );
    const front = scrollElement.querySelector<HTMLElement>(
      `[${PAGINATOR_ANCHOR_ATTR}="${Direction.Forward}"]`
    );

    if (back && isIntersectingScrollView(scrollElement, back)) {
      paginate(Direction.Backward);
    }
    if (front && isIntersectingScrollView(scrollElement, front)) {
      paginate(Direction.Forward);
    }
  }, [range, count, getScrollElement, paginate]);

  return { getItems, scrollToItem, scrollToElement, observeBackAnchor, observeFrontAnchor };
};
