import * as dotenv from 'dotenv';
import { CacheModuleOptions, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { config } from './config';
import { connectDb } from './config/typeorm';
import { EventModule } from './module/events/events.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TelegrafModule } from 'nestjs-telegraf';
import { AgentsModule } from './module/agents/agents.module';
import { CacheModule } from '@nestjs/cache-manager';
import { ServicesModule } from './module/service/services.module';

dotenv.config();

@Module({
  imports: [
    ConfigModule.forRoot(config),
    TypeOrmModule.forRoot(connectDb),
    ScheduleModule.forRoot(),
    TelegrafModule.forRoot({
      token: process.env.BOT_TOKEN,
    }),
    EventModule,
    ServicesModule,
    AgentsModule,
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: (): CacheModuleOptions => ({
        ttl: 3600000,
      }),
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
