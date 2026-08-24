import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserResponseDto } from '../users/dto/user-response.dto';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: { create: jest.Mock; findByUsername: jest.Mock };
  let jwtService: { signAsync: jest.Mock };

  const registerDto = { username: 'johndoe', password: 'Passw0rd!' };
  const userResponse = new UserResponseDto({
    id: 'user-1',
    username: 'johndoe',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    usersService = {
      create: jest.fn(),
      findByUsername: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'jwt.secret' ? 'test-secret' : '24h',
            ),
          },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  describe('register', () => {
    it("crée l'utilisateur et retourne un accessToken", async () => {
      usersService.create.mockResolvedValue(userResponse);

      const result = await authService.register(registerDto);

      expect(usersService.create).toHaveBeenCalledWith(registerDto);
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: userResponse.id, username: userResponse.username },
        expect.objectContaining({ secret: 'test-secret' }),
      );
      expect(result.accessToken).toBe('signed-jwt-token');
      expect(result.user).toBe(userResponse);
    });
  });

  describe('login', () => {
    const makeUser = (isValid: boolean) => ({
      id: 'user-1',
      username: 'johndoe',
      password: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
      validatePassword: jest.fn().mockResolvedValue(isValid),
    });

    it('retourne un accessToken pour des identifiants valides', async () => {
      const user = makeUser(true);
      usersService.findByUsername.mockResolvedValue(user);

      const result = await authService.login({
        username: 'johndoe',
        password: 'Passw0rd!',
      });

      expect(user.validatePassword).toHaveBeenCalledWith('Passw0rd!');
      expect(result.accessToken).toBe('signed-jwt-token');
      expect(result.user.username).toBe('johndoe');
    });

    it("lève une UnauthorizedException si l'utilisateur n'existe pas", async () => {
      usersService.findByUsername.mockResolvedValue(null);

      await expect(
        authService.login({ username: 'unknown', password: 'whatever' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lève une UnauthorizedException si le mot de passe est incorrect', async () => {
      usersService.findByUsername.mockResolvedValue(makeUser(false));

      await expect(
        authService.login({ username: 'johndoe', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
