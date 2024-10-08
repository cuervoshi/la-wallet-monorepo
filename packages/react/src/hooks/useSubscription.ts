import type { ConfigParameter } from '@lawallet/utils/types';
import {
  NDKRelay,
  NDKSubscription,
  type NDKEvent,
  type NDKFilter,
  type NDKSubscriptionOptions,
  type NostrEvent,
} from '@nostr-dev-kit/ndk';
import * as React from 'react';
import { useNostr } from '../context/NostrContext.js';
import { useConfig } from './useConfig.js';

export interface UseSubscriptionReturns {
  loading: boolean;
  subscription: NDKSubscription | undefined;
  events: NDKEvent[];
}

export interface SubscriptionProps extends ConfigParameter {
  filters: NDKFilter[];
  options: NDKSubscriptionOptions;
  enabled: boolean;
  onEvent?: (event: NostrEvent) => void;
}

export const useSubscription = ({ filters, options, enabled, config: configParam, onEvent }: SubscriptionProps) => {
  const config = useConfig(configParam);
  const { ndk, validateRelaysStatus, addRelayListener, removeRelayListener } = useNostr({ config });

  const [subscription, setSubscription] = React.useState<NDKSubscription>();
  const [events, setEvents] = React.useState<NDKEvent[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);

  const startSubscription = React.useCallback(async () => {
    if (ndk && enabled && !subscription) {
      setLoading(true);

      let connectedRelays = ndk.pool.connectedRelays();
      const newSub = new NDKSubscription(ndk, filters, options);

      newSub.on('event', async (event: NDKEvent) => {
        setEvents((prev) => {
          const uniqueEvents = new Map<string, typeof event>();

          [...prev, event].forEach((e) => {
            uniqueEvents.set(e.id, e);
          });

          const uniqueEventArray = Array.from(uniqueEvents.values());
          return uniqueEventArray.sort((a, b) => b.created_at! - a.created_at!);
        });

        if (onEvent) onEvent(await event.toNostrEvent());
      });

      newSub.on('eose', () => {
        setLoading(false);
      });

      connectedRelays.forEach((relay) => {
        relay.subscribe(newSub, filters);
      });

      setSubscription(newSub);
      return;
    }
  }, [ndk, filters, enabled, subscription]);

  const stopSubscription = React.useCallback(() => {
    if (subscription) {
      subscription.stop();
      subscription.removeAllListeners();
      setSubscription(undefined);
    }
  }, [subscription]);

  const handleResubscription = React.useCallback(
    (relay: NDKRelay) => {
      if (relay && subscription && enabled) {
        relay.subscribe(subscription, filters);
      }
    },
    [subscription, enabled, filters],
  );

  React.useEffect(() => {
    if (subscription) {
      !enabled ? stopSubscription() : validateRelaysStatus();
      return;
    }

    if (enabled) {
      if (events.length) setEvents([]);
      startSubscription();
      return;
    }

    return () => {
      stopSubscription();
    };
  }, [enabled, subscription]);

  React.useEffect(() => {
    if (subscription && enabled) {
      addRelayListener('relay:firstconnect', handleResubscription);
      addRelayListener('relay:reconnect', handleResubscription);

      return () => {
        removeRelayListener('relay:firstconnect', handleResubscription);
        removeRelayListener('relay:reconnect', handleResubscription);
      };
    }
  }, [handleResubscription]);

  return {
    loading,
    subscription,
    events,
  };
};
