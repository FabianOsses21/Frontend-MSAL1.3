import { Component, OnInit, inject } from '@angular/core';

import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',

  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
  ],

  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  readonly auth = inject(AuthService);

  private router = inject(Router);

  ngOnInit(): void {
    const path = window.location.pathname;

    if (
      this.auth.isLoggedIn() &&
      (path === '/' || path === '/login' || path === '/home')
    ) {
      void this.router.navigateByUrl('/dashboard');
    }
  }

  logout(): void {
    this.auth.logout();
  }
}