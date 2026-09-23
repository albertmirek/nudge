import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Trust exactly one hop (the edge proxy in front of the app, e.g. Render) so req.ip is the
  // client's real address instead of the proxy's. Must not be widened further: a too-permissive
  // trust proxy count lets a client spoof X-Forwarded-For and evade per-IP rate limiting.
  app.set('trust proxy', 1);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
