import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent {

  private authService = inject(AuthService);

  get username(): string {
    return this.authService.getAccount()?.username ?? '';
  }

  logout(): void {
    this.authService.logout();
  }
}