import { useCallback, useEffect } from 'react';

export function DeviceViewport() {
  useEffect(() => {
    const isIOS = (() => {
      try {
        const { getPlatformOS } = require('@apps-in-toss/web-framework');
        return getPlatformOS() === 'ios';
      } catch {
        return false;
      }
    })();

    const styles: Record<string, string> = {
      '--min-height': `${window.innerHeight}px`,
      '--max-width': '720px',
    };

    if (isIOS) {
      Object.assign(styles, {
        '--bottom-padding': `max(env(safe-area-inset-bottom), 16px)`,
        '--top-padding': `max(env(safe-area-inset-top), 16px)`,
      });
    }

    for (const [key, value] of Object.entries(styles)) {
      document.documentElement.style.setProperty(key, value);
    }
  }, []);

  return null;
}
