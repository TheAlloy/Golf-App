/**
 * Browsers reserve space for a scrollbar, which pushes every scrolling page a
 * few pixels to the left and looks like a desktop page rather than an app.
 * This hides the native bars and draws a thin iOS-style indicator over the
 * content instead: it appears while you scroll and fades out after.
 *
 * Scroll views that ask for no indicator (showsVerticalScrollIndicator or
 * showsHorizontalScrollIndicator set to false) get none. react-native-web
 * marks those with scrollbar-width: none, which is how they are recognised.
 */

const THUMB = 3; // px
const EDGE = 4; // gap from the edge of the scroll view
const INSET = 4; // gap from the ends of the track
const MIN_LENGTH = 36;
const FADE_AFTER = 900; // ms

type Thumbs = { v: HTMLDivElement; h: HTMLDivElement; timer?: ReturnType<typeof setTimeout> };

let installed = false;

export function installOverlayScrollbars(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  // Chrome and Safari hide bars through the pseudo-element, which leaves the
  // computed scrollbar-width alone so hidden-by-request views can still be
  // told apart. Firefox only has scrollbar-width.
  const webkit = CSS.supports('selector(::-webkit-scrollbar)');
  const style = document.createElement('style');
  style.textContent = webkit
    ? '*::-webkit-scrollbar { width: 0; height: 0; background: transparent; }'
    : '* { scrollbar-width: none; }';
  document.head.appendChild(style);

  const thumbs = new WeakMap<Element, Thumbs>();

  const makeThumb = () => {
    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    Object.assign(el.style, {
      position: 'fixed',
      zIndex: '2147483647',
      borderRadius: `${THUMB}px`,
      background: 'rgba(226, 232, 240, 0.5)',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 240ms ease-out',
    });
    document.body.appendChild(el);
    return el;
  };

  // Keep the indicator clear of the status bar and home indicator.
  const safeArea = () => {
    const probe = document.querySelector<HTMLElement>('body > div[style*="safe-area-inset"]');
    const cs = probe ? getComputedStyle(probe) : null;
    return {
      top: cs ? parseFloat(cs.paddingTop) || 0 : 0,
      bottom: cs ? parseFloat(cs.paddingBottom) || 0 : 0,
    };
  };

  const onScroll = (event: Event) => {
    const el = event.target;
    if (!(el instanceof HTMLElement)) return;
    if (webkit && getComputedStyle(el).scrollbarWidth === 'none') return;

    let t = thumbs.get(el);
    if (!t) {
      t = { v: makeThumb(), h: makeThumb() };
      thumbs.set(el, t);
    }

    const rect = el.getBoundingClientRect();
    const safe = safeArea();

    const canY = el.scrollHeight > el.clientHeight + 1;
    if (canY) {
      const top = Math.max(rect.top, safe.top) + INSET;
      const bottom = Math.min(rect.bottom, window.innerHeight - safe.bottom) - INSET;
      const track = Math.max(0, bottom - top);
      const length = Math.max(MIN_LENGTH, (track * el.clientHeight) / el.scrollHeight);
      const progress = el.scrollTop / (el.scrollHeight - el.clientHeight);
      Object.assign(t.v.style, {
        width: `${THUMB}px`,
        height: `${length}px`,
        left: `${rect.right - EDGE - THUMB}px`,
        top: `${top + (track - length) * Math.min(1, Math.max(0, progress))}px`,
        opacity: '1',
      });
    }

    const canX = el.scrollWidth > el.clientWidth + 1;
    if (canX) {
      const left = rect.left + INSET;
      const track = Math.max(0, rect.width - INSET * 2);
      const length = Math.max(MIN_LENGTH, (track * el.clientWidth) / el.scrollWidth);
      const progress = el.scrollLeft / (el.scrollWidth - el.clientWidth);
      Object.assign(t.h.style, {
        height: `${THUMB}px`,
        width: `${length}px`,
        top: `${rect.bottom - EDGE - THUMB}px`,
        left: `${left + (track - length) * Math.min(1, Math.max(0, progress))}px`,
        opacity: '1',
      });
    }

    clearTimeout(t.timer);
    const current = t;
    t.timer = setTimeout(() => {
      current.v.style.opacity = '0';
      current.h.style.opacity = '0';
    }, FADE_AFTER);
  };

  // Scroll events don't bubble, but they do reach a capturing listener.
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
}
