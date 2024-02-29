import * as dotenv from 'dotenv';
import {  CacheModuleOptions, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { config } from './config';
import { connectDb } from './config/typeorm';
import { UsersModule } from './module/users/users.module';
import { EventModule } from './module/events/events.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TelegrafModule } from 'nestjs-telegraf';
import { AgentsModule } from './module/agents/agents.module';
import { CacheModule } from '@nestjs/cache-manager';
// import { CategoryInfoModule } from './module/categories_Info/users.module';
// import { SoapModule } from './module/soap/soap.module';
dotenv.config();

@Module({
  imports: [
    ConfigModule.forRoot(config),
    TypeOrmModule.forRoot(connectDb),
    ScheduleModule.forRoot(),
    TelegrafModule.forRoot({
      token: process.env.BOT_TOKEN,
    }),
    UsersModule,
    EventModule,
    AgentsModule,
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: ( ): CacheModuleOptions => ({
        ttl:3600000,
      })
    })
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}