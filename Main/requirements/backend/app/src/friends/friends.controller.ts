import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BoundedIntPipe } from '../common/pipes/bounded-int.pipe';
import { FriendsService } from './friends.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: number;
    username?: string;
  };
};

@UseGuards(JwtAuthGuard)
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post(':userId')
  sendFriendRequest(
    @Req() req: AuthenticatedRequest,
    @Param('userId', BoundedIntPipe) userId: number,
  ) {
    return this.friendsService.sendFriendRequest(req.user.userId, userId);
  }

  @Patch(':userId/accept')
  acceptFriendRequest(
    @Req() req: AuthenticatedRequest,
    @Param('userId', BoundedIntPipe) userId: number,
  ) {
    return this.friendsService.acceptFriendRequest(req.user.userId, userId);
  }

  @Delete(':userId')
  removeFriendship(
    @Req() req: AuthenticatedRequest,
    @Param('userId', BoundedIntPipe) userId: number,
  ) {
    return this.friendsService.removeFriendship(req.user.userId, userId);
  }

  @Get()
  getFriends(@Req() req: AuthenticatedRequest) {
    return this.friendsService.getFriends(req.user.userId);
  }

  @Get('requests')
  getReceivedFriendRequests(@Req() req: AuthenticatedRequest) {
    return this.friendsService.getReceivedFriendRequests(req.user.userId);
  }

  @Get('sent-requests')
  getSentFriendRequests(@Req() req: AuthenticatedRequest) {
    return this.friendsService.getSentFriendRequests(req.user.userId);
  }

  
}