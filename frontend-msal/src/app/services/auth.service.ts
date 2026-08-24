import { Injectable, inject } from '@angular/core';
import { MsalService } from '@azure/msal-angular';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private msalService = inject(MsalService);

  login(): void {
    this.msalService.loginRedirect({
      scopes: ['openid', 'profile'],
      prompt: 'select_account',
    });
  }

  logout(): void {
    this.msalService.logoutRedirect();
  }

  isLoggedIn(): boolean {
    return this.msalService.instance.getAllAccounts().length > 0;
  }

  getAccount() {
    return this.msalService.instance.getActiveAccount();
  }
}