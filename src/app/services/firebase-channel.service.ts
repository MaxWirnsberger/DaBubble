import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  QueryDocumentSnapshot,
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  arrayUnion,
  setDoc,
  Unsubscribe,
} from '@angular/fire/firestore';
import { Channel } from '../models/channel.class';
import { UserData } from './firebase-user.service';
import { HomeService } from './home.service';
import { FirebaseAuthService } from './firebase-auth.service';
import { Router } from '@angular/router';
import { getAuth } from 'firebase/auth';
import { FirebaseMessageService } from './firebase-messages.service';

@Injectable({
  providedIn: 'root',
})
export class FirebaseChannelService {
  //https://medium.com/swlh/using-firestore-with-typescript-65bd2a602945
  //https://www.typescriptlang.org/docs/handbook/2/generics.html

  channels: ChannelData[] = [];
  unsubChannels;
  firestore: Firestore = inject(Firestore);
  channelId: string = '';
  currentUser: string = '';
  auth = getAuth();
  allChannels: Channel[] = [];
  currentChannel?: Channel;
  users: Map<string, UserData> = new Map();
  userChannels: ChannelData[] = [];
  userChannelsMessages: Map<string, messages> = new Map();
  replies: Map<string, Message[]> = new Map();
  unsubUsers: any[] = [];
  unsubReplies: any[] = [];
  unsubUserChannels: any[] = [];
  unsubUserChannelsMessages: any[] = [];
  currentChannelForMessages: string = 'grDvJ7eyWqziuvoDsr41';
  currentThreadForMessage: string | undefined = '';
  messagesToSeach: searchData[] = [];
  chatMessagesToSeach: searchData[] = [];
  unsubUserChats: Unsubscribe | undefined;
  unsubUserChatMessages: Unsubscribe[] = [];
  unsubUserChatReplies: Unsubscribe[] = [];
  userChats: Chat[] = [];
  userChatMessages: Map<string, messages> = new Map();
  userChatReplies: Map<string, Message[]> = new Map();

  constructor(
    private homeService: HomeService,
    private router: Router,
    public authService: FirebaseAuthService
  ) {
    this.unsubChannels = this.subChannelsList();
    this.controlCurrentUser()
      .then(() => {
        this.getUserChats(this.authService.loggedInUser);
        return this.getUserChannels(this.authService.loggedInUser);
      })
      .then((unsubUserChannels) => {
        this.unsubUserChannels.push(unsubUserChannels);
      });
  }

  converterMessage = {
    toFirestore: (data: Message) => {
      delete data.created;
      return data;
    },
    fromFirestore: (snap: QueryDocumentSnapshot) => {
      const rawData = snap.data();
      rawData['created'] = new Date(snap.data()['timestamp']);
      return rawData as Message;
    },
  };
  converterUser = {
    toFirestore: (data: UserData) => data,
    fromFirestore: (snap: QueryDocumentSnapshot) => {
      return snap.data() as UserData;
    },
  };
  converterChannel = {
    toFirestore: (data: ChannelData) => data,
    fromFirestore: (snap: QueryDocumentSnapshot) => {
      snap.data()['id'] = snap.id;
      return snap.data() as ChannelData;
    },
  };

  async controlCurrentUser() {
    return new Promise((resolve, reject) => {
      this.auth.onAuthStateChanged((user) => {
        if (user) {
          this.authService.loggedInUser = user.uid;
          this.router.navigate(['/home']);
          resolve(user.uid);
        } else {
          this.router.navigate(['/']);
          reject('error');
        }
      });
    });
  }

  getUserChats(userId: string) {
    const q = query(
      collection(this.firestore, 'chats'),
      where('users', 'array-contains', userId)
    );
    this.unsubUserChats = onSnapshot(q, (chats) => {
      this.userChats = [];
      chats.forEach((chat) => {
        let rawData = chat.data();
        rawData['id'] = chat.id;
        this.userChats.push(rawData as Chat);
        if (!this.userChatMessages.has(chat.id)) {
          this.userChatMessages.set(chat.id, {});
          this.unsubUserChatMessages.push(this.getChatMessages(chat.id));
        }
      });
    });
  }

  private getChatMessages(chatId: string) {
    const messagesRef = query(
      collection(this.firestore, 'chats', chatId, 'messages'),
      orderBy('timestamp')
    ).withConverter(this.converterMessage);
    return onSnapshot(messagesRef, (messages) => {
      const messagesObj: messages = {};
      let dayKey = '';
      messages.forEach((message) => {
        let rawData = message.data();
        rawData['id'] = message.id;
        this.saveChatMessageForSearchingFiel(
          chatId,
          rawData.message,
          message.id
        );
        if (message.data()['date'] === dayKey) {
          messagesObj[dayKey].push(rawData);
        } else {
          dayKey = message.data()['date']!;
          messagesObj[dayKey] = [rawData];
        }
        this.getChatReplies(chatId, message.id);
      });
      this.userChatMessages.set(chatId, messagesObj);
    });
  }

  private getChatReplies(chatId: string, messageId: string) {
    const repliesRef = query(
      collection(
        this.firestore,
        'chats',
        chatId,
        'messages',
        messageId,
        'replies'
      ),
      orderBy('timestamp')
    ).withConverter(this.converterMessage);

    if (!this.userChatReplies.has(messageId)) {
      this.unsubUserChatReplies.push(
        onSnapshot(repliesRef, (replies) => {
          const value: Message[] = [];
          replies.forEach((reply) => {
            let rawData = reply.data();
            rawData['id'] = reply.id;
            const replyData = rawData as Message;
            replyData.id = reply.id;
            value.push(replyData);
          });
          this.userChatReplies.set(messageId, value);
        })
      );
    }
  }

  getUserChannels(userId: string) {
    const q = query(
      collection(this.firestore, 'channels'),
      where('users', 'array-contains', userId)
    );
    return onSnapshot(q, (channels) => {
      this.userChannels = [];
      channels.forEach((channel) => {
        let rawData = channel.data();
        rawData['id'] = channel.id;
        if (
          !this.homeService.getActiveChannel() &&
          this.homeService.getScreenMode() !== 'small'
        )
          this.homeService.setChannel(rawData as ChannelData);
        this.userChannels.push(rawData as ChannelData);
        this.userChannels.at(-1)!.id = channel.id;
        this.getChannelUsers(rawData as ChannelData);
        if (!this.userChannelsMessages.has(channel.id)) {
          this.userChannelsMessages.set(channel.id, {});
          this.unsubUserChannelsMessages.push(
            this.getChannelMessages(channel.id)
          );
        }
      });
    });
  }

  private getChannelUsers(channel: ChannelData) {
    for (let user of channel.users) {
      if (!this.users.has(user)) {
        this.unsubUsers.push(
          onSnapshot(
            doc(this.firestore, 'users', user).withConverter(
              this.converterUser
            ),
            (user) => {
              let rawData = user.data();
              if (rawData) {
                rawData['id'] = user.id;
                this.users.set(user.id, rawData as UserData);
              }
            }
          )
        );
      }
    }
  }

  private getChannelMessages(channelId: string) {
    const messagesRef = query(
      collection(this.firestore, 'channels', channelId, 'messages'),
      orderBy('timestamp')
    ).withConverter(this.converterMessage);
    return onSnapshot(messagesRef, (messages) => {
      const messagesObj: messages = {};
      let dayKey = '';
      messages.forEach((message) => {
        let rawData = message.data();
        rawData['id'] = message.id;
        this.saveMessageForSearchingFiel(
          channelId,
          rawData.message,
          message.id
        );
        if (message.data()['date'] === dayKey) {
          messagesObj[dayKey].push(rawData);
        } else {
          dayKey = message.data()['date']!;
          messagesObj[dayKey] = [rawData];
        }
        this.getMessageReplies(channelId, message.id);
      });
      this.userChannelsMessages.set(channelId, messagesObj);
    });
  }

  editChannel(channel: ChannelData) {
    const docRef = doc(this.firestore, 'channels/' + channel.id).withConverter(
      this.converterChannel
    );
    updateDoc(docRef, channel);
  }

  saveMessageForSearchingFiel(
    channelId: string,
    message: string,
    messageId: string
  ) {
    let searchData: searchData = {
      channelId: '',
      channelName: '',
      messageId: '',
      message: '',
    };
    searchData.channelId = channelId;
    searchData.channelName = this.getChannelName(channelId);
    searchData.messageId = messageId;
    searchData.message = message;
    this.messagesToSeach.push(searchData);
  }

  saveChatMessageForSearchingFiel(
    chatId: string,
    message: string,
    messageId: string
  ) {
    let searchData: searchData = {
      channelId: '',
      channelName: '',
      messageId: '',
      message: '',
    };
    searchData.channelId = chatId;
    searchData.channelName = this.getChatPartner(chatId);
    searchData.messageId = messageId;
    searchData.message = message;
    this.chatMessagesToSeach.push(searchData);
  }

  getChannelName(channelId: string) {
    let currentChannel = this.userChannels.filter((channels) =>
      channels.id!.includes(channelId)
    );
    return currentChannel[0].channelName;
  }

  getChatPartner(chatId: string): string {
    let currentChat = this.userChats.filter((chat) =>
      chat.id!.includes(chatId)
    );

    for (let userArray of currentChat) {
      for (let user of userArray.users) {
        if (user !== this.authService.loggedInUser) {
          let chatUser = this.authService.allUsers.filter((u) =>
            u.userId.includes(user)
          );
          return chatUser.length > 0 ? chatUser[0].name : '';
        }
      }
    }
    return '';
  }

  private getMessageReplies(channelId: string, messageId: string) {
    const repliesRef = query(
      collection(
        this.firestore,
        'channels',
        channelId,
        'messages',
        messageId,
        'replies'
      ),
      orderBy('timestamp')
    ).withConverter(this.converterMessage);

    if (!this.replies.has(messageId)) {
      this.unsubReplies.push(
        onSnapshot(repliesRef, (replies) => {
          const value: Message[] = [];
          replies.forEach((reply) => {
            let rawData = reply.data();
            rawData['id'] = reply.id;
            const replyData = rawData as Message;
            replyData.id = reply.id;
            value.push(replyData);
          });
          this.replies.set(messageId, value);
        })
      );
    }
  }

  getCurrentUser() {
    return this.users.get(this.authService.loggedInUser);
  }

  getReplies(messageId: string) {
    return this.replies.get(messageId);
  }

  ngOnDestroy() {
    this.unsubChannels();
    this.unsubUserChannels.forEach((unsub) => unsub());
    this.unsubUserChannelsMessages.forEach((unsub) => unsub());
    this.unsubUsers.forEach((unsub) => unsub());
  }

  subChannelsList() {
    const q = query(this.getChannelsRef());
    return onSnapshot(q, (list) => {
      this.channels = [];
      list.forEach((element) => {
        this.channels.push(this.setChannelObject(element.data(), element.id));
      });
    });
  }

  getChannelsRef() {
    return collection(this.firestore, 'channels');
  }

  getSingleChannelRef(ChannelId: string) {
    return doc(collection(this.firestore, 'channels'), ChannelId);
  }

  async getCurrentChannel(ChannelId: string) {
    await onSnapshot(this.getSingleChannelRef(ChannelId), (element) => {
      this.currentChannel = new Channel(element.data());
    });
  }

  async addChannel(channel: any): Promise<string> {
    const docRef = await addDoc(
      collection(this.firestore, 'channels'),
      channel.toJson()
    );
    this.channelId = docRef.id;
    return this.channelId;
  }

  async updateChannel(
    editChannel: any,
    editChannelId: string
  ): Promise<boolean> {
    try {
      await updateDoc(
        this.getSingleChannelRef(editChannelId),
        JSON.parse(JSON.stringify(editChannel))
      );
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async getChannelData() {
    this.allChannels = [];
    let querySnapshot = await getDocs(collection(this.firestore, 'channels'));
    querySnapshot.forEach((channel: any) => {
      let channelData: Channel = channel.data();
      this.allChannels.push(channelData);
    });
  }

  addUserInOfficeChannel(userId: any) {
    const channelDocRef = doc(
      this.firestore,
      'channels',
      'grDvJ7eyWqziuvoDsr41'
    );
    updateDoc(channelDocRef, {
      users: arrayUnion(userId),
    })
      .then(() => {
        console.log("Neuer Benutzer wurde zum 'users'-Array hinzugefügt");
      })
      .catch((error) => {
        console.error('Fehler beim Hinzufügen eines neuen Benutzers:', error);
      });
  }

  setChannelObject(obj: any, id: string): ChannelData {
    return {
      id: id,
      channelName: obj.channelsName || 'unknown',
      channelDescription: obj.channelsDescription || '',
      users: obj.users || [],
      channelCreator: obj.channelCreater || '',
    };
  }

  async addDirectChat(recipient: string) {
    const docRef = await addDoc(collection(this.firestore, 'chats'), {
      users: [this.authService.loggedInUser, recipient],
    });
    let chatId = docRef.id;
    return chatId;
  }

  async addPersonalChat(Userid: any) {
    const docRef = await addDoc(collection(this.firestore, 'chats'), {
      users: [Userid],
    });
  }

  getDirectChat(chatId: string) {
    return this.userChats.find((chat) => chat.id === chatId);
  }
}
export interface ChannelData {
  id?: string;
  createdBy?: string;
  channelName: string;
  channelDescription: string;
  users: string[];
  channelCreator: string;
}

export interface messages {
  [key: string]: Message[];
}

export interface Message {
  id?: string;
  message: string;
  from?: string;
  timestamp?: number;
  date?: string;
  reactions?: any[];
  created?: Date;
}

export interface searchData {
  channelId: string;
  channelName: string;
  messageId: string;
  message: string;
}

export interface Chat {
  users: string[];
  recipient?: UserData;
  id: string;
}
