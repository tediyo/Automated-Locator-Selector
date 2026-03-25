import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) {}

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMe(@Request() req: any) {
        const user = await this.usersService.findOneById(req.user.userId);
        if (!user) return null;
        return {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber || '',
            isGoogleUser: !!user.googleId,
        };
    }

    @UseGuards(JwtAuthGuard)
    @Patch('me')
    async updateMe(@Request() req: any, @Body() body: { fullName?: string; phoneNumber?: string }) {
        const updated = await this.usersService.updateProfile(req.user.userId, body);
        if (!updated) return null;
        return {
            id: updated.id,
            fullName: updated.fullName,
            email: updated.email,
            phoneNumber: updated.phoneNumber || '',
        };
    }
}
