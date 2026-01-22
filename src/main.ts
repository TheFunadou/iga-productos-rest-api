import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { PrismaValidationFilter } from './common/filters/prisma-validation.filter';

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

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        // Devuelve explícitamente false o un origin conocido
        return callback(null, false);
      }

      if (
        origin.startsWith('http://localhost') ||
        origin.endsWith('.trycloudflare.com')
      ) {
        return callback(null, origin);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-CSRF-Token',
      'X-Requested-With', // 🔥 CLAVE
    ],
  });

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
  await app.listen(process.env.PORT ?? 3001);
  console.log("Servidor activo en ", process.env.PORT ?? 3001);
}
bootstrap();
