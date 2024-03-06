import { NgIf } from '@angular/common';
import { Component, Input  } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { MatSelect } from '@angular/material/select';
import { FirebaseStorageService } from '../../services/firebase-storage.service';
import { FirebaseChannelService } from '../../services/firebase-channel.service';
import { FirebaseUserService } from '../../services/firebase-user.service';
import { HomeService } from '../../services/home.service';
import { FirebaseMessageService } from '../../services/firebase-messages.service';

@Component({
  selector: 'app-messages-input',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    PickerModule,
    NgIf,
  ],
  templateUrl: './messages-input.component.html',
  styleUrl: './messages-input.component.scss',
})
export class MessagesInputComponent {
  @Input() pathForMessage: string = '';

  showEmojiPicker = false;
  message = '';
  userToPick: boolean = false;
  messageForm: FormGroup = new FormGroup({});
  pickedUser = new FormControl('');
  userList: string[] = [];
  currentUserList: string[] = [];
  currentUserString: string = '';

  constructor(
    private homeService: HomeService,
    private storage: FirebaseStorageService,
    private channels: FirebaseChannelService,
    private users: FirebaseUserService,
    private messageService: FirebaseMessageService
  ) {}

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(event: any) {
    const { message } = this;
    const text = `${message}${event.emoji.native}`;
    this.message = text;
  }

  async showUser(select: MatSelect): Promise<void> {
    await this.getUsersOfChannel();
    setTimeout(() => {
      select.open();
    }, 500);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.handleFile(file);
  }

  async handleFile(file: File) {
    await this.storage.uploadImageInStorage(file.name, file);
    await this.storage.getFileFromStorage(file.name);
    const text = `${this.storage.fileUrl} ${this.message}`;
    this.message = text;
  }

  async getUsersOfChannel() {
    this.userList = [];
    await this.users.getUserData();
    this.homeService.selectedChannel?.users.forEach((usersInChannel) => {
      this.filterUserName(usersInChannel);
    });
  }

  filterUserName(channelUsers: string) {
    let searchedUser = this.users.allUsers.find(
      (user) => user.userId === channelUsers
    );
    if (searchedUser) {
      this.userList.push(searchedUser.name);
    } else {
      console.log('Benutzer nicht gefunden');
    }
  }

  addUPickedUser() {
    let userList = this.pickedUser.value ? [this.pickedUser.value] : [];
    this.message = this.removeMatchingSubstrings(
      this.currentUserString,
      this.message
    );
    this.synchronizeLists(userList, this.currentUserList);
    this.currentUserString = this.createStringFromUserList(
      this.currentUserList
    );
    const text = `${this.currentUserString} ${this.message}`;
    this.message = text;
  }

  synchronizeLists(listA: string[], listB: string[]) {
    listA.forEach((item) => {
      if (!listB.includes(item)) {
        listB.push(item);
      }
    });

    listB.forEach((item, index) => {
      if (!listA.includes(item)) {
        listB.splice(index, 1);
      }
    });
  }

  removeMatchingSubstrings(stringA: string, stringB: string) {
    let substrings = stringA.split(', ');
    substrings.forEach((substring) => {
      stringB = stringB.replace(substring, '');
    });
    return stringB;
  }

  createStringFromUserList(currentUserList: string[]) {
    let text = '';
    currentUserList.forEach((user) => {
      text += `@${user}:`;
    });
    return text;
  }

  sendMessageToFirebase() {
    debugger
    this.channels.currentChannelForMessages;
    let currentUser = this.channels.getCurrentUser();
    this.messageService.updateMessage(this.message, currentUser?.authId, this.pathForMessage);
    this.message = '';
  }
}
