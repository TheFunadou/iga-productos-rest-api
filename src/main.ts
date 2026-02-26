import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { PrismaValidationFilter } from './common/filters/prisma-validation.filter';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true
  });

  const configService = app.get(ConfigService);
  const port = configService.get("PORT") || 3000;
  const nodeEnv = configService.get("NODE_ENV") || "DEV";

  // HELMET - Agregar DESPUÉS de crear la app, ANTES de cookieParser
  app.use(helmet({
    // Content Security Policy - Desactivar en desarrollo, activar en producción
    contentSecurityPolicy: nodeEnv === "production" ? {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],  // Para Swagger en dev
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],  // Permitir imágenes de CDN
        connectSrc: ["'self'"],  // APIs externas si usas
      },
    } : false,
    // Cross-Origin - Configurar para permitir tu frontend
    crossOriginEmbedderPolicy: false,  // Desactivar si tienes problemas con recursos externos
    crossOriginResourcePolicy: { policy: "cross-origin" },  // Permitir recursos cross-origin
    // HSTS - Solo en producción con HTTPS
    hsts: nodeEnv === "production" ? {
      maxAge: 31536000,  // 1 año
      includeSubDomains: true,
      preload: true
    } : false,
  }));

  app.use(cookieParser());

  // --- CONFIGURACIÓN SWAGGER ---
  if (nodeEnv !== "production") {
    const config = new DocumentBuilder()
      .setTitle('IgaProductos API Docs')
      .setDescription('Documentación de la API con Swagger')
      .setVersion('1.0')
      .addBearerAuth() // habilita JWT en auth
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

  };

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
    origin: ["http://localhost:3001", "https://qualify-routines-administrators-novel.trycloudflare.com", "http://localhost:5173", "http://192.168.0.27:5173"],
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

  await app.listen(port);
  console.log("Servidor activo en:", port);
}
bootstrap();
