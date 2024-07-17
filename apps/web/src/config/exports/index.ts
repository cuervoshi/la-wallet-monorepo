import { createConfig, createStorage } from '@lawallet/react';
import { ConfigProps } from '@lawallet/react/types';
import { createTheme } from '@lawallet/ui';
import { del, get, set } from 'idb-keyval';
import federationConfig from '../federationConfig.json';
import pluginsConfig from '../pluginsConfig.json';
import themeConfig from '../themeConfig.json';

const storage = createStorage({
  storage: {
    async getItem(name) {
      return get(name).then((val) => val).catch(() => localStorage.getItem(name))
    },
    async setItem(name, value) {
      await set(name, value).catch(() => localStorage.setItem(name, value));
    },
    async removeItem(name) {
      await del(name).catch(() => localStorage.removeItem(name));
    },
  },
});

export const config: ConfigProps = createConfig({
  ...federationConfig,
  storage,
});

export const appTheme = createTheme(themeConfig);

export const pluginsEnabled: boolean = Boolean(pluginsConfig.enabled);
