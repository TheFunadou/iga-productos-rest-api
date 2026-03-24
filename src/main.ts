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

  app.use(
    helmet({
      contentSecurityPolicy:
        nodeEnv === "production" || nodeEnv === "testing"
          ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", "data:", "https:"],
              connectSrc: [
                "'self'",
                "https://*.igaproductos.com",
              ],
            },
          }
          : false,

      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },

      hsts:
        nodeEnv === "production" || nodeEnv === "testing"
          ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
          : false,
    }),
  );

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
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://igaproductos.com",
        "https://www.igaproductos.com",
        "tauri://localhost",
        "http://tauri.localhost",
        "https://tauri.localhost"

      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  });
  await app.listen(port);
  console.log("Servidor activo en:", port);
}
bootstrap();
