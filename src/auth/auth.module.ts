import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard, RolesGuard } from './guards';
import { AdminPasswordGuard } from './admin-password.guard';
import { jwtSecret, sessionTtlSeconds } from '../config';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: jwtSecret(),
        signOptions: { expiresIn: sessionTtlSeconds, algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard, AdminPasswordGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, AdminPasswordGuard],
})
export class AuthModule {}
