import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ErrorHandle } from './filter/custom.exetepsion.filter';
import { ConfigService } from '@nestjs/config';
import { ApiOAuth2, SwaggerModule } from '@nestjs/swagger';
import { swaggerConfig } from './config/swagger';
import * as cors from 'cors';
import { fetchEvery5s } from './utils/fetcheEvery5s';
import { fetchStatisticByGroup , operatorsWhere } from './utils/fetchEvery1hour';
import { Cron, CronExpression } from '@nestjs/schedule';
import { readSheet, readSheets } from './utils/google_cloud';
// import { readSheetdoc } from './utils/google_doc';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);



  app.use(
    cors({
      origin: '*',
      credentials: true,
    }),
  );
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new ErrorHandle());
  app.setGlobalPrefix('api/v1');
  
  const config = app.get(ConfigService);

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);


  const host = config.getOrThrow<string>('app.host');
  const port = config.getOrThrow<number>('app.port');

  await app.listen(port, host);
}
bootstrap();
