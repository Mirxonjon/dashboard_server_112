import * as dotenv from 'dotenv';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
  OnGatewayConnection,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {  Inject, Injectable, Req } from '@nestjs/common';
import {  Cron, CronExpression, Interval,  } from '@nestjs/schedule';
import { GroupsEntity } from 'src/entities/group.entity';
import axios from 'axios';
import {  parseStringPromise } from 'xml2js';
import { dataGroupEntity } from 'src/entities/dataGroup.entity';
import {
  convertDate,
  // convertorDateToDay,
  splitTextIntoChunks,
} from 'src/utils/converters';
import { agentslockEntity } from 'src/entities/agentslock.entity';
import { fetchStatisticByGroup, operatorsWhere } from 'src/utils/fetchEvery1hour';
import { Telegraf } from 'telegraf';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Groupqueue } from 'src/utils/fetcheEvery5s';
import { readSheets } from 'src/utils/google_cloud';
dotenv.config();


@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  readonly #_cache : Cache


  async handleConnection(client: Socket) {
    // return 'Connected to the server.'
    this.server.emit('connected', 'Connected to the server.');
    // const findgroups = await GroupsEntity.find();
    // this.server.emit('groups', findgroups);
  }

  public bot: Telegraf;

  constructor(@Inject(CACHE_MANAGER) cache: Cache) {
    this.bot = new Telegraf(process.env.BOT_TOKEN);
    this.#_cache = cache
  }



  @Cron("59 18 * * *") 
  fetchdata1() {
    // console.log('okkkk' , new Date());
    fetchStatisticByGroup()
  }



  @Cron(CronExpression.EVERY_10_SECONDS) 
  async handleAgentsAtTheMomentAddCash() {
    const operatorsWhereatThemoment :any = await Promise.all(await operatorsWhere(this.bot));
  
    await this.#_cache.set('lockOperators' , operatorsWhereatThemoment ,3600000)
  }
 

  @SubscribeMessage('agentsLockAtTheMoment')
  async handleAgentsAtTheMoment() {
    const data = await this.#_cache.get('lockOperators')
    return data;
  }

  @SubscribeMessage('agentsLock')
  async handleAgents(@MessageBody('id') id: number) {
    return await agentslockEntity.find({
      order: {
        create_data: 'DESC',
      },
    });
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async handleAgentsAtTheMomentGroupQueue() {
    // console.log('okkk');
    
    const GroupQueuesAtThemoment : any = await Promise.all(await Groupqueue());
// console.log('okkk' , GroupQueuesAtThemoment);
    await this.#_cache.set('GroupQueue' , GroupQueuesAtThemoment ,3600000)

  }


  @Cron("0 15 * * *") 
   async funhandleAgentsSenDataToTelegram() {
        const cutRanges = ['E3:K', 'N3:T', 'W3:AC', 'AF3:AL', 'AO3:AU', 'AX3:BD', 'BG3:BM', 'BP3:BV', 'BY3:CE', 'CH3:CN'];
        const sheetId : string = '1Q3tJgQZUIdXKBuORujJcQHwvCYXuoiPb39o8ZlbD8f4' 
        const rangeName : string =  'Фиксация прослушивания'
        for (const e of cutRanges) {
          const sheets = await readSheets(sheetId,rangeName,e);
          let sentMessagedata = `${sheets[0]} \n ${sheets[2]} \n ${sheets[3]} \n`;
          sheets.forEach((e, i) => {
            if (i > 4 && e?.length && e[0]) {
              sentMessagedata += `${e[0]}${e[1]} ${e[2]} ${e[3]} ${e[6]}\n`;
            }
          });
      
          let cuttext = await splitTextIntoChunks(sentMessagedata, 30, this.bot);
          await new Promise(resolve => setTimeout(resolve, 120000)); 
        }
        return true;
      }


    
  @SubscribeMessage('data')
  async handleData1(@MessageBody('id') id: number) {
    const data = await this.#_cache.get('GroupQueue');
   return data
  }

  
  // @SubscribeMessage('statictik')
  async handleStatictikData(@MessageBody() data: string) {

    const findStatistik: any = await dataGroupEntity.find({
      order: {
        create_data: 'ASC',
      },
    });

    let sumAcceptedCallCount = 0;
    let sumPresentedCallCount = 0;
    let sumLostCallCount = 0;
    let sumStraggleCallCount = 0;
    let sumQueueDispatchedCallCoun = 0;
    let arrdate = [];
    let arrAcceptedCallCount = [];
    let arrPresentedCallCount = [];
    let arrLostCallCount = [];
    let arrStraggleCallCount = [];
    let arrQueueDispatchedCallCoun = [];
    let calcAcceptedCallCount = 0;
    let calcPresentedCallCount = 0;
    let calcLostCallCount = 0;
    let calcStraggleCallCount = 0;
    let calcQueueDispatchedCallCoun = 0;

 findStatistik.forEach((e) => {
      e.formdata = convertDate(e.create_data);

      sumAcceptedCallCount += +e.acceptedCallCount;
      sumPresentedCallCount += +e.presentedCallCount;
      sumLostCallCount += +e.lostCallCount;
      sumStraggleCallCount += +e.straggleCallCount;
      sumQueueDispatchedCallCoun += +e.queueDispatchedCallCoun;
    });


findStatistik.forEach(e => {
  if (!arrdate.includes(e.formdata)) {
    arrdate.push(e.formdata)
  }
})

arrdate.forEach(e =>{
  calcAcceptedCallCount = 0;
  calcPresentedCallCount = 0;
  calcLostCallCount = 0;
  calcStraggleCallCount = 0;
  calcQueueDispatchedCallCoun = 0;
  findStatistik.forEach(n => {
    
    if(n.formdata == e) {
      calcAcceptedCallCount += +n?.acceptedCallCount;
      calcPresentedCallCount += +n?.presentedCallCount;
      calcLostCallCount += +n?.lostCallCount;
      calcStraggleCallCount += +n?.straggleCallCount;
      calcQueueDispatchedCallCoun += +n?.queueDispatchedCallCoun;
    }
  })
  arrAcceptedCallCount.push(calcAcceptedCallCount);
  arrPresentedCallCount.push(calcPresentedCallCount);
  arrLostCallCount.push(calcLostCallCount);
  arrStraggleCallCount.push(calcStraggleCallCount);
  arrQueueDispatchedCallCoun.push(calcQueueDispatchedCallCoun);
})


    return {
      arrdate,
      arrAcceptedCallCount,
      arrPresentedCallCount,
      arrLostCallCount,
      arrStraggleCallCount,
      arrQueueDispatchedCallCoun,
      sumAcceptedCallCount,
      sumPresentedCallCount,
      sumLostCallCount,
      sumStraggleCallCount,
      sumQueueDispatchedCallCoun,
    };
  }


  @SubscribeMessage('statictikGroup')
  async handleStatictikDataGroup(@MessageBody() data: { group_id: string }) {
    const finGroupStatic: any = await dataGroupEntity.find({
      where: {
        group_id: data.group_id,
      },
      order: {
        create_data: 'ASC',
      },
    });

    let sumAcceptedCallCount = 0;
    let sumPresentedCallCount = 0;
    let sumLostCallCount = 0;
    let sumStraggleCallCount = 0;
    let sumQueueDispatchedCallCoun = 0;
    let arrdate = [];
    let arrAcceptedCallCount = [];
    let arrPresentedCallCount = [];
    let arrLostCallCount = [];
    let arrStraggleCallCount = [];
    let arrQueueDispatchedCallCoun = [];
    let calcAcceptedCallCount = 0;
    let calcPresentedCallCount = 0;
    let calcLostCallCount = 0;
    let calcStraggleCallCount = 0;
    let calcQueueDispatchedCallCoun = 0;

finGroupStatic.forEach((e) => {
      e.formdata = convertDate(e.create_data);

      sumAcceptedCallCount += +e.acceptedCallCount;
      sumPresentedCallCount += +e.presentedCallCount;
      sumLostCallCount += +e.lostCallCount;
      sumStraggleCallCount += +e.straggleCallCount;
      sumQueueDispatchedCallCoun += +e.queueDispatchedCallCoun;
    });
   
    finGroupStatic.forEach(e => {
  if (!arrdate.includes(e.formdata)) {
    arrdate.push(e.formdata)
  }
})

arrdate.forEach(e =>{
  calcAcceptedCallCount = 0;
  calcPresentedCallCount = 0;
  calcLostCallCount = 0;
  calcStraggleCallCount = 0;
  calcQueueDispatchedCallCoun = 0;
  finGroupStatic.forEach(n => {
    
    if(n.formdata == e) {
      calcAcceptedCallCount += +n?.acceptedCallCount;
      calcPresentedCallCount += +n?.presentedCallCount;
      calcLostCallCount += +n?.lostCallCount;
      calcStraggleCallCount += +n?.straggleCallCount;
      calcQueueDispatchedCallCoun += +n?.queueDispatchedCallCoun;
    }
  })
  arrAcceptedCallCount.push(calcAcceptedCallCount);
  arrPresentedCallCount.push(calcPresentedCallCount);
  arrLostCallCount.push(calcLostCallCount);
  arrStraggleCallCount.push(calcStraggleCallCount);
  arrQueueDispatchedCallCoun.push(calcQueueDispatchedCallCoun);
})






    // let sum1AcceptedCallCount = 6058;
    // let sum1PresentedCallCount = 4350;
    // let sum1LostCallCount = 980;
    // let sum1StraggleCallCount = 400;
    // let sum1QueueDispatchedCallCoun = 800;
    // finGroupStatic.reverse();
    // finGroupStatic.push({ a: 'b' });
    // let ar1 = [];
    // let obj = {};
    // const calc1 = finGroupStatic.forEach((e) => {
    //   //  e.create_data = convertDate(e.create_data)
    //   if (!arrdate.includes(e.formdata)) {
    //     arrAcceptedCallCount.push(sum1AcceptedCallCount);
    //     arrPresentedCallCount.push(sum1PresentedCallCount);
    //     arrLostCallCount.push(sum1LostCallCount);
    //     arrStraggleCallCount.push(sum1StraggleCallCount);
    //     arrQueueDispatchedCallCoun.push(sum1QueueDispatchedCallCoun);

    //     arrdate.push(e.formdata);
    //     sum1AcceptedCallCount = 0;
    //     sum1PresentedCallCount = 0;
    //     sum1LostCallCount = 0;
    //     sum1StraggleCallCount = 0;
    //     sum1QueueDispatchedCallCoun = 0;
    //   }
    //   // console.log( e.formdata , arrdate.at(-1));

    //   if (e.formdata == arrdate.at(-1)) {
    //     sum1AcceptedCallCount += +e.acceptedCallCount;
    //     sum1PresentedCallCount += +e.presentedCallCount;
    //     sum1LostCallCount += +e.lostCallCount;
    //     sum1StraggleCallCount += +e.straggleCallCount;
    //     sum1QueueDispatchedCallCoun += +e.queueDispatchedCallCoun;
    //   }
    // });

    return {
      arrdate,
      arrAcceptedCallCount,
      arrPresentedCallCount,
      arrLostCallCount,
      arrStraggleCallCount,
      arrQueueDispatchedCallCoun,
      sumAcceptedCallCount,
      sumPresentedCallCount,
      sumLostCallCount,
      sumStraggleCallCount,
      sumQueueDispatchedCallCoun,
    };
    // console.log(finGroupStatic);





  }

  handleDisconnect(client: Socket) {
    clearInterval('aa');
  }

  //   @Timeout(5000)
  async fetchData() {
    const data = await fetchDataFromAPI();
    this.server.emit('data', 'eshmat okadan');
  }

  @Interval(5000)
  fetchDataInterval() {
    this.fetchData();
  }
}

async function fetchDataFromAPI() {
  // API dan ma'lumotlarni olish logikasi
  return 'okk'; // fetchData ning API dan ma'lumotlarni olish logikasini o'zgartiring.
}

// async function fetchData() {
//     return 'okk'
//   // API dan ma'lumotlarni olish uchun kerakli kodni yozing
// }
