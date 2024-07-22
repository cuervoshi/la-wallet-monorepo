import { usePathname, useRouter } from '@/navigation';
import { STORAGE_IDENTITY_KEY } from '@/utils/constants';
import { parseContent, useConfig, useIdentity, useNostr } from '@lawallet/react';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import SpinnerView from '../Spinner/SpinnerView';

// interface RouterInfo {
//   disconnectedPaths: string[]; // Routes that require you to NOT have a connected account
//   connectedPaths: string[]; // Routes that require you to HAVE a connected account
// }

// const AppRouter: RouterInfo = {
//   disconnectedPaths: ['/', '/start', '/signup', '/login', '/reset'],
//   connectedPaths: ['/dashboard', '/deposit', '/extensions', '/scan', '/settings', '/transactions', '/transfer'],
// };

export type StoragedIdentityInfo = {
  username: string;
  pubkey: string;
  privateKey: string;
};

// const isProtectedRoute = (path: string, paths: string[]): boolean => {
//   let isProtected: boolean = false;

//   paths.forEach((route) => {
//     if (route === path.toLowerCase()) isProtected = true;
//   });

//   return isProtected;
// };

const protectedRoutes: string[] = [
  '/dashboard',
  '/transfer',
  '/deposit',
  '/scan',
  '/settings',
  '/transactions',
  '/plugins',
];

const isProtectedRoute = (path: string): boolean => {
  let isProtected: boolean = false;

  protectedRoutes.forEach((route) => {
    if (path.startsWith(route)) isProtected = true;
  });

  return isProtected;
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const identity = useIdentity();
  const { initializeSigner } = useNostr();

  // const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const router = useRouter();
  const config = useConfig();
  const pathname = usePathname();
  const params = useSearchParams();

  const authenticate = async (privateKey: string) => {
    const initialized: boolean = await identity.initializeFromPrivateKey(privateKey);
    if (initialized) initializeSigner(identity.signer);
    // setIsLoading(false);

    return initialized;
  };

  const loadIdentityFromStorage = async () => {
    try {
      const storageIdentity = await config.storage.getItem(STORAGE_IDENTITY_KEY);

      if (storageIdentity) {
        const parsedIdentity: StoragedIdentityInfo = parseContent(storageIdentity as string);

        const auth: boolean = await authenticate(parsedIdentity.privateKey);
        return auth;
      } else {
        identity.reset();
        // setIsLoading(false);
        return false;

        // // ******************************************
        // // PATCH: This code is used to facilitate the migration from localStorage to IndexedDB
        // // Date: 20/05/2024
        // // Remove this code after migrating the identity provider.
        // // ******************************************
        // const localStorageKey = localStorage.getItem(STORAGE_IDENTITY_KEY);
        // if (!localStorageKey) {
        //   identity.reset();
        //   setIsLoading(false);
        //   return false;
        // }
        // const parsedIdentity: StoragedIdentityInfo = parseContent(localStorageKey as string);
        // const auth: boolean = await authenticate(parsedIdentity.privateKey);
        // if (auth) {
        //   const IdentityToSave: StoragedIdentityInfo[] = [
        //     {
        //       username: parsedIdentity?.username ?? '',
        //       pubkey: parsedIdentity?.pubkey ?? '',
        //       privateKey: parsedIdentity.privateKey,
        //     },
        //   ];
        //   await config.storage.setItem(STORAGE_IDENTITY_KEY, JSON.stringify(IdentityToSave));
        // }
        // return auth;
        // // ******************************************
        // // After removing the patch, leave only this lines:
        // // identity.reset();
        // // setIsLoading(false);
        // // return false;
        // // ******************************************
      }
    } catch {
      // setIsLoading(false);
      return false;
    }
  };

  useEffect(() => {
    loadIdentityFromStorage();
  }, []);

  useLayoutEffect(() => {
    if (!identity.loading) {
      const protectedFlag = isProtectedRoute(pathname);
      const userLogged: boolean = Boolean(identity.pubkey.length);
      const nonce: string = params.get('i') || '';
      const card: string = params.get('c') || '';

      switch (true) {
        case !userLogged && pathname == '/' && !nonce:
          router.push('/');
          break;

        case !userLogged && protectedFlag:
          router.push('/');
          break;

        case userLogged && !protectedFlag:
          card ? router.push(`/settings/cards?c=${card}`) : router.push('/dashboard');
          break;
      }
    }
  }, [pathname, identity.pubkey, identity.loading]);

  const hydrateApp = useMemo((): boolean => {
    if (identity.loading) return false;

    const protectedFlag: boolean = isProtectedRoute(pathname);
    if (identity.pubkey.length && protectedFlag) return true;
    if (!identity.pubkey && !protectedFlag) return true;

    return false;
  }, [identity.loading, pathname]);

  return !hydrateApp ? <SpinnerView /> : children;
};

export default AuthProvider;
