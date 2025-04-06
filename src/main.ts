import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { Logger } from 'nestjs-pino';
import { ConsoleLogger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
    .setTitle('Queue API')
    .setDescription('The app API description')
    .addTag('app')
    .addServer('/queue')
    // .addSecurity('JWT', { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();

  const document = SwaggerModule.createDocument(app, config);

  app.enableCors({ origin: "*", credentials: true });
  app.setGlobalPrefix("queue");
  app.useLogger(app.get(Logger));
  app.use(json({ limit: '30mb' }));
  app.use(urlencoded({ extended: true, limit: '30mb' }));

  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup('api', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(process.env.PORT ?? 3000);

  new ConsoleLogger("NestApplication").log(
    `Server running on ${await app.getUrl()}`,
  );

}
bootstrap();
