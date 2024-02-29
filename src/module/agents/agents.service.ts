import * as dotenv from 'dotenv';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { agentsDataStateEntity } from 'src/entities/agentsDataState.entity';
import { agentslockEntity } from 'src/entities/agentslock.entity';
import { GroupsEntity } from 'src/entities/group.entity';
import { ServicesEntity } from 'src/entities/service.entity';
import { splitTextIntoChunks } from 'src/utils/converters';
import { readSheets } from 'src/utils/google_cloud';
import { Telegraf } from 'telegraf';
import { Like } from 'typeorm';

dotenv.config();

@Injectable()
export class AgentsService {
  public bot: Telegraf;
  constructor() {
    this.bot = new Telegraf(process.env.BOT_TOKEN);
  }

  async findAllAgents ( ) {
    const findBlockAgents = await agentsDataStateEntity.find({
        order : {
            create_data : 'DESC'
        }
    })

    return findBlockAgents
}
 
  async findAll(pageNumber = 1, pageSize = 10) {
    const offset = (pageNumber - 1) * pageSize;

    const [results, total] = await agentslockEntity.findAndCount({
      order: {
        create_data: 'DESC',
      },
      skip: offset,
      take: pageSize,
    });

    const findBlocks = await agentslockEntity.find({
      where : {
        banInfo :'block'
      },

  })
  const findTime = await agentslockEntity.find({
    where : {
      banInfo :'time'
    },

})
console.log(results);



    const totalPages = Math.ceil(total / pageSize);

    return {
      data: {
        results,
        findBlocks :findBlocks.length,
        findTime: findTime.length
      },
      pagination: {
        currentPage: pageNumber,
        totalPages,
        pageSize,
        totalItems: total,
      },
    };
  }
    async filterAll(name :string  , operator_number :string , status :string) {
      
        const  filteragents = await agentslockEntity.find({
            where: {
              lastName: name == 'null' ? null : Like(`%${name}%`),
              login: operator_number == 'null' ? null : Number(operator_number) as any,
              banInfo: status == 'null' ? null : status,
            },
            order: {
              create_data: 'DESC',
            },
          }).catch(() => {
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
          });

        return filteragents
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
      .catch((e) => {
        // console.log(e);
        throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      });
  
      }

      async updateAgent(id : string , body: {status: boolean}) {
        const findAgent = await agentsDataStateEntity.findOne({
          where: {
            id: id,
          },
        }).catch(() => {
          throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
        });
    
        if (findAgent) {
          await agentsDataStateEntity.createQueryBuilder()
            .update(agentsDataStateEntity)
            .set({
              IsSupervazer: body.status
            })
            .where({ id })
            .execute()
            .catch(() => {
              throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
            });
        }
      }


      // @Cron(CronExpression.EVERY_5_MINUTES) 
      async funhandleAgentsSenDataToTelegram() {
        const cutRanges = ['E3:K', 'N3:T', 'W3:AC', 'AF3:AL', 'AO3:AU', 'AX3:BD', 'BG3:BM', 'BP3:BV', 'BY3:CE', 'CH3:CN'];
        for (const e of cutRanges) {
          const sheets = await readSheets(e);
          // console.log(sheets);
          let sentMessagedata = `${sheets[0]} \n ${sheets[2]} \n ${sheets[3]} \n`;
          sheets.forEach((e, i) => {
            if (i > 4 && e?.length && e[0]) {
              sentMessagedata += `${e[0]}${e[1]} ${e[2]} ${e[3]} ${e[6]}\n`;
            }
          });
          // console.log(sentMessagedata);
      
          let cuttext = await splitTextIntoChunks(sentMessagedata, 30, this.bot);
          // Xabarlar orasida kutish (delay) qo'shish
          await new Promise(resolve => setTimeout(resolve, 120000)); // 1 soniya kutish
          // console.log(e);
          
        }
        return true;
      }

}
