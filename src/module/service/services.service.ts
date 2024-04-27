import * as dotenv from 'dotenv';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { GroupsEntity } from 'src/entities/group.entity';
import { ServicesEntity } from 'src/entities/service.entity';
import { Telegraf } from 'telegraf';
import { dataGroupEntity } from 'src/entities/dataGroup.entity';
import { Between } from 'typeorm';

dotenv.config();

@Injectable()
export class ServicesService {
  public bot: Telegraf;
  constructor() {
    this.bot = new Telegraf(process.env.BOT_TOKEN);
  }

  async findStatistick(fromDate: string, untilDate: string) {
    // fromDate = '28.03.2024'
    // untilDate = '31.03.2024'
    const fromDateFormatted = new Date(
      parseInt(fromDate.split('.')[2]),
      parseInt(fromDate.split('.')[1]) - 1,
      parseInt(fromDate.split('.')[0]),
    );
    const untilDateFormatted = new Date(
      parseInt(untilDate.split('.')[2]),
      parseInt(untilDate.split('.')[1]) - 1,
      parseInt(untilDate.split('.')[0]),
    );

    fromDateFormatted.setHours(0, 0, 0, 0);
    untilDateFormatted.setHours(23, 59, 59, 999);

    const findStatistik: any = await dataGroupEntity
      .find({
        where: {
          create_data: Between(fromDateFormatted, untilDateFormatted),
        },
        order: {
          create_data: 'ASC',
        },
      })
      .catch((e) => console.log(e));

    return findStatistik;
  }

  async createService(body: { service_id: string }) {
    await ServicesEntity.createQueryBuilder()
      .insert()
      .into(ServicesEntity)
      .values({
        service_id: body.service_id,
      })
      .execute()
      .catch((e) => {
        // console.log(e);
        throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      });
  }

  async createGroup(body: {
    service_id: string;
    group_id: string;
    name: string;
    title: string;
  }) {
    const findService = await ServicesEntity.findOneBy({ id: body.service_id });

    if (!findService) {
      throw new HttpException('Not Found Service', HttpStatus.BAD_REQUEST);
    }
    await GroupsEntity.createQueryBuilder()
      .insert()
      .into(GroupsEntity)
      .values({
        name: body.name,
        title: body.title,
        group_id: body.group_id,
        servic: body.service_id as any,
      })
      .execute()
      .catch(() => {
        throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      });
  }
}
