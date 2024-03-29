import {
  DatePipe,
  JsonPipe,
  KeyValuePipe,
  NgClass,
  NgIf,
  CommonModule,
} from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  NgModule,
  Output,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { UserProfileDialogComponent } from '../dialog-components/user-profile-dialog/user-profile-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { UserData } from '../../services/firebase-user.service';
import {
  FirebaseChannelService,
  Message,
} from '../../services/firebase-channel.service';
import { HomeService } from '../../services/home.service';
import { FirebaseMessageService } from '../../services/firebase-messages.service';
import { LinkifyPipe } from '../../services/linkify.pipe';
import { FirebaseAuthService } from '../../services/firebase-auth.service';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [
    NgClass,
    NgIf,
    MatIconModule,
    PickerModule,
    MatButtonModule,
    KeyValuePipe,
    JsonPipe,
    DatePipe,
    CommonModule,
    LinkifyPipe,
  ],
  templateUrl: './message.component.html',
  styleUrl: './message.component.scss',
})
export class MessageComponent {
  @Input() message?: Message;
  @Input() showReplies = false;
  @Input() container: 'thread' | 'channel' = 'thread';
  @Output() openThreadEv = new EventEmitter<Message>();
  showEmojiPicker = false;
  emoji = '';

  constructor(
    public dialog: MatDialog,
    public channelService: FirebaseChannelService,
    private homeService: HomeService,
    private messageService: FirebaseMessageService,
    private authService: FirebaseAuthService
  ) { }

  @NgModule({
    declarations: [LinkifyPipe],
    imports: [CommonModule],
    exports: [LinkifyPipe], // Exportieren Sie die Pipe
  })
  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(event: any) {
    const { emoji } = this;
    const text = `${emoji}${event.emoji.native}`;
    this.addEmojiToFirebase(text);
  }

  addEmojiToFirebase(emoji: any) {
    this.messageService.UpdateMessageWithEmojis(
      emoji,
      this.message?.id,
      this.message?.reactions,
      this.container
    );
  }

  openThread() {
    this.homeService.setThreadMessage(this.message!);
    this.channelService.currentThreadForMessage = this.message?.id;
  }

  showUserProfile() {
    const user = this.getUser();
    if (user) {
      this.dialog.open(UserProfileDialogComponent, { data: user });
    }
  }

  getUser(): UserData | undefined {
    return this.message?.from
      ? this.channelService.users.get(this.message.from)
      : undefined;
  }

  getFormattedDay(date: Date | undefined) {
    if (date) {
      const dateSection = new Date(date).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      });
      const timeSection = new Date(date).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${dateSection} ${timeSection}`;
    }
    return undefined;
  }

  getReplies(): Message[] | undefined {
    if (this.message?.id) {
      if (this.homeService.mainContent === "channel") {
        return this.channelService.replies.get(this.message?.id);
      } else {
        return this.channelService.userChatReplies.get(this.message.id);
      }
    } else {
      return undefined;
    }
  }

  getLastReplyDate() {
    const lastReply = this.getReplies()?.at(-1);
    return lastReply ? this.getFormattedDay(lastReply.created) : undefined;
  }

  hasReplies() {
    const replies = this.getReplies();
    if (replies !== undefined) {
      return replies.length > 0;
    } else {
      return false;
    }
  }

  getCurrentUser() {
    return this.channelService.getCurrentUser();
  }

  addOrDeleteEmoji(emoji: any) {
    this.addEmojiToFirebase(emoji);
  }

  // isMessageMatched(message: any): boolean {
  //   if (this.messageService.searchTerm.length > 0) {
  //     return (
  //       this.messageService.messageMatches?.some(
  //         (match: any) => match.messageId === message.id
  //       ) ?? false
  //     );
  //   } else {
  //     return false;
  //   }
  // }

  isMessageFound(message: any): boolean {
    if (this.messageService.currentMatchId != "") {
      return (
        this.messageService.currentMatchId === message.id
      );
    } else {
      return false;
    }
  }

  getReactionsPeople(emoji:any) {
    let names:any = [];
    emoji.userId.forEach((id:any) => {
      let index = this.authService.allUsers.findIndex((user) => user.userId === id);
      if (index !== -1) {
        if (id === this.authService.loggedInUser) {
          names.push('Du');
        } else { names.push(this.authService.allUsers[index].name) }
      }
    });
    return names;
  }
}
