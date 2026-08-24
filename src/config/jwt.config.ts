import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => {
  const secret = process.env.JWT_SECRET;

  // En test, Jest ne charge pas le .env : on autorise une valeur factice.
  if (!secret && process.env.NODE_ENV !== 'test') {
    throw new Error(
      "JWT_SECRET est manquant. Définissez cette variable d'environnement avant de démarrer l'application.",
    );
  }

  return {
    secret: secret || 'test-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  };
});
