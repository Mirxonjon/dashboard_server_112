import { GraphMonthEntity } from './../../entities/graphMoth';
import * as dotenv from 'dotenv';
import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { agentsDataStateEntity } from 'src/entities/agentsDataState.entity';
import { agentslockEntity } from 'src/entities/agentslock.entity';
import { Cache } from 'cache-manager';
import { GroupsEntity } from 'src/entities/group.entity';
import { ServicesEntity } from 'src/entities/service.entity';
import {
  convertDate,
  parseTimeStringToSeconds,
  returnMothData,
  splitTextIntoChunks,
  subtractTime,
} from 'src/utils/converters';
import {
  insertRowsAtTop,
  readSheets,
  writeToSheet,
} from 'src/utils/google_cloud';
import { Telegraf } from 'telegraf';
import { Between, Like, Not } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgentDateEntity } from 'src/entities/agentdate.entity';
import { GraphDaysEntity } from 'src/entities/graphDays';
// import { GraphMonthEntity } from 'src/entities/graphMoth';
import { agentControlGraphEntity } from 'src/entities/agentsControlGrafigh.entity';
import { fetchGetagentStatistic } from 'src/utils/functionForFetchSoap';
import {
  ControlAgentGraph,
  ControlAgentGraphSendSheet,
  ControlAgentGraphSmena,
  findDidNotComeToWorkOnTime,
} from 'src/utils/agentControlfunctions';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ComputersEntity } from 'src/entities/computer.entity';

dotenv.config();

@Injectable()
export class AgentsService {
  readonly #_cache: Cache;
  public bot: Telegraf;
  constructor(@Inject(CACHE_MANAGER) cache: Cache) {
    this.bot = new Telegraf(process.env.BOT_TOKEN);
    this.#_cache = cache;
  }

  async findAllAgents() {
    const findBlockAgents = await agentsDataStateEntity.find({
      order: {
        create_data: 'DESC',
      },
    });

    return findBlockAgents;
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
      where: {
        banInfo: 'block',
      },
    });
    const findTime = await agentslockEntity.find({
      where: {
        banInfo: 'time',
      },
    });

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: {
        results,
        findBlocks: findBlocks.length,
        findTime: findTime.length,
      },
      pagination: {
        currentPage: pageNumber,
        totalPages,
        pageSize,
        totalItems: total,
      },
    };
  }
  async filterAll(name: string, operator_number: string, status: string) {
    const filteragents = await agentslockEntity
      .find({
        where: {
          lastName: name == 'null' ? null : Like(`%${name}%`),
          login:
            operator_number == 'null' ? null : (Number(operator_number) as any),
          banInfo: status == 'null' ? null : status,
        },
        order: {
          create_data: 'DESC',
        },
      })
      .catch(() => {
        throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      });

    return filteragents;
  }

  async findAgentGraph(login: string) {
    const findAgent = await AgentDateEntity.findOne({
      where: {
        id_login: login,
      },
      relations: {
        months: {
          days: true,
        },
      },
      order: {
        months: {
          month_number: 'asc',
          days: {
            work_day: 'asc',
          },
        },
      },
    });

    return findAgent;
  }

  async updateAgent(id: string, body: { status: boolean }) {
    const findAgent = await agentsDataStateEntity
      .findOne({
        where: {
          id: id,
        },
      })
      .catch(() => {
        throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      });

    if (findAgent) {
      await agentsDataStateEntity
        .createQueryBuilder()
        .update(agentsDataStateEntity)
        .set({
          IsSupervazer: body.status,
        })
        .where({ id })
        .execute()
        .catch(() => {
          throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
        });
    }
  }

  async handleAgentsSenDataToTelegram() {
    const cutRanges = [
      'E3:K',
      'N3:T',
      'W3:AC',
      'AF3:AL',
      'AO3:AU',
      'AX3:BD',
      'BG3:BM',
      'BP3:BV',
      'BY3:CE',
      'CH3:CN',
    ];
    const sheetId: string = '1Q3tJgQZUIdXKBuORujJcQHwvCYXuoiPb39o8ZlbD8f4';
    const rangeName: string = 'Фиксация прослушивания';

    for (const e of cutRanges) {
      const sheets = await readSheets(sheetId, rangeName, e);
      let sentMessagedata = `${sheets[0]} \n ${sheets[2]} \n ${sheets[3]} \n`;
      sheets.forEach((e, i) => {
        if (i > 4 && e?.length && e[0]) {
          sentMessagedata += `${e[0]}${e[1]} ${e[2]} ${e[3]} ${e[6]}\n`;
        }
      });

      let cuttext = await splitTextIntoChunks(sentMessagedata, 30, this.bot);
      await new Promise((resolve) => setTimeout(resolve, 120000));
    }
    return true;
  }

  // @Cron(CronExpression.EVERY_5_SECONDS)
  async findLockData(
    agentId: string,
    type_block: string,
    pageNumber = 1,
    pageSize = 10,
    fromDate: string,
    untilDate: string,
  ) {
    const findAgent = await AgentDateEntity.findOne({
      where: {
        agent_id: agentId,
      },
    }).catch(() => {
      throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
    });

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

    const offset = (pageNumber - 1) * pageSize;
    let totalPages: number = 0;
    let totalItemCount = 0;
    let allData = [];
    if (type_block == 'all') {
      const [results, total] = await agentslockEntity.findAndCount({
        where: {
          id: findAgent.id,
          create_data: Between(fromDateFormatted, untilDateFormatted),
        },
        order: {
          create_data: 'DESC',
        },
        skip: offset,
        take: pageSize,
      });
      totalPages = Math.ceil(total / pageSize);
      totalItemCount = total;
      allData = results;
    } else {
      const [results, total] = await agentslockEntity.findAndCount({
        where: {
          id: findAgent.id,
          banInfo: type_block,
          create_data: Between(fromDateFormatted, untilDateFormatted),
        },
        order: {
          create_data: 'DESC',
        },
        skip: offset,
        take: pageSize,
      });
      totalPages = Math.ceil(total / pageSize);
      totalItemCount = total;

      allData = results;
    }

    return {
      data: {
        results: allData,
      },
      pagination: {
        currentPage: pageNumber,
        totalPages,
        pageSize,
        totalItems: totalItemCount,
      },
    };
  }

  async findControlTgraphData(
    agent_id: string,
    type_ban: string,
    pageNumber = 1,
    pageSize = 10,
    fromDate: string,
    untilDate: string,
  ) {
    const offset = (pageNumber - 1) * pageSize;
    // console.log(agent_id);

    const findAgent = await AgentDateEntity.findOne({
      where: {
        agent_id,
      },
    }).catch((e) => {
      // console.log(e, agent_id);

      throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
    });

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
    let allResults = [];
    let allTotals = 0;
    if (type_ban == 'stay_up_late') {
      // console.log(findAgent);

      const [results, total] = await agentControlGraphEntity
        .findAndCount({
          where: {
            id_login: findAgent.id_login,
            ComeToWorkOnTime: Not(true),
            create_data: Between(fromDateFormatted, untilDateFormatted),
          },

          order: {
            create_data: 'DESC',
          },
          skip: offset,
          take: pageSize,
        })
        .catch((e) => {
          // console.log(e, 'lllll');

          throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
        });
      allResults = results;
      allTotals = total;
    } else if (type_ban == 'left_work_early') {
      // console.log(findAgent);

      const [results, total] = await agentControlGraphEntity
        .findAndCount({
          where: {
            id_login: findAgent.id_login,
            LeftAfterWork: Not(true),
            create_data: Between(fromDateFormatted, untilDateFormatted),
          },

          order: {
            create_data: 'DESC',
          },
          skip: offset,
          take: pageSize,
        })
        .catch((e) => {
          // console.log(e, 'lllll');

          throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
        });
      // console.log('okkk', type_ban, results);
      allResults = results;
      allTotals = total;
    } else if (type_ban == 'not_at_work') {
      // console.log(findAgent);

      const [results, total] = await agentControlGraphEntity
        .findAndCount({
          where: {
            id_login: findAgent.id_login,
            LastLoginTime: 'not login',
            create_data: Between(fromDateFormatted, untilDateFormatted),
          },

          order: {
            create_data: 'DESC',
          },
          skip: offset,
          take: pageSize,
        })
        .catch((e) => {
          // console.log(e, 'lllll');

          throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
        });
      // console.log('okkk', type_ban, results);
      allResults = results;
      allTotals = total;
    } else if (type_ban == 'worked_less') {
      // console.log(findAgent);

      const [results, total] = await agentControlGraphEntity
        .findAndCount({
          where: {
            id_login: findAgent.id_login,
            TimeWorkIsDone: false,
            create_data: Between(fromDateFormatted, untilDateFormatted),
          },

          order: {
            create_data: 'DESC',
          },
          skip: offset,
          take: pageSize,
        })
        .catch((e) => {
          throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
        });
      // console.log('okkk', type_ban, results);
      allResults = results;
      allTotals = total;
    } else {
      const [results, total] = await agentControlGraphEntity
        .findAndCount({
          where: [
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: Not(true),
              LeftAfterWork: Not(true),
              TimeWorkIsDone: Not(true),
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: true,
              LeftAfterWork: true,
              TimeWorkIsDone: Not(true),
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: true,
              LeftAfterWork: Not(true),
              TimeWorkIsDone: Not(true),
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: Not(true),
              LeftAfterWork: true,
              TimeWorkIsDone: Not(true),
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: Not(true),
              LeftAfterWork: Not(true),
              TimeWorkIsDone: true,
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: true,
              LeftAfterWork: Not(true),
              TimeWorkIsDone: true,
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: Not(true),
              LeftAfterWork: true,
              TimeWorkIsDone: true,
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
          ],
          order: {
            create_data: 'DESC',
          },
          skip: offset,
          take: pageSize,
        })
        .catch(() => {
          throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
        });
      // console.log('EEEEEE');

      allResults = results;
      allTotals = total;
    }

    const agentData = await agentControlGraphEntity
      .find({
        where: {
          id_login: findAgent.id_login,
          create_data: Between(fromDateFormatted, untilDateFormatted),
        },
      })
      .catch(() => {
        throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      });

    const totalPages = Math.ceil(allTotals / pageSize);
    let MustBeWorked = 0;
    let workTime = 0;
    for (let e of agentData) {
      MustBeWorked += +e.TimeWorked;
      workTime += parseTimeStringToSeconds(e.TimeWorkDuration);
    }
    return {
      data: {
        results: allResults,
        MustBeWorked,
        workTime,
      },
      pagination: {
        currentPage: pageNumber,
        totalPages,
        pageSize,
        totalItems: allTotals,
      },
    };
  }

  async findAllGraphAndBlockData(
    login: string,
    fullname: string,
    pageNumber = 1,
    pageSize = 10,
    fromDate: string,
    untilDate: string,
  ) {
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

    const findAgentsGraph = await agentControlGraphEntity
      .find({
        where: {
          id_login: login == 'null' ? null : login,
          name: fullname == 'null' ? null : Like(`%${fullname}%`),
          create_data: Between(fromDateFormatted, untilDateFormatted),
        },
        order: {
          create_data: 'desc',
        },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
      })
      .catch(() => {
        throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      });

    let GraphAllOperators: agentControlGraphEntity[] = [];

    for (let e of findAgentsGraph) {
      let arr = [];
      for (let j of GraphAllOperators) {
        arr.push(j.id);
      }
      if (!arr.includes(e.id)) {
        GraphAllOperators.push(e);
      }
    }

    const agentsGraph = await this.findAllOperatorBanInfo(
      GraphAllOperators,
      fromDateFormatted,
      untilDateFormatted,
    );

    const findBlockAgents = await agentslockEntity
      .find({
        where: [
          {
            login: login == 'null' ? null : +login,
            lastName: fullname == 'null' ? null : Like(`%${fullname}%`),
            create_data: Between(fromDateFormatted, untilDateFormatted),
          },
          {
            login: login == 'null' ? null : +login,
            firstName: fullname == 'null' ? null : Like(`%${fullname}%`),
            create_data: Between(fromDateFormatted, untilDateFormatted),
          },
          {
            login: login == 'null' ? null : +login,
            secondName: fullname == 'null' ? null : Like(`%${fullname}%`),
            create_data: Between(fromDateFormatted, untilDateFormatted),
          },
        ],
        order: {
          create_data: 'desc',
        },
      })
      .catch(() => {
        throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      });

    let AllbanTimeOperators: agentslockEntity[] = [];

    for (let e of findBlockAgents) {
      let arr = [];
      for (let j of AllbanTimeOperators) {
        arr.push(j.id);
      }
      if (!arr.includes(e.id)) {
        AllbanTimeOperators.push(e);
      }
    }

    const agents = await this.findAllOperatorBanInfoDateAgentLock(
      AllbanTimeOperators,
      fromDateFormatted,
      untilDateFormatted,
    );

    let allAgents = [...agentsGraph, ...agents];

    let AllOperators: any[] = [];

    for (let e of allAgents) {
      let arr = [];
      for (let j of AllOperators) {
        arr.push(j.id);
      }
      if (!arr.includes(e.id)) {
        AllOperators.push(e);
      }
    }

    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedAgents = AllOperators.slice(startIndex, endIndex);

    const totalCount = AllOperators.length;

    return {
      agents: paginatedAgents,
      totalCount,
      pageNumber,
      pageSize,
    };
  }

  async findComeToWorkOnTimeData(
    login: string,
    fullname: string,
    fromDate: string,
    untilDate: string,
  ) {
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

    const findAgents = await agentControlGraphEntity
      .find({
        where: {
          id_login: login == 'null' ? null : login,
          name: fullname == 'null' ? null : Like(`%${fullname}%`),
          ComeToWorkOnTime: false,
          create_data: Between(fromDateFormatted, untilDateFormatted),
        },
        order: {
          create_data: 'desc',
        },
      })
      .catch(() => {
        throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      });

    let сomeToWorkLateAllOperators: agentControlGraphEntity[] = [];

    for (let e of findAgents) {
      let arr = [];
      for (let j of сomeToWorkLateAllOperators) {
        arr.push(j.id);
      }
      if (!arr.includes(e.id)) {
        сomeToWorkLateAllOperators.push(e);
      }
    }

    const agents = await this.findAllOperatorBanInfo(
      сomeToWorkLateAllOperators,
      fromDateFormatted,
      untilDateFormatted,
    );

    return agents;
  }

  async findWorkedLessData(
    login: string,
    fullname: string,
    fromDate: string,
    untilDate: string,
  ) {
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

    const findAgents = await agentControlGraphEntity
      .find({
        where: {
          id_login: login == 'null' ? null : login,
          name: fullname == 'null' ? null : Like(`%${fullname}%`),
          TimeWorkIsDone: false,
          create_data: Between(fromDateFormatted, untilDateFormatted),
        },
        order: {
          create_data: 'desc',
        },
      })
      .catch(() => {
        throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      });

    let WorkedLessAllOperators: agentControlGraphEntity[] = [];

    for (let e of findAgents) {
      let arr = [];
      for (let j of WorkedLessAllOperators) {
        arr.push(j.id);
      }
      if (!arr.includes(e.id)) {
        WorkedLessAllOperators.push(e);
      }
    }

    const agents = await this.findAllOperatorBanInfo(
      WorkedLessAllOperators,
      fromDateFormatted,
      untilDateFormatted,
    );

    return agents;
  }

  async findLeftAfterWorkData(
    login: string,
    fullname: string,
    fromDate: string,
    untilDate: string,
  ) {
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

    const findAgents = await agentControlGraphEntity
      .find({
        where: {
          id_login: login == 'null' ? null : login,
          name: fullname == 'null' ? null : Like(`%${fullname}%`),
          LeftAfterWork: false,
          create_data: Between(fromDateFormatted, untilDateFormatted),
        },
        order: {
          create_data: 'desc',
        },
      })
      .catch(() => {
        throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      });

    let сomeToWorkLateAllOperators: agentControlGraphEntity[] = [];

    for (let e of findAgents) {
      let arr = [];
      for (let j of сomeToWorkLateAllOperators) {
        arr.push(j.id);
      }
      if (!arr.includes(e.id)) {
        сomeToWorkLateAllOperators.push(e);
      }
    }

    const agents = await this.findAllOperatorBanInfo(
      сomeToWorkLateAllOperators,
      fromDateFormatted,
      untilDateFormatted,
    );

    return agents;
  }

  async findallBanTimeData(
    login: string,
    fullname: string,
    fromDate: string,
    untilDate: string,
  ) {
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

    const findAgents = await agentslockEntity
      .find({
        where: [
          {
            login: login == 'null' ? null : +login,
            lastName: fullname == 'null' ? null : Like(`%${fullname}%`),
            create_data: Between(fromDateFormatted, untilDateFormatted),
          },
          {
            login: login == 'null' ? null : +login,
            firstName: fullname == 'null' ? null : Like(`%${fullname}%`),
            create_data: Between(fromDateFormatted, untilDateFormatted),
          },
          {
            login: login == 'null' ? null : +login,
            secondName: fullname == 'null' ? null : Like(`%${fullname}%`),
            create_data: Between(fromDateFormatted, untilDateFormatted),
          },
        ],
        order: {
          create_data: 'desc',
        },
      })
      .catch(() => {
        throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      });

    let AllbanTimeOperators: agentslockEntity[] = [];

    for (let e of findAgents) {
      let arr = [];
      for (let j of AllbanTimeOperators) {
        arr.push(j.id);
      }
      if (!arr.includes(e.id)) {
        AllbanTimeOperators.push(e);
      }
    }

    const agents = await this.findAllOperatorBanInfoDateAgentLock(
      AllbanTimeOperators,
      fromDateFormatted,
      untilDateFormatted,
    );

    return agents;
  }

  async findallBanBlockData(
    login: string,
    fullname: string,
    fromDate: string,
    untilDate: string,
  ) {
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

    const findAgents = await agentslockEntity
      .find({
        where: [
          {
            login: login == 'null' ? null : +login,
            lastName: fullname == 'null' ? null : Like(`%${fullname}%`),
            create_data: Between(fromDateFormatted, untilDateFormatted),
          },
          {
            login: login == 'null' ? null : +login,
            firstName: fullname == 'null' ? null : Like(`%${fullname}%`),
            create_data: Between(fromDateFormatted, untilDateFormatted),
          },
          {
            login: login == 'null' ? null : +login,
            secondName: fullname == 'null' ? null : Like(`%${fullname}%`),
            create_data: Between(fromDateFormatted, untilDateFormatted),
          },
        ],
        order: {
          create_data: 'desc',
        },
      })
      .catch(() => {
        throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      });

    let AllbanTimeOperators: agentslockEntity[] = [];

    for (let e of findAgents) {
      let arr = [];
      for (let j of AllbanTimeOperators) {
        arr.push(j.id);
      }
      if (!arr.includes(e.id)) {
        AllbanTimeOperators.push(e);
      }
    }

    const agents = await this.findAllOperatorBanInfoDateAgentLock(
      AllbanTimeOperators,
      fromDateFormatted,
      untilDateFormatted,
    );

    return agents;
  }

  async findAllOperatorBanInfoDateAgentLock(
    agentsArr: agentslockEntity[],
    fromDateFormatted: Date,
    untilDateFormatted: Date,
  ) {
    let agents = [];

    for (let e of agentsArr) {
      const findAgent = await AgentDateEntity.findOne({
        where: {
          id_login: e.login.toString(),
          months: {
            days: {
              the_day_Format_Date: Between(
                fromDateFormatted,
                untilDateFormatted,
              ),
            },
          },
        },
        relations: {
          months: {
            days: true,
          },
        },
        order: {
          months: {
            days: {
              the_day_Format_Date: 'asc',
            },
          },
        },
      }).catch((e) => {
        throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      });

      let allworkTime = 0;
      let work_time = '09-18';
      if (findAgent) {
        for (let moth of findAgent.months) {
          if (moth) {
            for (let day of moth.days) {
              const typesTime = [
                '10-19',
                '07-16',
                '08-17',
                '09-18',
                '11-20',
                '13-22',
                '15-24',
                '17-02',
                '07-15',
                '08-16',
                '09-17',
                '08-18',
                '18-08',
                '14-23',
                '18-09',
                '09-18',
              ];
              const typesSmen = ['08-20', '20-08'];
              if (typesTime.includes(day.work_time) && day.work_type == 'day') {
                allworkTime += 9;
                work_time = work_time;
              } else if (
                typesSmen.includes(day.work_time) &&
                day.work_type == 'smen'
              ) {
                work_time = work_time;
                allworkTime += 12;
              }
            }
          }
        }

        const CountAgentWorkedLess = await agentControlGraphEntity
          .count({
            where: {
              id_login: e.login.toString(),
              TimeWorkIsDone: false,
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
          })
          .catch(() => {
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
          });

        const CountAgentсomeToWorkLate = await agentControlGraphEntity
          .count({
            where: {
              id_login: e.login.toString(),
              ComeToWorkOnTime: false,
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
          })
          .catch(() => {
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
          });

        const CountAgentLeftAfterWork = await agentControlGraphEntity
          .count({
            where: {
              id_login: e.login.toString(),
              LeftAfterWork: false,
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
          })
          .catch(() => {
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
          });

        const CountNb = await agentControlGraphEntity
          .count({
            where: {
              id_login: e.login.toString(),
              LastLoginTime: 'not login',
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
          })
          .catch(() => {
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
          });

        const CountAgentBlock = await agentslockEntity
          .count({
            where: {
              id: e.id,
              banInfo: 'block',
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
          })
          .catch(() => {
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
          });

        const CountAgentBanTime = await agentslockEntity
          .count({
            where: {
              id: e.id,
              banInfo: 'time',
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
          })
          .catch(() => {
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
          });

        const CountcontrolGraphAll = await agentControlGraphEntity.count({
          where: [
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: Not(true),
              LeftAfterWork: Not(true),
              TimeWorkIsDone: Not(true),
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: true,
              LeftAfterWork: true,
              TimeWorkIsDone: Not(true),
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: true,
              LeftAfterWork: Not(true),
              TimeWorkIsDone: Not(true),
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: Not(true),
              LeftAfterWork: true,
              TimeWorkIsDone: Not(true),
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: Not(true),
              LeftAfterWork: Not(true),
              TimeWorkIsDone: true,
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: true,
              LeftAfterWork: Not(true),
              TimeWorkIsDone: true,
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: Not(true),
              LeftAfterWork: true,
              TimeWorkIsDone: true,
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
          ],
        });

        agents.push({
          agent_id: findAgent.agent_id,
          id: findAgent.id,
          work_time,
          service_name: findAgent.service_name,
          id_login: findAgent.id_login,
          name: findAgent.name,
          create_data: findAgent.create_data,
          allworkTime,
          countAllbanInfo:
            CountcontrolGraphAll + CountAgentBlock + CountAgentBanTime,
          CountAgentсomeToWorkLate: CountAgentсomeToWorkLate,
          CountAgentLeftAfterWork,
          CountAgentBlock,
          CountAgentBanTime,
          CountAgentWorkedLess,
          CountNb,
        });
      }
    }
    return agents;
  }

  async findAllOperatorBanInfo(
    agentsArr: agentControlGraphEntity[],
    fromDateFormatted: Date,
    untilDateFormatted: Date,
  ) {
    let agents = [];

    for (let e of agentsArr) {
      const findAgent = await AgentDateEntity.findOne({
        where: {
          id_login: e.id_login,
          months: {
            days: {
              the_day_Format_Date: Between(
                fromDateFormatted,
                untilDateFormatted,
              ),
            },
          },
        },
        relations: {
          months: {
            days: true,
          },
        },
        order: {
          months: {
            days: {
              the_day_Format_Date: 'asc',
            },
          },
        },
      }).catch(() => {
        throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      });

      let allworkTime = 0;
      let work_time = '09-18';

      if (findAgent) {
        for (let moth of findAgent.months) {
          for (let day of moth.days) {
            const typesTime = [
              '10-19',
              '07-16',
              '08-17',
              '09-18',
              '11-20',
              '13-22',
              '15-24',
              '17-02',
              '07-15',
              '08-16',
              '09-17',
              '08-18',
              '18-08',
              '14-23',
              '18-09',
              '09-18',
            ];
            const typesSmen = ['08-20', '20-08'];
            if (typesTime.includes(day.work_time) && day.work_type == 'day') {
              allworkTime += 9;
              work_time = day.work_time;
            } else if (
              typesSmen.includes(day.work_time) &&
              day.work_type == 'smen'
            ) {
              allworkTime += 12;
              work_time = day.work_time;
            }
          }
        }
        const CountAgentWorkedLess = await agentControlGraphEntity
          .count({
            where: {
              id_login: e.id_login,
              TimeWorkIsDone: false,
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
          })
          .catch(() => {
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
          });

        const CountAgentсomeToWorkLate = await agentControlGraphEntity
          .count({
            where: {
              id_login: e.id_login,
              ComeToWorkOnTime: false,
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
          })
          .catch(() => {
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
          });

        const CountAgentLeftAfterWork = await agentControlGraphEntity
          .count({
            where: {
              id_login: e.id_login,
              LeftAfterWork: false,
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
          })
          .catch(() => {
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
          });

        const CountNb = await agentControlGraphEntity
          .count({
            where: {
              id_login: e.id_login,
              LastLoginTime: 'not login',
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
          })
          .catch(() => {
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
          });

        const CountAgentBlock = await agentslockEntity
          .count({
            where: {
              id: e.id,
              banInfo: 'block',
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
          })
          .catch(() => {
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
          });

        const CountAgentBanTime = await agentslockEntity
          .count({
            where: {
              id: e.id,
              banInfo: 'time',
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
          })
          .catch(() => {
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
          });

        const CountcontrolGraphAll = await agentControlGraphEntity.count({
          where: [
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: Not(true),
              LeftAfterWork: Not(true),
              TimeWorkIsDone: Not(true),
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: true,
              LeftAfterWork: true,
              TimeWorkIsDone: Not(true),
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: true,
              LeftAfterWork: Not(true),
              TimeWorkIsDone: Not(true),
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: Not(true),
              LeftAfterWork: true,
              TimeWorkIsDone: Not(true),
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: Not(true),
              LeftAfterWork: Not(true),
              TimeWorkIsDone: true,
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: true,
              LeftAfterWork: Not(true),
              TimeWorkIsDone: true,
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
            {
              id_login: findAgent.id_login,
              ComeToWorkOnTime: Not(true),
              LeftAfterWork: true,
              TimeWorkIsDone: true,
              create_data: Between(fromDateFormatted, untilDateFormatted),
            },
          ],
        });

        agents.push({
          agent_id: findAgent.agent_id,
          id: findAgent.id,
          service_name: findAgent.service_name,
          id_login: findAgent.id_login,
          name: findAgent.name,
          create_data: findAgent.create_data,
          work_time,
          allworkTime,
          countAllbanInfo:
            CountcontrolGraphAll + CountAgentBlock + CountAgentBanTime,
          CountAgentсomeToWorkLate: CountAgentсomeToWorkLate,
          CountAgentLeftAfterWork,
          CountAgentBlock,
          CountAgentBanTime,
          CountAgentWorkedLess,
          CountNb,
        });
      }
    }
    return agents;
  }

  async UpdateOrAddNewGraph() {
    return await this.writeNewGraph();
  }

  @Cron('0 0 20 * * *')
  async writeNewGraphlastMonth() {
    const now = new Date();
    const lastDay = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();

    if (now.getDate() === lastDay) {
      const cutRanges = 'A2:AK500';

      // const sheetId: string = '1BF7Z9CTKdL-RvBwzZTcB4gvOqoviX6fUwHIBmSlG_ow';
      const rangeName: string = '229';
      const sheets = await readSheets(
        '1BF7Z9CTKdL-RvBwzZTcB4gvOqoviX6fUwHIBmSlG_ow',
        rangeName,
        cutRanges,
      );

      for (const e of sheets) {
        if (e[1] == '229' || e[1] == '255' || e[1] == '1009') {
          const findAgent: AgentDateEntity = await AgentDateEntity.findOne({
            where: {
              id_login: e[4],
            },
            relations: {
              months: {
                days: true,
              },
            },
          });

          if (findAgent) {
            const updateAgent = await AgentDateEntity.createQueryBuilder()
              .update(AgentDateEntity)
              .set({ service_name: e[1], id_login: e[4], name: e[3], id: e[5] })
              .where('agent_id = :id', { id: findAgent.agent_id })
              .returning(['agent_id'])
              .execute();

            if (updateAgent) {
              const firstday = e[6].split('/')[0];

              const findMonth = await GraphMonthEntity.findOne({
                where: {
                  year: firstday.split('.')[2],
                  month_number: firstday.split('.')[1],
                  agent_id: updateAgent.raw[0]?.agent_id,
                },
              });

              if (findMonth) {
                const mothData = await returnMothData(firstday);

                const updateMoth = await GraphMonthEntity.createQueryBuilder()
                  .update(GraphMonthEntity)
                  .set({
                    year: firstday.split('.')[2],
                    month_number: +firstday.split('.')[1],
                    month_name: mothData.name,
                    month_days_count: mothData.days,
                    agent_id: updateAgent.raw[0].agent_id,
                  })
                  .where('id = :id', { id: findMonth.id })
                  .returning(['id'])
                  .execute()
                  .catch((e) => console.log(e));

                if (updateMoth) {
                  for (let i = 6; i < e.length; i++) {
                    const dataDay = e[i].split('/');
                    // console.log(dataDay);

                    const typesGraph = [
                      'DAM',
                      'Н',
                      'К',
                      'Б',
                      'О',
                      'Р',
                      'П',
                      'А',
                      'У',
                    ];
                    const typesTime = [
                      '10-19',
                      '07-16',
                      '08-17',
                      '09-18',
                      '11-20',
                      '13-22',
                      '15-24',
                      '17-02',
                      '07-15',
                      '08-16',
                      '09-17',
                      '08-18',
                      '18-08',
                      '14-23',
                      '18-09',
                      '09-18',
                    ];
                    const typesSmen = ['08-20', '20-08'];
                    // console.log(updateMoth,'updateMothdan');
                    // console.log('okkk' ,dataDay[0] , findMonth?.id , findAgent.agent_id);

                    const findDay = await GraphDaysEntity.findOne({
                      where: {
                        the_date: dataDay[0],
                        month_id: {
                          id: updateMoth?.raw[0]?.id, // `month_id` uchun to'g'ridan-to'g'ri qiymatni ko'rsating ,
                          // agent_id : {
                          //   agent_id: updateAgent.raw[0].agent_id
                          // }
                          //  agent_id: findAgent.agent_id as any
                        },
                      },
                      relations: {
                        month_id: {
                          agent_id: true,
                        },
                      },
                    }).catch((e) => console.log(e));
                    let formatDate = new Date(
                      +dataDay[0]?.split('.')[2],
                      +dataDay[0]?.split('.')[1] - 1,
                      +dataDay[0]?.split('.')[0],
                    );

                    if (findDay) {
                      if (typesGraph.includes(dataDay[1])) {
                        await GraphDaysEntity.createQueryBuilder()
                          .update(GraphDaysEntity)
                          .set({
                            at_work: dataDay[1],
                            work_day: +dataDay[0].split('.')[0],
                            work_time: null,
                            the_date: dataDay[0],
                            the_day_Format_Date: formatDate,
                            work_type: dataDay[1],
                            week_day_name: dataDay[2],
                          })
                          .where('id = :id', { id: findDay.id })
                          .returning(['id'])
                          .execute();
                      } else if (typesTime.includes(dataDay[1])) {
                        await GraphDaysEntity.createQueryBuilder()
                          .update(GraphDaysEntity)
                          .set({
                            at_work: 'W',
                            work_day: +dataDay[0].split('.')[0],
                            work_time: dataDay[1],
                            the_date: dataDay[0],
                            the_day_Format_Date: formatDate,
                            work_type: 'day',
                            week_day_name: dataDay[2],
                          })
                          .where('id = :id', { id: findDay.id })
                          .returning(['id'])
                          .execute();
                      } else if (typesSmen.includes(dataDay[1])) {
                        await GraphDaysEntity.createQueryBuilder()
                          .update(GraphDaysEntity)
                          .set({
                            at_work: 'W',
                            work_day: +dataDay[0].split('.')[0],
                            work_time: dataDay[1],
                            the_date: dataDay[0],
                            the_day_Format_Date: formatDate,
                            work_type: 'smen',
                            week_day_name: dataDay[2],
                          })
                          .where('id = :id', { id: findDay.id })
                          .returning(['id'])
                          .execute();
                      }
                    } else {
                      if (typesGraph.includes(dataDay[1])) {
                        await GraphDaysEntity.createQueryBuilder()
                          .insert()
                          .into(GraphDaysEntity)
                          .values({
                            at_work: dataDay[1],
                            work_day: +dataDay[0].split('.')[0],
                            work_time: null,
                            the_date: dataDay[0],
                            the_day_Format_Date: formatDate,
                            work_type: dataDay[1],
                            week_day_name: dataDay[2],
                            month_id: findMonth[0].id,
                          })
                          .returning(['id'])
                          .execute()
                          .catch((e) => {
                            throw new HttpException(
                              'Bad Request',
                              HttpStatus.BAD_REQUEST,
                            );
                          });
                      } else if (typesTime.includes(dataDay[1])) {
                        await GraphDaysEntity.createQueryBuilder()
                          .insert()
                          .into(GraphDaysEntity)
                          .values({
                            at_work: 'W',
                            work_day: +dataDay[0].split('.')[0],
                            work_time: dataDay[1],
                            the_date: dataDay[0],
                            the_day_Format_Date: formatDate,
                            work_type: 'day',
                            week_day_name: dataDay[2],
                            month_id: findMonth[0].id,
                          })
                          .returning(['id'])
                          .execute()
                          .catch((e) => {
                            throw new HttpException(
                              'Bad Request',
                              HttpStatus.BAD_REQUEST,
                            );
                          });
                      } else if (typesSmen.includes(dataDay[1])) {
                        await GraphDaysEntity.createQueryBuilder()
                          .insert()
                          .into(GraphDaysEntity)
                          .values({
                            at_work: 'W',
                            work_day: +dataDay[0].split('.')[0],
                            work_time: dataDay[1],
                            the_date: dataDay[0],
                            the_day_Format_Date: formatDate,
                            work_type: 'smen',
                            week_day_name: dataDay[2],
                            month_id: findMonth[0].id,
                          })
                          .returning(['id'])
                          .execute()
                          .catch((e) => {
                            throw new HttpException(
                              'Bad Request',
                              HttpStatus.BAD_REQUEST,
                            );
                          });
                      }
                    }
                  }
                }
              } else {
                const mothData = await returnMothData(firstday);

                const newMoth = await GraphMonthEntity.createQueryBuilder()
                  .insert()
                  .into(GraphMonthEntity)
                  .values({
                    year: firstday.split('.')[2],
                    month_number: +firstday.split('.')[1],
                    month_name: mothData?.name,
                    month_days_count: mothData?.days,
                    agent_id: updateAgent.raw[0].agent_id,
                  })
                  .returning(['id'])
                  .execute()
                  .catch((e) => {
                    throw new HttpException(
                      'Bad Request',
                      HttpStatus.BAD_REQUEST,
                    );
                  });

                if (newMoth) {
                  for (let i = 6; i < e.length; i++) {
                    const dataDay = e[i].split('/');
                    let formatDate = new Date(
                      +dataDay[0]?.split('.')[2],
                      +dataDay[0]?.split('.')[1] - 1,
                      +dataDay[0]?.split('.')[0],
                    );

                    const typesGraph = [
                      'DAM',
                      'Н',
                      'К',
                      'Б',
                      'О',
                      'Р',
                      'П',
                      'А',
                      'У',
                    ];
                    const typesTime = [
                      '10-19',
                      '07-16',
                      '08-17',
                      '09-18',
                      '11-20',
                      '13-22',
                      '15-24',
                      '17-02',
                      '07-15',
                      '08-16',
                      '09-17',
                      '08-18',
                      '18-08',
                      '14-23',
                      '18-09',
                      '09-18',
                    ];
                    const typesSmen = ['08-20', '20-08'];

                    if (typesGraph.includes(dataDay[1])) {
                      await GraphDaysEntity.createQueryBuilder()
                        .insert()
                        .into(GraphDaysEntity)
                        .values({
                          at_work: dataDay[1],
                          work_day: +dataDay[0].split('.')[0],
                          work_time: null,
                          the_date: dataDay[0],
                          the_day_Format_Date: formatDate,
                          work_type: dataDay[1],
                          week_day_name: dataDay[2],
                          month_id: newMoth.raw[0].id,
                        })
                        .returning(['id'])
                        .execute()
                        .catch((e) => {
                          throw new HttpException(
                            'Bad Request',
                            HttpStatus.BAD_REQUEST,
                          );
                        });
                    } else if (typesTime.includes(dataDay[1])) {
                      await GraphDaysEntity.createQueryBuilder()
                        .insert()
                        .into(GraphDaysEntity)
                        .values({
                          at_work: 'W',
                          work_day: +dataDay[0].split('.')[0],
                          work_time: dataDay[1],
                          the_date: dataDay[0],
                          the_day_Format_Date: formatDate,
                          work_type: 'day',
                          week_day_name: dataDay[2],
                          month_id: newMoth.raw[0].id,
                        })
                        .returning(['id'])
                        .execute()
                        .catch((e) => {
                          throw new HttpException(
                            'Bad Request',
                            HttpStatus.BAD_REQUEST,
                          );
                        });
                    } else if (typesSmen.includes(dataDay[1])) {
                      await GraphDaysEntity.createQueryBuilder()
                        .insert()
                        .into(GraphDaysEntity)
                        .values({
                          at_work: 'W',
                          work_day: +dataDay[0].split('.')[0],
                          work_time: dataDay[1],
                          the_date: dataDay[0],
                          the_day_Format_Date: formatDate,
                          work_type: 'smen',
                          week_day_name: dataDay[2],
                          month_id: newMoth.raw[0].id,
                        })
                        .returning(['id'])
                        .execute()
                        .catch((e) => {
                          throw new HttpException(
                            'Bad Request',
                            HttpStatus.BAD_REQUEST,
                          );
                        });
                    }
                  }
                }
              }
            }
          } else {
            // agent else

            const newAgent = await AgentDateEntity.createQueryBuilder()
              .insert()
              .into(AgentDateEntity)
              .values({
                service_name: e[1],
                name: e[3],
                id_login: e[4],
                id: e[5],
              })
              .returning(['agent_id'])
              .execute()
              .catch((e) => {
                throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
              });

            if (newAgent) {
              const firstday = e[6].split('/')[0];

              const mothData = await returnMothData(firstday);
              const newMoth = await GraphMonthEntity.createQueryBuilder()
                .insert()
                .into(GraphMonthEntity)
                .values({
                  year: firstday.split('.')[2],
                  month_number: +firstday.split('.')[1],
                  month_name: mothData.name,
                  month_days_count: mothData.days,
                  agent_id: newAgent.raw[0].agent_id,
                })
                .returning(['id'])
                .execute()
                .catch((e) => {
                  throw new HttpException(
                    'Bad Request',
                    HttpStatus.BAD_REQUEST,
                  );
                });

              if (newMoth) {
                for (let i = 6; i < e.length; i++) {
                  const dataDay = e[i].split('/');
                  let formatDate = new Date(
                    +dataDay[0]?.split('.')[2],
                    +dataDay[0]?.split('.')[1] - 1,
                    +dataDay[0]?.split('.')[0],
                  );

                  const typesGraph = [
                    'DAM',
                    'Н',
                    'К',
                    'Б',
                    'О',
                    'Р',
                    'П',
                    'А',
                    'У',
                  ];
                  const typesTime = [
                    '10-19',
                    '07-16',
                    '08-17',
                    '09-18',
                    '11-20',
                    '13-22',
                    '15-24',
                    '17-02',
                    '07-15',
                    '08-16',
                    '09-17',
                    '08-18',
                    '18-08',
                    '14-23',
                    '18-09',
                    '09-18',
                  ];
                  const typesSmen = ['08-20', '20-08'];
                  // console.log(dataDay[1] , dataDay , firstday );
                  //

                  if (typesGraph.includes(dataDay[1])) {
                    await GraphDaysEntity.createQueryBuilder()
                      .insert()
                      .into(GraphDaysEntity)
                      .values({
                        at_work: dataDay[1],
                        work_day: +dataDay[0].split('.')[0],
                        work_time: null,
                        the_date: dataDay[0],
                        the_day_Format_Date: formatDate,
                        work_type: dataDay[1],
                        week_day_name: dataDay[2],
                        month_id: newMoth.raw[0].id,
                      })
                      .returning(['id'])
                      .execute()
                      .catch((e) => {
                        throw new HttpException(
                          'Bad Request',
                          HttpStatus.BAD_REQUEST,
                        );
                      });
                  } else if (typesTime.includes(dataDay[1])) {
                    await GraphDaysEntity.createQueryBuilder()
                      .insert()
                      .into(GraphDaysEntity)
                      .values({
                        at_work: 'W',
                        work_day: +dataDay[0].split('.')[0],
                        work_time: dataDay[1],
                        the_date: dataDay[0],
                        the_day_Format_Date: formatDate,
                        work_type: 'day',
                        week_day_name: dataDay[2],
                        month_id: newMoth.raw[0].id,
                      })
                      .returning(['id'])
                      .execute()
                      .catch((e) => {
                        throw new HttpException(
                          'Bad Request',
                          HttpStatus.BAD_REQUEST,
                        );
                      });
                  } else if (typesSmen.includes(dataDay[1])) {
                    await GraphDaysEntity.createQueryBuilder()
                      .insert()
                      .into(GraphDaysEntity)
                      .values({
                        at_work: 'W',
                        work_day: +dataDay[0].split('.')[0],
                        work_time: dataDay[1],
                        the_date: dataDay[0],
                        the_day_Format_Date: formatDate,
                        work_type: 'smen',
                        week_day_name: dataDay[2],
                        month_id: newMoth.raw[0].id,
                      })
                      .returning(['id'])
                      .execute()
                      .catch((e) => {
                        throw new HttpException(
                          'Bad Request',
                          HttpStatus.BAD_REQUEST,
                        );
                      });
                  }
                }
              }
            }
          }
        }
      }
      return true;
    }
  }

  async writeNewGraph() {
    try {
      // await this.deleteOperators();
      const cutRanges = 'A2:AK500';
      console.log('okkkkk');

      const rangeName: string = '229';
      const sheets = await readSheets(
        '1BF7Z9CTKdL-RvBwzZTcB4gvOqoviX6fUwHIBmSlG_ow',
        rangeName,
        cutRanges,
      );
      console.log(sheets);

      for (const e of sheets) {
        if (e[1] == '229' || e[1] == '255' || e[1] == '1009') {
          const findAgent: AgentDateEntity = await AgentDateEntity.findOne({
            where: {
              id_login: e[4],
            },
            relations: {
              months: {
                days: true,
              },
            },
          });

          if (findAgent) {
            const updateAgent = await AgentDateEntity.createQueryBuilder()
              .update(AgentDateEntity)
              .set({ service_name: e[1], id_login: e[4], name: e[3], id: e[5] })
              .where('agent_id = :id', { id: findAgent.agent_id })
              .returning(['agent_id'])
              .execute();

            if (updateAgent) {
              const firstday = e[6].split('/')[0];

              const findMonth = await GraphMonthEntity.findOne({
                where: {
                  year: firstday.split('.')[2],
                  month_number: firstday.split('.')[1],
                  agent_id: updateAgent.raw[0]?.agent_id,
                },
              });

              if (findMonth) {
                const mothData = await returnMothData(firstday);
                const updateMoth = await GraphMonthEntity.createQueryBuilder()
                  .update(GraphMonthEntity)
                  .set({
                    year: firstday.split('.')[2],
                    month_number: +firstday.split('.')[1],
                    month_name: mothData.name,
                    month_days_count: mothData.days,
                    agent_id: updateAgent.raw[0].agent_id,
                  })
                  .where('id = :id', { id: findMonth.id })
                  .returning(['id'])
                  .execute()
                  .catch((e) => console.log(e));

                if (updateMoth) {
                  for (let i = 6; i < e.length; i++) {
                    const dataDay = e[i].split('/');

                    const typesGraph = [
                      'DAM',
                      'Н',
                      'К',
                      'Б',
                      'О',
                      'Р',
                      'П',
                      'А',
                      'У',
                    ];
                    const typesTime = [
                      '06-15',
                      '10-19',
                      '07-16',
                      '08-17',
                      '09-18',
                      '11-20',
                      '13-22',
                      '15-24',
                      '17-02',
                      '07-15',
                      '08-16',
                      '09-17',
                      '08-18',
                      '18-08',
                      '14-23',
                      '18-09',
                      '09-18',
                    ];
                    const typesSmen = ['08-20', '20-08'];

                    const findDay = await GraphDaysEntity.findOne({
                      where: {
                        the_date: dataDay[0],
                        month_id: {
                          id: updateMoth?.raw[0]?.id, // `month_id` uchun to'g'ridan-to'g'ri qiymatni ko'rsating ,
                          // agent_id : {
                          //   agent_id: updateAgent.raw[0].agent_id
                          // }
                          //  agent_id: findAgent.agent_id as any
                        },
                      },
                      relations: {
                        month_id: {
                          agent_id: true,
                        },
                      },
                    }).catch((e) => console.log(e));
                    let formatDate = new Date(
                      +dataDay[0]?.split('.')[2],
                      +dataDay[0]?.split('.')[1] - 1,
                      +dataDay[0]?.split('.')[0],
                    );

                    if (findDay) {
                      if (typesGraph.includes(dataDay[1])) {
                        await GraphDaysEntity.createQueryBuilder()
                          .update(GraphDaysEntity)
                          .set({
                            at_work: dataDay[1],
                            work_day: +dataDay[0].split('.')[0],
                            work_time: null,
                            the_date: dataDay[0],
                            the_day_Format_Date: formatDate,
                            work_type: dataDay[1],
                            week_day_name: dataDay[2],
                          })
                          .where('id = :id', { id: findDay.id })
                          .returning(['id'])
                          .execute();
                      } else if (typesTime.includes(dataDay[1])) {
                        await GraphDaysEntity.createQueryBuilder()
                          .update(GraphDaysEntity)
                          .set({
                            at_work: 'W',
                            work_day: +dataDay[0].split('.')[0],
                            work_time: dataDay[1],
                            the_date: dataDay[0],
                            the_day_Format_Date: formatDate,
                            work_type: 'day',
                            week_day_name: dataDay[2],
                          })
                          .where('id = :id', { id: findDay.id })
                          .returning(['id'])
                          .execute();
                      } else if (typesSmen.includes(dataDay[1])) {
                        await GraphDaysEntity.createQueryBuilder()
                          .update(GraphDaysEntity)
                          .set({
                            at_work: 'W',
                            work_day: +dataDay[0].split('.')[0],
                            work_time: dataDay[1],
                            the_date: dataDay[0],
                            the_day_Format_Date: formatDate,
                            work_type: 'smen',
                            week_day_name: dataDay[2],
                          })
                          .where('id = :id', { id: findDay.id })
                          .returning(['id'])
                          .execute();
                      }
                    } else {
                      if (typesGraph.includes(dataDay[1])) {
                        await GraphDaysEntity.createQueryBuilder()
                          .insert()
                          .into(GraphDaysEntity)
                          .values({
                            at_work: dataDay[1],
                            work_day: +dataDay[0].split('.')[0],
                            work_time: null,
                            the_date: dataDay[0],
                            the_day_Format_Date: formatDate,
                            work_type: dataDay[1],
                            week_day_name: dataDay[2],
                            month_id: {
                              id: findMonth?.id,
                            },
                          })
                          .returning(['id'])
                          .execute()
                          .catch((e) => {
                            throw new HttpException(
                              'Bad Request',
                              HttpStatus.BAD_REQUEST,
                            );
                          });
                      } else if (typesTime.includes(dataDay[1])) {
                        await GraphDaysEntity.createQueryBuilder()
                          .insert()
                          .into(GraphDaysEntity)
                          .values({
                            at_work: 'W',
                            work_day: +dataDay[0].split('.')[0],
                            work_time: dataDay[1],
                            the_date: dataDay[0],
                            the_day_Format_Date: formatDate,
                            work_type: 'day',
                            week_day_name: dataDay[2],
                            month_id: {
                              id: findMonth?.id,
                            },
                          })
                          .returning(['id'])
                          .execute()
                          .catch((e) => {
                            throw new HttpException(
                              'Bad Request',
                              HttpStatus.BAD_REQUEST,
                            );
                          });
                      } else if (typesSmen.includes(dataDay[1])) {
                        await GraphDaysEntity.createQueryBuilder()
                          .insert()
                          .into(GraphDaysEntity)
                          .values({
                            at_work: 'W',
                            work_day: +dataDay[0].split('.')[0],
                            work_time: dataDay[1],
                            the_date: dataDay[0],
                            the_day_Format_Date: formatDate,
                            work_type: 'smen',
                            week_day_name: dataDay[2],
                            month_id: {
                              id: findMonth?.id,
                            },
                          })
                          .returning(['id'])
                          .execute()
                          .catch((e) => {
                            throw new HttpException(
                              'Bad Request',
                              HttpStatus.BAD_REQUEST,
                            );
                          });
                      }
                    }
                  }
                }
              } else {
                const mothData = await returnMothData(firstday);

                const newMoth = await GraphMonthEntity.createQueryBuilder()
                  .insert()
                  .into(GraphMonthEntity)
                  .values({
                    year: firstday.split('.')[2],
                    month_number: +firstday.split('.')[1],
                    month_name: mothData?.name,
                    month_days_count: mothData?.days,
                    agent_id: updateAgent.raw[0].agent_id,
                  })
                  .returning(['id'])
                  .execute()
                  .catch((e) => {
                    throw new HttpException(
                      'Bad Request',
                      HttpStatus.BAD_REQUEST,
                    );
                  });

                if (newMoth) {
                  for (let i = 6; i < e.length; i++) {
                    const dataDay = e[i].split('/');
                    let formatDate = new Date(
                      +dataDay[0]?.split('.')[2],
                      +dataDay[0]?.split('.')[1] - 1,
                      +dataDay[0]?.split('.')[0],
                    );

                    const typesGraph = [
                      'DAM',
                      'Н',
                      'К',
                      'Б',
                      'О',
                      'Р',
                      'П',
                      'А',
                      'У',
                    ];
                    const typesTime = [
                      '06-15',
                      '10-19',
                      '07-16',
                      '08-17',
                      '09-18',
                      '11-20',
                      '13-22',
                      '15-24',
                      '17-02',
                      '07-15',
                      '08-16',
                      '09-17',
                      '08-18',
                      '18-08',
                      '14-23',
                      '18-09',
                      '09-18',
                    ];
                    const typesSmen = ['08-20', '20-08'];

                    if (typesGraph.includes(dataDay[1])) {
                      await GraphDaysEntity.createQueryBuilder()
                        .insert()
                        .into(GraphDaysEntity)
                        .values({
                          at_work: dataDay[1],
                          work_day: +dataDay[0].split('.')[0],
                          work_time: null,
                          the_date: dataDay[0],
                          the_day_Format_Date: formatDate,
                          work_type: dataDay[1],
                          week_day_name: dataDay[2],
                          month_id: newMoth.raw[0].id,
                        })
                        .returning(['id'])
                        .execute()
                        .catch((e) => {
                          throw new HttpException(
                            'Bad Request',
                            HttpStatus.BAD_REQUEST,
                          );
                        });
                    } else if (typesTime.includes(dataDay[1])) {
                      await GraphDaysEntity.createQueryBuilder()
                        .insert()
                        .into(GraphDaysEntity)
                        .values({
                          at_work: 'W',
                          work_day: +dataDay[0].split('.')[0],
                          work_time: dataDay[1],
                          the_date: dataDay[0],
                          the_day_Format_Date: formatDate,
                          work_type: 'day',
                          week_day_name: dataDay[2],
                          month_id: newMoth.raw[0].id,
                        })
                        .returning(['id'])
                        .execute()
                        .catch((e) => {
                          throw new HttpException(
                            'Bad Request',
                            HttpStatus.BAD_REQUEST,
                          );
                        });
                    } else if (typesSmen.includes(dataDay[1])) {
                      await GraphDaysEntity.createQueryBuilder()
                        .insert()
                        .into(GraphDaysEntity)
                        .values({
                          at_work: 'W',
                          work_day: +dataDay[0].split('.')[0],
                          work_time: dataDay[1],
                          the_date: dataDay[0],
                          the_day_Format_Date: formatDate,
                          work_type: 'smen',
                          week_day_name: dataDay[2],
                          month_id: newMoth.raw[0].id,
                        })
                        .returning(['id'])
                        .execute()
                        .catch((e) => {
                          throw new HttpException(
                            'Bad Request',
                            HttpStatus.BAD_REQUEST,
                          );
                        });
                    }
                  }
                }
              }
            }
          } else {
            // agent else

            const newAgent = await AgentDateEntity.createQueryBuilder()
              .insert()
              .into(AgentDateEntity)
              .values({
                service_name: e[1],
                name: e[3],
                id_login: e[4],
                id: e[5],
              })
              .returning(['agent_id'])
              .execute()
              .catch((e) => {
                throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
              });

            if (newAgent) {
              const firstday = e[6].split('/')[0];

              const mothData = await returnMothData(firstday);
              const newMoth = await GraphMonthEntity.createQueryBuilder()
                .insert()
                .into(GraphMonthEntity)
                .values({
                  year: firstday.split('.')[2],
                  month_number: +firstday.split('.')[1],
                  month_name: mothData.name,
                  month_days_count: mothData.days,
                  agent_id: newAgent.raw[0].agent_id,
                })
                .returning(['id'])
                .execute()
                .catch((e) => {
                  throw new HttpException(
                    'Bad Request',
                    HttpStatus.BAD_REQUEST,
                  );
                });

              if (newMoth) {
                for (let i = 6; i < e.length; i++) {
                  const dataDay = e[i].split('/');
                  let formatDate = new Date(
                    +dataDay[0]?.split('.')[2],
                    +dataDay[0]?.split('.')[1] - 1,
                    +dataDay[0]?.split('.')[0],
                  );

                  const typesGraph = [
                    'DAM',
                    'Н',
                    'К',
                    'Б',
                    'О',
                    'Р',
                    'П',
                    'А',
                    'У',
                  ];
                  const typesTime = [
                    '06-15',
                    '10-19',
                    '07-16',
                    '08-17',
                    '09-18',
                    '11-20',
                    '13-22',
                    '15-24',
                    '17-02',
                    '07-15',
                    '08-16',
                    '09-17',
                    '08-18',
                    '18-08',
                    '14-23',
                    '18-09',
                    '09-18',
                  ];
                  const typesSmen = ['08-20', '20-08'];
                  // console.log(dataDay[1] , dataDay , firstday );
                  //

                  if (typesGraph.includes(dataDay[1])) {
                    await GraphDaysEntity.createQueryBuilder()
                      .insert()
                      .into(GraphDaysEntity)
                      .values({
                        at_work: dataDay[1],
                        work_day: +dataDay[0].split('.')[0],
                        work_time: null,
                        the_date: dataDay[0],
                        the_day_Format_Date: formatDate,
                        work_type: dataDay[1],
                        week_day_name: dataDay[2],
                        month_id: newMoth.raw[0].id,
                      })
                      .returning(['id'])
                      .execute()
                      .catch((e) => {
                        throw new HttpException(
                          'Bad Request',
                          HttpStatus.BAD_REQUEST,
                        );
                      });
                  } else if (typesTime.includes(dataDay[1])) {
                    await GraphDaysEntity.createQueryBuilder()
                      .insert()
                      .into(GraphDaysEntity)
                      .values({
                        at_work: 'W',
                        work_day: +dataDay[0].split('.')[0],
                        work_time: dataDay[1],
                        the_date: dataDay[0],
                        the_day_Format_Date: formatDate,
                        work_type: 'day',
                        week_day_name: dataDay[2],
                        month_id: newMoth.raw[0].id,
                      })
                      .returning(['id'])
                      .execute()
                      .catch((e) => {
                        throw new HttpException(
                          'Bad Request',
                          HttpStatus.BAD_REQUEST,
                        );
                      });
                  } else if (typesSmen.includes(dataDay[1])) {
                    await GraphDaysEntity.createQueryBuilder()
                      .insert()
                      .into(GraphDaysEntity)
                      .values({
                        at_work: 'W',
                        work_day: +dataDay[0].split('.')[0],
                        work_time: dataDay[1],
                        the_date: dataDay[0],
                        the_day_Format_Date: formatDate,
                        work_type: 'smen',
                        week_day_name: dataDay[2],
                        month_id: newMoth.raw[0].id,
                      })
                      .returning(['id'])
                      .execute()
                      .catch((e) => {
                        throw new HttpException(
                          'Bad Request',
                          HttpStatus.BAD_REQUEST,
                        );
                      });
                  }
                }
              }
            }
          }
        }
      }
      return true;
    } catch (error) {
      console.log(error.message);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async controlOperator() {
    const atDate = new Date();

    const theCurrentHour = atDate.getHours();
    const theCurrentMinut = atDate.getMinutes();
    const RequestTimeMinutes = [1, 4, 10, 30];
    const uzbekistanTime = new Date(atDate.getTime() + 5 * 60 * 60 * 1000);
    console.log(theCurrentHour, theCurrentMinut, atDate, uzbekistanTime);
    const controlday = await ControlAgentGraphSendSheet(
      '09-18',
      theCurrentHour,
      this.#_cache,
    );

    if (RequestTimeMinutes.includes(theCurrentMinut)) {
      if (theCurrentHour == 7) {
        const controlday = await ControlAgentGraphSendSheet(
          '06-15',
          theCurrentHour,
          this.#_cache,
        );
        const allDataDay = Promise.all(controlday);
      }
      if (theCurrentHour == 7) {
        const controlday = await ControlAgentGraphSendSheet(
          '07-16',
          theCurrentHour,
          this.#_cache,
        );
        const allDataDay = Promise.all(controlday);
      }
      if (theCurrentHour == 8) {
        const controlday = await ControlAgentGraphSendSheet(
          '08-17',
          theCurrentHour,
          this.#_cache,
        );
        const allDataday = Promise.all(controlday);
        const controlSmen = await ControlAgentGraphSendSheet(
          '08-20',
          theCurrentHour,
          this.#_cache,
        );
        const allDataSmena = Promise.all(controlSmen);
      }
      if (theCurrentHour == 9) {
        const controlday = await ControlAgentGraphSendSheet(
          '09-18',
          theCurrentHour,
          this.#_cache,
        );
        const allDataDay = Promise.all(controlday);
      }
      if (theCurrentHour == 11) {
        const controlday = await ControlAgentGraphSendSheet(
          '11-20',
          theCurrentHour,
          this.#_cache,
        );
        const allDataDay = Promise.all(controlday);
      }
      if (theCurrentHour == 13) {
        const controlday = await ControlAgentGraphSendSheet(
          '13-22',
          theCurrentHour,
          this.#_cache,
        );
        const allDataDay = Promise.all(controlday);
      }
      if (theCurrentHour == 15) {
        const controlday = await ControlAgentGraphSendSheet(
          '15-24',
          theCurrentHour,
          this.#_cache,
        );
        const allDataDay = Promise.all(controlday);
      }
      if (theCurrentHour == 17) {
        const controlday = await ControlAgentGraphSendSheet(
          '17-02',
          theCurrentHour,
          this.#_cache,
        );
        const allDataDay = Promise.all(controlday);
      }

      if (theCurrentHour == 20) {
        const controlSmen = await ControlAgentGraphSendSheet(
          '20-08',
          theCurrentHour,
          this.#_cache,
        );
        const allDataSmena = Promise.all(controlSmen);
      }
    }

    this.actionOperator();
  }

  @Cron('0 0 1 * *')
  async writeIpAdress() {
    const cutRanges = 'A2:D999';
    // const sheetId: string = '1BF7Z9CTKdL-RvBwzZTcB4gvOqoviX6fUwHIBmSlG_ow';
    const rangeName: string = 'IP 255';
    const sheets = await readSheets(
      '1BF7Z9CTKdL-RvBwzZTcB4gvOqoviX6fUwHIBmSlG_ow',
      rangeName,
      cutRanges,
    );

    for (const e of sheets) {
      console.log(e);
      if (e[0]) {
        const findComp = await ComputersEntity.findOne({
          where: {
            sheet_id: e[0],
          },
        });

        if (findComp) {
          await ComputersEntity.update(findComp.id, {
            sheet_id: e[0],
            ip_Adress: e[1],
            location: e[2],
            atc: e[3],
          });
        } else {
          await ComputersEntity.createQueryBuilder()
            .insert()
            .into(ComputersEntity)
            .values({
              sheet_id: e[0],
              ip_Adress: e[1],
              location: e[2],
              atc: e[3],
            })
            .execute()
            .catch((e) => {
              throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
            });
        }
      }
    }
  }

  async deleteOperator() {
    try {
      const cutRanges = 'A2:B500';

      // const sheetId: string = '1BF7Z9CTKdL-RvBwzZTcB4gvOqoviX6fUwHIBmSlG_ow';
      const rangeName: string = '229 DELETE';
      const sheets = await readSheets(
        '1BF7Z9CTKdL-RvBwzZTcB4gvOqoviX6fUwHIBmSlG_ow',
        rangeName,
        cutRanges,
      );
      console.log(sheets);

      for (const e of sheets) {
        if (e[1]) {
          console.log(e[1]);
          const findAgent: AgentDateEntity = await AgentDateEntity.findOne({
            where: {
              id: e[1],
            },
          });
          if (findAgent) {
            await AgentDateEntity.delete({ id: e[1] });
          }
        }
      }
    } catch (error) {
      console.log(error.message);
    }
  }

  async deleteOperators() {
    const findAgents: AgentDateEntity[] = await AgentDateEntity.find();
    console.log(findAgents);

    for (let e of findAgents) {
      await AgentDateEntity.delete({ id: e.id });
    }
    return true;
  }

  // @Cron('0 */25 * * * *')
  // async controlOperator() {
  //   const atDate = new Date();

  //   const theCurrentHour = atDate.getHours();
  //   //  console.log(theCurrentHour);

  //   // console.log(convertDate(atDate));
  //   if (
  //     (6 <= theCurrentHour && theCurrentHour <= 8) ||
  //     (15 <= theCurrentHour && theCurrentHour <= 17)
  //   ) {
  //     // console.log('if 1');

  //     const as = await ControlAgentGraph('07-16', theCurrentHour);
  //     const a = Promise.all(as);
  //   }

  //   if (
  //     (7 <= theCurrentHour && theCurrentHour <= 9) ||
  //     (16 <= theCurrentHour && theCurrentHour <= 18)
  //   ) {
  //     // console.log('if 2');

  //     // await ControlAgentGraph('08-17', theCurrentHour)
  //     const as = await ControlAgentGraph('08-17', theCurrentHour);
  //     const a = Promise.all(as);
  //   }

  //   if (
  //     (8 <= theCurrentHour && theCurrentHour <= 10) ||
  //     (17 <= theCurrentHour && theCurrentHour <= 19)
  //   ) {
  //     // await ControlAgentGraph('09-18', theCurrentHour)
  //     // console.log('if 3');

  //     const as = await ControlAgentGraph('09-18', theCurrentHour);
  //     const a = Promise.all(as);
  //   }

  //   if (
  //     (10 <= theCurrentHour && theCurrentHour <= 12) ||
  //     (19 <= theCurrentHour && theCurrentHour <= 21)
  //   ) {
  //     // console.log('if 4');

  //     await ControlAgentGraph('11-20', theCurrentHour);
  //     const as = await ControlAgentGraph('11-20', theCurrentHour);
  //     const a = Promise.all(as);
  //   }

  //   if (
  //     (12 <= theCurrentHour && theCurrentHour <= 14) ||
  //     (21 <= theCurrentHour && theCurrentHour <= 23)
  //   ) {
  //     // console.log('if 5');

  //     // await ControlAgentGraph('13-22', theCurrentHour)
  //     const as = await ControlAgentGraph('13-22', theCurrentHour);
  //     const a = Promise.all(as);
  //   }

  //   if (
  //     (14 <= theCurrentHour && theCurrentHour <= 16) ||
  //     (23 <= theCurrentHour && theCurrentHour <= 24) ||
  //     (0 <= theCurrentHour && theCurrentHour <= 1)
  //   ) {
  //     // console.log('if 6');

  //     // await ControlAgentGraph('15-24', theCurrentHour)
  //     const as = await ControlAgentGraph('15-24', theCurrentHour);
  //     const a = Promise.all(as);
  //   }

  //   if (
  //     (16 <= theCurrentHour && theCurrentHour <= 18) ||
  //     (1 <= theCurrentHour && theCurrentHour <= 3)
  //   ) {
  //     // await ControlAgentGraph('17-02', theCurrentHour)
  //     // console.log('if 7');

  //     const as = await ControlAgentGraph('17-02', theCurrentHour);
  //     const a = Promise.all(as);
  //   }

  //   if (
  //     (7 <= theCurrentHour && theCurrentHour <= 9) ||
  //     (19 <= theCurrentHour && theCurrentHour <= 21)
  //   ) {
  //     // console.log('if 8');

  //     // await ControlAgentGraphSmena('8-20', theCurrentHour)
  //     // await ControlAgentGraphSmena('20-8', theCurrentHour)

  //     const as = await ControlAgentGraphSmena('8-20', theCurrentHour);
  //     const a = Promise.all(as);

  //     const as1 = await ControlAgentGraphSmena('20-8', theCurrentHour);
  //     const a1 = Promise.all(as1);
  //   }
  // }

  @Cron(CronExpression.EVERY_MINUTE)
  async actionOperator() {
    console.log('actionOperator');

    let actionOperators: any = await this.#_cache.get('activeOperators');
    let arrSentExcelFormat = [];
    // console.log(actionOperators);

    //     {
    //   id: '7462',
    //   ip_adress: '192.168.61.10',
    //   login: '180',
    //   firstName: 'Feruza',
    //   lastName: 'Zikirova',
    //   secondName: 'Raxmonberdiyevna',
    //   lockCause: '-1',
    //   agentState: '3',
    //   agentStateDuration: '322'
    // }
    if (actionOperators) {
      for (let e of actionOperators) {
        arrSentExcelFormat.push([
          e.id,
          e.login,
          `${e.lastName} ${e.firstName} ${e.secondName}`,
          e.lockCause,
          e.agentState,
          e.agentStateDuration,
          e.ip_adress,
        ]);
      }
      // await insertRowsAtTop(
      //   process.env.SHEETIDSECOND,
      //   '828318522',
      //   arrSentExcelFormat?.length,
      // );
      // await writeToSheet(
      //   process.env.SHEETIDSECOND,
      //   '229-Перерыв/Обед',
      //   'A1',
      //   arrSentExcelFormat,
      // );
    }

    return true;
  }
  // }
}
