import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { devAuthMiddleware } from './common/dev-auth.middleware.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Local/dev hand-testing only (e.g. via Bruno) — never enabled in production.
  if (process.env.NODE_ENV !== 'production') {
    app.use(devAuthMiddleware);
  }
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
