import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AccessSummaryDto, AuthSessionDto, UserDto } from '../common/contracts';
import type { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccessService } from '../access/access.service';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly access: AccessService,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // anti force brute
  login(@Body() dto: LoginDto): Promise<AuthSessionDto> {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto): Promise<AuthSessionDto> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser): Promise<UserDto> {
    return this.auth.me(user.id);
  }

  /** Résumé des droits — équivalent serveur de access.ts côté mobile. */
  @Get('me/access')
  @UseGuards(JwtAuthGuard)
  meAccess(@CurrentUser() user: AuthUser): Promise<AccessSummaryDto> {
    return this.access.grantsFor(user);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: AuthUser): Promise<{ success: boolean }> {
    return this.auth.logout(user.id);
  }
}
