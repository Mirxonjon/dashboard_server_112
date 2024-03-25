import * as dotenv from 'dotenv';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { GroupsEntity } from 'src/entities/group.entity';
import { ServicesEntity } from 'src/entities/service.entity';
import { Telegraf } from 'telegraf';

dotenv.config();

@Injectable()
export class ServicesService {
  public bot: Telegraf;
  constructor() {
    this.bot = new Telegraf(process.env.BOT_TOKEN);
  }

 
   async  createService(body: {service_id : string} ) {
    await ServicesEntity.createQueryBuilder()
    .insert()
    .into(ServicesEntity)
    .values({
      service_id: body.service_id
    })
    .execute()
    .catch((e) => {
      // console.log(e);
      throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
    });

    }

    async  createGroup(body: {service_id : string,group_id : string,name : string,title : string} ) {
      const  findService = await ServicesEntity.findOneBy({id:body.service_id})

      if(!findService) {
        throw new HttpException('Not Found Service', HttpStatus.BAD_REQUEST);
        
      }
      await GroupsEntity.createQueryBuilder()
      .insert()
      .into(GroupsEntity)
      .values({
        name :body.name,
        title: body.title,
        group_id: body.group_id,
        servic : body.service_id as any
      })
      .execute()
      .catch(() => {
        throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      });
  
      }

}
