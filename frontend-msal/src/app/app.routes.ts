import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { LoginComponent } from './components/login/login';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'home',
    canActivate: [MsalGuard],
    loadComponent: () =>
      import('./components/home/home').then(
        (m) => m.HomeComponent
      ),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];