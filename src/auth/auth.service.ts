import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    try {
      const user = await this.usersService.create(registerDto);
      const accessToken = await this.generateToken(user);

      return new AuthResponseDto(accessToken, user);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException("Erreur lors de l'inscription");
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByUsername(loginDto.username);

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isPasswordValid = await user.validatePassword(loginDto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const userResponse = new UserResponseDto(user);
    const accessToken = await this.generateToken(userResponse);

    return new AuthResponseDto(accessToken, userResponse);
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByUsername(username);

    if (user && (await user.validatePassword(password))) {
      return user;
    }

    return null;
  }

  private async generateToken(user: UserResponseDto): Promise<string> {
    const payload = {
      sub: user.id,
      username: user.username,
    };

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '24h';
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
      expiresIn: expiresIn as any,
    });
  }
}
