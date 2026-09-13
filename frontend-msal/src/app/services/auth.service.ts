import { Injectable, inject } from '@angular/core';
import { MsalService } from '@azure/msal-angular';

import { environment } from '../../environments/environment';
import { Rol } from '../models/barrio.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private msalService = inject(MsalService);

    login(): void {
  this.msalService.loginRedirect({
    scopes: [
      'openid',
      'profile',
    ],
    prompt: 'select_account',
    redirectStartPage: `${window.location.origin}/dashboard`,
  });
}
    registrar(): void {
    this.msalService.loginRedirect({
      scopes: ['openid', 'profile'],
      prompt: 'select_account',
      redirectStartPage: window.location.origin + '/',
    });
  }

  logout(): void {
    this.msalService.logoutRedirect({
      account: this.getAccount() ?? undefined,
      postLogoutRedirectUri: environment.azure.redirectUri,
    });
  }

  getAccount() {
    return this.msalService.instance.getActiveAccount();
  }

  isLoggedIn(): boolean {
    return !!this.getAccount();
  }

  get userId(): string {
    return this.getAccount()?.homeAccountId ?? '';
  }

  get username(): string {
    const account = this.getAccount();

    return account?.name ?? account?.username ?? '';
  }

  get roles(): Rol[] {
    const claims = this.getAccount()?.idTokenClaims as
      | { roles?: unknown }
      | undefined;

    const valores = Array.isArray(claims?.roles)
      ? claims.roles.filter(
          (valor): valor is string => typeof valor === 'string',
        )
      : [];

    const equivalencias: Record<string, Rol> = {
      Admin: 'Admin',
      Funcionario: 'Funcionario',
      Vecino: 'Vecino',

      ROLE_ADMINISTRADOR: 'Admin',
      ROLE_OPERADOR: 'Funcionario',
      ROLE_CLIENTE: 'Vecino',
    };

    return [...new Set(
      valores
        .map((valor) => equivalencias[valor])
        .filter((rol): rol is Rol => !!rol),
    )];
  }

  hasAnyRole(...roles: Rol[]): boolean {
    return roles.some((rol) => this.roles.includes(rol));
  }

  get puedeCrear(): boolean {
    return this.hasAnyRole('Admin', 'Funcionario', 'Vecino');
  }

  get puedeVerTodos(): boolean {
    return this.hasAnyRole('Admin', 'Funcionario');
  }

  get puedeCambiarEstado(): boolean {
    return this.hasAnyRole('Admin', 'Funcionario');
  }

  get puedeVerCatalogo(): boolean {
    return this.hasAnyRole('Admin', 'Funcionario');
  }

  get puedeGestionarCatalogo(): boolean {
    return this.hasAnyRole('Admin');
  }
  mostrarRolesAzure(): void {
  const account = this.getAccount();

  console.log(
    'Roles recibidos de Azure:',
    account?.idTokenClaims?.['roles'] ?? 'Sin claim roles',
  );

  console.log('Roles reconocidos por BarrioDigital:', this.roles);
}
}