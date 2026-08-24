import { PublicClientApplication } from '@azure/msal-browser';
import { environment } from '../../environments/environment';

export function MSALInstanceFactory(): PublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: environment.azure.clientId,
      authority: environment.azure.authority,
      redirectUri: environment.azure.redirectUri,
      postLogoutRedirectUri: environment.azure.redirectUri,
    },
    cache: {
      cacheLocation: 'sessionStorage',
    },
  });
}