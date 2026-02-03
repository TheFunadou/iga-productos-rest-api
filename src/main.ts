import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { PrismaValidationFilter } from './common/filters/prisma-validation.filter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true
  });

  app.use(cookieParser())

  // --- CONFIGURACIÓN SWAGGER ---
  const config = new DocumentBuilder()
    .setTitle('API REST')
    .setDescription('Documentación de la API con Swagger')
    .setVersion('1.0')
    .addBearerAuth() // habilita JWT en auth
    .build();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      forbidNonWhitelisted: true,
      whitelist: true,
    }),
  );

  app.useGlobalFilters(
    new PrismaExceptionFilter(),
    new PrismaValidationFilter(),
  );

  const configService = app.get(ConfigService);
  const port = configService.get("PORT") || 3000;

  app.enableCors({
    origin: ["http://localhost:3000", "https://ratings-banana-found-briefly.trycloudflare.com", "http://localhost:5173", "http://192.168.0.27:5173"],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-CSRF-Token',
      'X-Requested-With',
    ],
  });

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
  await app.listen(port);
  console.log("Servidor activo en:", port);
}
bootstrap();
