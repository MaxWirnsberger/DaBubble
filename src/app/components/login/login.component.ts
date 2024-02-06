import { Component } from '@angular/core';
import { LoginDialogComponent } from './login-dialog/login-dialog.component';
import { SignUpDialogComponent } from './sign-up-dialog/sign-up-dialog.component';
import { SelectAvatarComponent } from './select-avatar/select-avatar.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    LoginDialogComponent,
    SignUpDialogComponent,
    SelectAvatarComponent,
    ForgotPasswordComponent,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {

  createContact(){
    let contactButton = document.getElementById('create-contact-button')
    let SingIn = document.getElementById('create-contact-dialog')
    let loginDialog = document.getElementById('login-dialog')
    
    SingIn?.classList.remove('display_none')
    contactButton?.classList.add('display_none')
    loginDialog?.classList.add('display_none')
  }

}
