"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const friends_service_1 = require("./friends.service");
let FriendsController = class FriendsController {
    constructor(friendsService) {
        this.friendsService = friendsService;
    }
    sendFriendRequest(req, userId) {
        return this.friendsService.sendFriendRequest(req.user.userId, userId);
    }
    acceptFriendRequest(req, userId) {
        return this.friendsService.acceptFriendRequest(req.user.userId, userId);
    }
    removeFriendship(req, userId) {
        return this.friendsService.removeFriendship(req.user.userId, userId);
    }
    getFriends(req) {
        return this.friendsService.getFriends(req.user.userId);
    }
    getReceivedFriendRequests(req) {
        return this.friendsService.getReceivedFriendRequests(req.user.userId);
    }
    getSentFriendRequests(req) {
        return this.friendsService.getSentFriendRequests(req.user.userId);
    }
};
exports.FriendsController = FriendsController;
__decorate([
    (0, common_1.Post)(':userId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], FriendsController.prototype, "sendFriendRequest", null);
__decorate([
    (0, common_1.Patch)(':userId/accept'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], FriendsController.prototype, "acceptFriendRequest", null);
__decorate([
    (0, common_1.Delete)(':userId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], FriendsController.prototype, "removeFriendship", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FriendsController.prototype, "getFriends", null);
__decorate([
    (0, common_1.Get)('requests'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FriendsController.prototype, "getReceivedFriendRequests", null);
__decorate([
    (0, common_1.Get)('sent-requests'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FriendsController.prototype, "getSentFriendRequests", null);
exports.FriendsController = FriendsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('friends'),
    __metadata("design:paramtypes", [friends_service_1.FriendsService])
], FriendsController);
