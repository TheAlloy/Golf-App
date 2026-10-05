import { ReactNode, useEffect, useRef } from 'react';
import { Platform, ScrollView, ScrollViewProps } from 'react-native';

type Props = ScrollViewProps & { children: ReactNode };

/** A drag shorter than this is a click on whatever was under the pointer. */
const DRAG_THRESHOLD = 5;

/**
 * A sideways-scrolling row. On touch screens and trackpads a ScrollView
 * already scrolls sideways; a mouse can't drag a web page's content, so in
 * a browser this also lets you grab the row and pull it, swallowing the
 * click that would otherwise fire at the end of a drag.
 */
export function HorizontalScroll({ children, ...props }: Props) {
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = (
      scroll.current as unknown as { getScrollableNode?: () => HTMLElement } | null
    )?.getScrollableNode?.();
    if (!node) return;

    let startX = 0;
    let startLeft = 0;
    let dragging = false;
    let dragged = false;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true;
      dragged = false;
      startX = e.clientX;
      startLeft = node.scrollLeft;
      node.style.cursor = 'grabbing';
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > DRAG_THRESHOLD) dragged = true;
      if (dragged) {
        node.scrollLeft = startLeft - dx;
        e.preventDefault();
      }
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      node.style.cursor = 'grab';
      // The click for this release, if any, fires before this runs; a drag
      // let go outside the row must not swallow the next real click.
      setTimeout(() => {
        dragged = false;
      }, 0);
    };
    // After a drag, the release lands on a chip or card; that press is not a tap.
    const onClick = (e: MouseEvent) => {
      if (!dragged) return;
      dragged = false;
      e.stopPropagation();
      e.preventDefault();
    };

    node.style.cursor = 'grab';
    node.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    node.addEventListener('click', onClick, true);
    return () => {
      node.style.cursor = '';
      node.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      node.removeEventListener('click', onClick, true);
    };
  }, []);

  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      // Screens pad their content 16px; the row bleeds out to the screen
      // edges so cards slide under them rather than being cut off inside.
      style={{ marginHorizontal: -16 }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      {...props}
    >
      {children}
    </ScrollView>
  );
}
