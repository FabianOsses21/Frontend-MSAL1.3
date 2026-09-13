import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

import { LoginComponent } from './components/login/login';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },

  {
    path: 'login',
    component: LoginComponent,
  },

  {
    path: 'dashboard',
    canActivate: [MsalGuard],

    loadComponent: () =>
      import('./components/dashboard/dashboard')
        .then((m) => m.DashboardComponent),
  },

  {
    path: 'requests',
    canActivate: [MsalGuard],

    loadComponent: () =>
      import('./components/requests/requests')
        .then((m) => m.RequestsComponent),
  },

  {
    path: 'catalog',
    canActivate: [MsalGuard, roleGuard],

    data: {
      roles: ['Admin', 'Funcionario'],
    },

    loadComponent: () =>
      import('./components/catalog/catalog')
        .then((m) => m.CatalogComponent),
  },

  {
    path: 'home',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },

  {
    path: '**',
    redirectTo: 'dashboard',
  },
];