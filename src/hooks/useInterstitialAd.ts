import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleAdMob } from '@apps-in-toss/web-framework';

const DEFAULT_AD_GROUP_ID = 'ait-ad-test-interstitial-id';

type AdEvent = { type: string };
type AdError = unknown;

interface InterstitialAdCallback {
  onDismiss?: () => void;
}

export function useInterstitialAd(adGroupId: string = DEFAULT_AD_GROUP_ID) {
  const [loading, setLoading] = useState(true);
  const [supported, setSupported] = useState(true);
  const dismissRef = useRef<(() => void) | undefined>();

  const isAdSupported = useCallback(() => {
    try {
      return GoogleAdMob?.loadAppsInTossAdMob?.isSupported?.() !== false;
    } catch {
      return false;
    }
  }, []);

  const loadAd = useCallback(() => {
    if (!isAdSupported()) {
      setSupported(false);
      setLoading(false);
      return;
    }

    try {
      const cleanup = GoogleAdMob.loadAppsInTossAdMob({
        options: {
          adGroupId,
        },
        onEvent: (event: AdEvent) => {
          if (event.type === 'loaded') {
            setLoading(false);
          }
        },
        onError: () => {
          setLoading(false);
        },
      });

      return cleanup;
    } catch {
      setSupported(false);
      setLoading(false);
      return undefined;
    }
  }, [adGroupId, isAdSupported]);

  useEffect(() => {
    const cleanup = loadAd();
    return cleanup;
  }, [loadAd]);

  const showInterstitialAd = useCallback(
    ({ onDismiss }: InterstitialAdCallback) => {
      if (!isAdSupported()) {
        onDismiss?.();
        return;
      }

      if (!supported || loading) {
        onDismiss?.();
        return;
      }

      dismissRef.current = onDismiss;

      try {
        GoogleAdMob.showAppsInTossAdMob({
          options: {
            adGroupId,
          },
          onEvent: (event: AdEvent) => {
            if (event.type === 'dismissed' || event.type === 'failedToShow') {
              dismissRef.current?.();
              dismissRef.current = undefined;
              loadAd();
            }
          },
          onError: (_error: AdError) => {
            dismissRef.current?.();
            dismissRef.current = undefined;
          },
        });
      } catch {
        dismissRef.current?.();
        dismissRef.current = undefined;
      }
    },
    [adGroupId, isAdSupported, loading, supported, loadAd],
  );

  return {
    loading,
    supported,
    showInterstitialAd,
  };
}
