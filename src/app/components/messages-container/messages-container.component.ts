import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageComponent } from '../message/message.component';
import { FirebaseChannelService, Message } from '../../services/firebase-channel.service';
import { NgFor } from '@angular/common';
import { FirebaseMessageService } from '../../services/firebase-messages.service';

@Component({
  selector: 'app-messages-container',
  standalone: true,
  imports: [MessageComponent, NgFor],
  templateUrl: './messages-container.component.html',
  styleUrl: './messages-container.component.scss'
})
export class MessagesContainerComponent {
  @Input() date = '';
  @Input() messages!: Message[] | undefined;
  @Input() channelId!: string;
  @Output() openThreadEv = new EventEmitter<Message>;

  constructor(private channelService: FirebaseChannelService,
    private messageService: FirebaseMessageService) { }

  openThread(message: Message) {
    this.openThreadEv.emit(message);
  }

  getFormattedDay() {
    return this.messages && this.messages[0].date ? new Date(this.messages[0].date).toLocaleDateString('de-DE', {}) : undefined;
  }
}