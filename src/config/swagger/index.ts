import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('112 dashboard project')
  .setVersion('1.0')
  .build();
