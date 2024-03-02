import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UserProfileDialogComponent } from '../user-profile-dialog/user-profile-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ChannelData, FirebaseChannelService } from '../../../services/firebase-channel.service';
import { FormsModule } from '@angular/forms';
import { NgClass, NgIf } from '@angular/common';

@Component({
  selector: 'app-edit-channel',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, FormsModule, NgClass, NgIf],
  templateUrl: './edit-channel.component.html',
  styleUrl: './edit-channel.component.scss'
})
export class EditChannelComponent {
  constructor(public dialogRef: MatDialogRef<UserProfileDialogComponent>,
    private channelService: FirebaseChannelService,
    @Inject(MAT_DIALOG_DATA) public channel: ChannelData) { }

  name = this.channel.channelName;
  desc = this.channel.channelDescription;
  nameDisplayMode: "view" | "edit" = "view";
  descDisplayMode: "view" | "edit" = "view";

  closeDialog() {
    this.dialogRef.close();
  }

  editName() {
    this.nameDisplayMode = "edit";
  }

  editDesc() {
    this.descDisplayMode = "edit";
  }

  saveName() {
    console.log('name saved');
    this.nameDisplayMode = 'view';
  }

  saveDesc() {
    console.log('desc saved');
    this.descDisplayMode = 'view';
  }

  leaveChannel() {
    console.log('You are out!')
  }


}
