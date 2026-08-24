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
      // Si c'est déjà une exception HTTP, on la propage telle quelle
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      // Pour les autres erreurs, on log avec plus de détails
      console.error('Erreur lors de l\'inscription:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error,
        registerDto: { username: registerDto.username, password: '***' },
      });

      // Si c'est une erreur de base de données, on renvoie un message plus spécifique
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('database') || errorMessage.includes('connection') || errorMessage.includes('timeout')) {
          throw new BadRequestException('Erreur de connexion à la base de données. Vérifiez la configuration.');
        }
        if (errorMessage.includes('table') || errorMessage.includes('relation')) {
          throw new BadRequestException('Erreur de base de données. La table utilisateurs n\'existe peut-être pas.');
        }
      }

      throw new BadRequestException(
        error instanceof Error ? error.message : "Erreur lors de l'inscription"
      );
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

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.expiresIn') as any,
    });
  }
}
