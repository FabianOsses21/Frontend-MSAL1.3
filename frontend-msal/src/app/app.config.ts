import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners
} from '@angular/core';

import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import {
  MsalService,
  MsalGuard,
  MsalBroadcastService,
  MSAL_INSTANCE,
  MSAL_GUARD_CONFIG
} from '@azure/msal-angular';

import { InteractionType } from '@azure/msal-browser';

import { routes } from './app.routes';
import { MSALInstanceFactory } from './factories/msal-instance.factory';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    provideRouter(routes),

    provideHttpClient(),

    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory,
    },

    {
      provide: MSAL_GUARD_CONFIG,
      useValue: {
        interactionType: InteractionType.Redirect,
        authRequest: {
          scopes: ['openid', 'profile'],
        },
      },
    },

    MsalService,
    MsalGuard,
    MsalBroadcastService,
  ],
};