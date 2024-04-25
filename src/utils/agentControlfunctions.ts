import { GraphDaysEntity } from "src/entities/graphDays"
import { convertDate, parseTimeStringToSeconds, secondsToTimeFormat, subtractTime } from "./converters"
import { agentControlGraphEntity } from "src/entities/agentsControlGrafigh.entity"
import { Between } from "typeorm"
import { HttpException, HttpStatus } from "@nestjs/common"
import { fetchGetagentStatistic } from "./functionForFetchSoap"

function waitFor5Seconds() {
    return new Promise((resolve) => {
        setTimeout(resolve, 5000); // 5,000 millisekund (5 soniya) kutamiz
    });
}

export const ControlAgentGraph = async(worktime: string , theCurrentHour :number) => {
    const typeWorkGraph = ['15-24' , '17-02'  ]
    // 15-24. 17-02.
    const atDate = new Date()
    let theDate = convertDate(atDate)
    const theDay=  theDate.split('.')[0]
    const theMonth :number = +theDate.split('.')[1]
    const theYear :string = theDate.split('.')[2]
    const workTimeArr = worktime.split('-')
    const startControlTime = +workTimeArr[0]-1 
    const endControlTime= +workTimeArr[0]+1 
    let fromDate = new Date();
    fromDate.setHours(0, 0, 0, 0);
    
    let untilDate = new Date();
    untilDate.setHours(23, 59, 59, 999)


    
        if(worktime == '17-02' ) {
            if(startControlTime <= theCurrentHour && theCurrentHour <= 24) {
                fromDate = new Date();
                fromDate.setHours(startControlTime, 0, 0, 0); //16
                
                untilDate = new Date();
                untilDate.setDate(untilDate.getDate() + 1);
                untilDate.setHours(3, 0, 0, 0) 
            } else {
                fromDate = new Date();
                untilDate.setDate(untilDate.getDate() - 1);
                fromDate.setHours(startControlTime, 0, 0, 0); //16
                
                untilDate = new Date();
                untilDate.setDate(untilDate.getDate());
                untilDate.setHours(3, 0, 0, 0) 
            }
        }

        if(worktime == '15-24' ) {
            if(startControlTime <= theCurrentHour && theCurrentHour <= endControlTime - 1) {
                fromDate = new Date();
                fromDate.setHours(startControlTime, 0, 0, 0); //16
                
                untilDate = new Date();
                untilDate.setDate(untilDate.getDate() + 1);
                untilDate.setHours(2, 0, 0, 0) 
            } else if(23 <= theCurrentHour && theCurrentHour <= 24) {
                fromDate = new Date();
                fromDate.setHours(startControlTime, 0, 0, 0); //16
                
                untilDate = new Date();
                untilDate.setDate(untilDate.getDate() + 1);
                untilDate.setHours(2, 0, 0, 0) 


            } else  {
                fromDate = new Date();
                untilDate.setDate(untilDate.getDate() - 1);
                fromDate.setHours(startControlTime, 0, 0, 0); //16
                
                untilDate = new Date();
                untilDate.setDate(untilDate.getDate());
                untilDate.setHours(1, 0, 0, 0) 
            }
        }

    const startWorkTimeParseSeconds = parseTimeStringToSeconds(`${workTimeArr[0]}:00:00`)
    const endWorkTimeParseSeconds = parseTimeStringToSeconds(`${workTimeArr[1]}:00:00`)
    // console.log(worktime,`${theDay}.${theMonth.toString().length > 1 ? theMonth : `0${theMonth}` }.${theYear}` , theMonth, theYear);
    

    const listOfWorkersToday : any= await GraphDaysEntity.find({
      where: {
        the_date: `${theDay}.${theMonth.toString().length > 1 ? theMonth : `0${theMonth}` }.${theYear}`,
        work_type: 'day',
        work_time : worktime,
        // work_time : '08-18',
        month_id:{
          month_number: theMonth,
          year: theYear
        }
      },
      relations : {
        month_id : {
          agent_id : true
        }
      },

    })
    // console.log(listOfWorkersToday);
    
    
    // listOfWorkersToday?.forEach(async (e) => {
        for (const e of listOfWorkersToday) {
    //   console.log(e.month_id?.agent_id.id , 'idadn');
      const agentStatisticPromise = fetchGetagentStatistic(e.month_id?.agent_id?.id);

      let agentStatisticData = await Promise.all([agentStatisticPromise]);
        // console.log("So'rovdan keyin 5 soniya kutamiz...");
//   await waitFor5Seconds();
  await new Promise(resolve => setTimeout(resolve,5000));
//   Keyingi kodlar bu joyga yoziladi, 5 soniya o'tib ketdi

  // console.log("5 soniya o'tib ketdi. Keyingi qadamlar...");
  
    //   await   waitFor5Seconds()
    //   console.log('5 soniya');
      
     const  agentStatistic = agentStatisticData[0]

     const  findAgentinControlGraph :agentControlGraphEntity   = await agentControlGraphEntity.findOne({
      where :{
        id_login : e.month_id?.agent_id?.id_login ,
        create_data : Between(fromDate ,untilDate)
      }
     }).catch((e) => { 
      // console.log(e);
      throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
    });
    //  console.log(e.month_id?.agent_id?.id);
     
    //  console.log(agentStatistic,'ssssssuuuuuuuu');
     
     if(startControlTime <= theCurrentHour && theCurrentHour <= startControlTime + 2 ) {
      if(findAgentinControlGraph){

        if(agentStatistic.LastLoginTime != 'not login' && findAgentinControlGraph.LastLoginTime != 'not login') {
        //   console.log(findAgentinControlGraph,'0');

          await agentControlGraphEntity.createQueryBuilder()
          .update(agentControlGraphEntity)
          .set({ LastLoginTime: findAgentinControlGraph.LastLoginTime,
             FullDurationOfWork: agentStatistic.FulDuration,
            PauseDuration : agentStatistic.PauseDuration,
            TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
           })
          .where( {  agent_id:findAgentinControlGraph.agent_id   })
          .execute()
        } else if(agentStatistic.LastLoginTime == 'not login' && findAgentinControlGraph.LastLoginTime != 'not login') {
        //   console.log(findAgentinControlGraph,'1');

          await agentControlGraphEntity.createQueryBuilder()
          .update(agentControlGraphEntity)
          .set({ LastLoginTime: findAgentinControlGraph.LastLoginTime,
             FullDurationOfWork: agentStatistic.FulDuration,
            PauseDuration : agentStatistic.PauseDuration,
            TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
           })
          .where( {  agent_id:findAgentinControlGraph.agent_id   })
          .execute()
        }else if(agentStatistic.LastLoginTime == 'not login' ) {
    //  console.log(findAgentinControlGraph,'2');

          await agentControlGraphEntity.createQueryBuilder()
          .update(agentControlGraphEntity)
          .set({ LastLoginTime: agentStatistic.LastLoginTime,
             FullDurationOfWork: agentStatistic.FulDuration,
            PauseDuration : agentStatistic.PauseDuration, })
          .where( {  agent_id:findAgentinControlGraph.agent_id   })
          .execute()
        } else {
          const lastLoginTimeParseSeconds =  parseTimeStringToSeconds(agentStatistic.LastLoginTime)

          if(lastLoginTimeParseSeconds >= startWorkTimeParseSeconds) {
    //  console.log(findAgentinControlGraph,agentStatistic,'3');

            await agentControlGraphEntity.createQueryBuilder()
            .update(agentControlGraphEntity)
            .set({ LastLoginTime: agentStatistic.LastLoginTime,
               FullDurationOfWork: agentStatistic.FulDuration,
              PauseDuration : agentStatistic.PauseDuration,
              TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
            })
            .where( {  agent_id:findAgentinControlGraph.agent_id   })
            .execute()
          } else {
    //  console.log(findAgentinControlGraph, agentStatistic ,'4');

            await agentControlGraphEntity.createQueryBuilder()
            .update(agentControlGraphEntity)
            .set({ LastLoginTime: agentStatistic.LastLoginTime,
               FullDurationOfWork: agentStatistic.FulDuration,
              PauseDuration : agentStatistic.PauseDuration,
              TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
              
              ComeToWorkOnTime :true
            })
            .where( {  agent_id:findAgentinControlGraph.agent_id   })
            .execute()
          }

    
        }
      }else {
        const agentStatistic = await fetchGetagentStatistic(e.month_id?.agent_id.id,)

        if(agentStatistic.LastLoginTime = 'not login'){
         await agentControlGraphEntity.createQueryBuilder()
        .insert()
        .into(agentControlGraphEntity)
        .values({ 
          id: e.month_id?.agent_id.id,
          id_login: e.month_id?.agent_id?.id_login,
          id_login_type_number: + e.month_id?.agent_id?.id_login,
          name : e.month_id?.agent_id?.name,
          timeWork : e.work_time,
          typeWork: e.work_type,
          LastLoginTime:agentStatistic.LastLoginTime,
          FullDurationOfWork: agentStatistic.FulDuration,
          PauseDuration : agentStatistic.PauseDuration,
          TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
         })
        .execute()
        .catch((e) => {
          throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
        });
        }else {
          const lastLoginTimeParseSeconds =  parseTimeStringToSeconds(agentStatistic.LastLoginTime)
          if(lastLoginTimeParseSeconds >= startWorkTimeParseSeconds) {
            await agentControlGraphEntity.createQueryBuilder()
          .insert()
          .into(agentControlGraphEntity)
          .values({ 
            id: e.month_id?.agent_id.id ,
            id_login: e.month_id?.agent_id.id_login,
            id_login_type_number: +e.month_id?.agent_id.id_login,
            name : e.month_id?.agent_id.name,
            timeWork : e.work_time,
            typeWork: e.work_type,
            LastLoginTime:agentStatistic.LastLoginTime,
            FullDurationOfWork: agentStatistic.FulDuration,
            PauseDuration : agentStatistic.PauseDuration,
            TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
           })
          .execute()
          .catch((e) => {
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
          });
          } else {
            await agentControlGraphEntity.createQueryBuilder()
            .insert()
            .into(agentControlGraphEntity)
            .values({ 
              id: e.month_id?.agent_id.id,
              id_login: e.month_id?.agent_id.id_login,
              id_login_type_number: +e.month_id?.agent_id.id_login,
              name : e.month_id?.agent_id.name,
              timeWork : e.work_time,
              typeWork: e.work_type,
              LastLoginTime:agentStatistic.LastLoginTime,
              FullDurationOfWork: agentStatistic.FulDuration,
              PauseDuration : agentStatistic.PauseDuration,
              TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
              
              ComeToWorkOnTime: true
             })
            .execute()
            .catch((e) => {
              throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
            });
          }
        }
      
      }
      
     } else {
      if(findAgentinControlGraph) {
      //  console.log(agentStatistic); 
       if(findAgentinControlGraph.WorkState != 'did not work') {
        
          const fullDurationOfWorkTimeParseSeconds = parseTimeStringToSeconds(agentStatistic.FulDuration)
          const PauseDurationTimeParseSeconds =    parseTimeStringToSeconds(agentStatistic.PauseDuration)
        //   const timeofWork = parseTimeStringToSeconds('09:00:00')
          const timeofWorkOtherThanRest = parseTimeStringToSeconds('07:30:00')
          const timeToRest = parseTimeStringToSeconds('01:30:00')

          let timeIsOff = fullDurationOfWorkTimeParseSeconds + startWorkTimeParseSeconds 
          if(worktime = '17-02') {
          const timeofOneDay = parseTimeStringToSeconds('24:00:00')
            timeIsOff = fullDurationOfWorkTimeParseSeconds + startWorkTimeParseSeconds - timeofOneDay
          }

          if(endWorkTimeParseSeconds <= timeIsOff ) {
            if(PauseDurationTimeParseSeconds <= timeToRest) {
        // console.log(findAgentinControlGraph,'elsedan 1');

              await agentControlGraphEntity.createQueryBuilder()
              .update(agentControlGraphEntity)
              .set({ 
                 FullDurationOfWork: agentStatistic.FulDuration,
                PauseDuration : agentStatistic.PauseDuration,
                TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
                LeftAfterWork :true,
                TimeWorkIsDone: true,
                TimeWorked :  timeofWorkOtherThanRest + timeToRest  - fullDurationOfWorkTimeParseSeconds ,
                TimeEndWork: secondsToTimeFormat(parseTimeStringToSeconds(findAgentinControlGraph.LastLoginTime) + fullDurationOfWorkTimeParseSeconds)  
              })
              .where( {  agent_id:findAgentinControlGraph?.agent_id   })
              .execute()
            } else {
        // console.log(findAgentinControlGraph,'elsedan 2' , PauseDurationTimeParseSeconds , timeToRest ,timeofWorkOtherThanRest + timeToRest  - fullDurationOfWorkTimeParseSeconds );

              await agentControlGraphEntity.createQueryBuilder()
              .update(agentControlGraphEntity)
              .set({ 
                 FullDurationOfWork: agentStatistic.FulDuration,
                PauseDuration : agentStatistic.PauseDuration,
                TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
                LeftAfterWork :true,
                TimeWorked :  timeofWorkOtherThanRest + timeToRest  - fullDurationOfWorkTimeParseSeconds ,
                TimeEndWork: secondsToTimeFormat(parseTimeStringToSeconds(findAgentinControlGraph.LastLoginTime) + fullDurationOfWorkTimeParseSeconds)  
              })
              .where( {  agent_id:findAgentinControlGraph.agent_id })
              .execute()
            }
      
          }else {
            const timeWorked = timeofWorkOtherThanRest + timeToRest  - fullDurationOfWorkTimeParseSeconds
            if(PauseDurationTimeParseSeconds <= timeToRest &&  timeWorked <= 0 ) {
        // console.log(findAgentinControlGraph,'elsedan 3');

              await agentControlGraphEntity.createQueryBuilder()
              .update(agentControlGraphEntity)
              .set({ 
                 FullDurationOfWork: agentStatistic.FulDuration,
                PauseDuration : agentStatistic.PauseDuration,
                TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
                // LeftAfterWork :true,
                TimeWorkIsDone: true,
                TimeWorked :  timeofWorkOtherThanRest + timeToRest  - fullDurationOfWorkTimeParseSeconds ,
                TimeEndWork: secondsToTimeFormat(parseTimeStringToSeconds(findAgentinControlGraph.LastLoginTime) + fullDurationOfWorkTimeParseSeconds)  

              })
              .where( {  agent_id:findAgentinControlGraph.agent_id })
              .execute()
            } else {
        // console.log(findAgentinControlGraph,'elsedan 5');

              await agentControlGraphEntity.createQueryBuilder()
              .update(agentControlGraphEntity)
              .set({ 
                 FullDurationOfWork: agentStatistic.FulDuration,
                PauseDuration : agentStatistic.PauseDuration,
                TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
                // LeftAfterWork :true,
                TimeWorked :  timeofWorkOtherThanRest + timeToRest  - fullDurationOfWorkTimeParseSeconds,
                TimeEndWork: secondsToTimeFormat(parseTimeStringToSeconds(findAgentinControlGraph.LastLoginTime) + fullDurationOfWorkTimeParseSeconds)  

              })
              .where( {  agent_id:findAgentinControlGraph.agent_id   })
              .execute()
            }
          }
       } else {
        await agentControlGraphEntity.createQueryBuilder()
        .update(agentControlGraphEntity)
        .set({ LastLoginTime: agentStatistic.LastLoginTime,
           FullDurationOfWork: agentStatistic.FulDuration,
          PauseDuration : agentStatistic.PauseDuration,
          TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
        //   TImeEndWork: secondsToTimeFormat(parseTimeStringToSeconds(findAgentinControlGraph.LastLoginTime) + fullDurationOfWorkTimeParseSeconds)  

          // ComeToWorkOnTime :true
        })
        .where( {  agent_id:findAgentinControlGraph.agent_id   })
        .execute()
      }
       
        } else{
        //   console.log('okk' , e , e.month_id.agent_id.id_login, );
          await agentControlGraphEntity.createQueryBuilder()
          .insert()
          .into(agentControlGraphEntity)
          .values({ 
            id: e.month_id?.agent_id.id,
            id_login: e.month_id?.agent_id.id_login,
            id_login_type_number: +e.month_id?.agent_id.id_login,
            name : e.month_id?.agent_id.name,
            timeWork : e.work_time,
            typeWork: e.work_type,
            LastLoginTime:agentStatistic.LastLoginTime,
            FullDurationOfWork: agentStatistic.FulDuration,
            PauseDuration : agentStatistic.PauseDuration,
            TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
            // TImeEndWork: secondsToTimeFormat(parseTimeStringToSeconds(findAgentinControlGraph.LastLoginTime) + fullDurationOfWorkTimeParseSeconds)  ,


          //   ComeToWorkOnTime: true
                // WorkState: 'did not work'
           })
          .execute()
          .catch((e) => {
            // console.log(e);
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
          });
        }
     }


    } 
    return [true]

  }


  export const ControlAgentGraphSmena = async(worktime: string , theCurrentHour :number) => {
    const typeWorkGraph = ['08-20' , '20-08'  ]
    // 15-24. 17-02.
    const atDate = new Date()
    let theDate = convertDate(atDate)
    const theDay=  theDate.split('.')[0]
    const theMonth :number = +theDate.split('.')[1]
    const theYear :string = theDate.split('.')[2]
    const workTimeArr = worktime.split('-')
    const startControlTime = +workTimeArr[0]-1 
    const endControlTime= +workTimeArr[0]+1 
    let fromDate = new Date();
    fromDate.setHours(0, 0, 0, 0);
    
    let untilDate = new Date();
    untilDate.setHours(23, 59, 59, 999)


    
        if(worktime == '20-08' ) {
            if(startControlTime <= theCurrentHour && theCurrentHour <= 24) {
                fromDate = new Date();
                fromDate.setHours(startControlTime -1, 0, 0, 0); //16
                
                untilDate = new Date();
                untilDate.setDate(untilDate.getDate() + 1);
                untilDate.setHours(0, 0, 0, 0) 
            } else {
                fromDate = new Date();
                untilDate.setDate(untilDate.getDate() - 1);
                fromDate.setHours(startControlTime-1, 0, 0, 0); //16
                
                untilDate = new Date();
                untilDate.setDate(untilDate.getDate());
                untilDate.setHours(23, 59, 59, 999)

            }
        }

    const startWorkTimeParseSeconds = parseTimeStringToSeconds(`${workTimeArr[0]}:00:00`)
    const endWorkTimeParseSeconds = parseTimeStringToSeconds(`${workTimeArr[1]}:00:00`)

    const listOfWorkersToday : any= await GraphDaysEntity.find({
      where: {
        the_date: `${theDay}.${theMonth.toString().length > 1 ? theMonth : `0${theMonth}` }.${theYear}`,
        work_type: 'smen',
        work_time : worktime,
        // work_time : '08-18',
        month_id:{
          month_number: theMonth,
          year: theYear
        }
      },
      relations : {
        month_id : {
          agent_id : true
        }
      },

    })
    // console.log(listOfWorkersToday);
    
    
    // listOfWorkersToday?.forEach(async (e) => {
        for (const e of listOfWorkersToday) {
      // console.log(e.month_id?.agent_id.id_login);
     const  findAgentinControlGraph :agentControlGraphEntity   = await agentControlGraphEntity.findOne({
      where :{
        id_login : e.month_id?.agent_id?.id_login ,
        create_data : Between(fromDate ,untilDate)
      }
     }).catch((e) => { 
      // console.log(e);
      throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
    });
    //  console.log(findAgentinControlGraph);
     
     const agentStatistic = await fetchGetagentStatistic(+e.month_id?.agent_id?.id)
     if(startControlTime <= theCurrentHour && theCurrentHour <= startControlTime + 2 ) {
      if(findAgentinControlGraph){

        if(agentStatistic.LastLoginTime != 'not login' && findAgentinControlGraph.LastLoginTime != 'not login') {
          // console.log(findAgentinControlGraph,'0');

          await agentControlGraphEntity.createQueryBuilder()
          .update(agentControlGraphEntity)
          .set({ LastLoginTime: findAgentinControlGraph.LastLoginTime,
             FullDurationOfWork: agentStatistic.FulDuration,
            PauseDuration : agentStatistic.PauseDuration,
            TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
           })
          .where( {  agent_id:findAgentinControlGraph?.agent_id   })
          .execute()
        } else if(agentStatistic.LastLoginTime == 'not login' && findAgentinControlGraph.LastLoginTime != 'not login') {
          // console.log(findAgentinControlGraph,'1');

          await agentControlGraphEntity.createQueryBuilder()
          .update(agentControlGraphEntity)
          .set({ LastLoginTime: findAgentinControlGraph.LastLoginTime,
             FullDurationOfWork: agentStatistic.FulDuration,
            PauseDuration : agentStatistic.PauseDuration,
            TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
           })
          .where( {  agent_id:findAgentinControlGraph.agent_id   })
          .execute()
        }else if(agentStatistic.LastLoginTime == 'not login' ) {
    //  console.log(findAgentinControlGraph,'2');

          await agentControlGraphEntity.createQueryBuilder()
          .update(agentControlGraphEntity)
          .set({ LastLoginTime: agentStatistic.LastLoginTime,
             FullDurationOfWork: agentStatistic.FulDuration,
            PauseDuration : agentStatistic.PauseDuration, })
          .where( {  agent_id:findAgentinControlGraph.agent_id   })
          .execute()
        } else {
          const lastLoginTimeParseSeconds =  parseTimeStringToSeconds(agentStatistic.LastLoginTime)

          if(lastLoginTimeParseSeconds >= startWorkTimeParseSeconds) {
    //  console.log(findAgentinControlGraph,agentStatistic,'3');

            await agentControlGraphEntity.createQueryBuilder()
            .update(agentControlGraphEntity)
            .set({ LastLoginTime: agentStatistic.LastLoginTime,
               FullDurationOfWork: agentStatistic.FulDuration,
              PauseDuration : agentStatistic.PauseDuration,
              TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
            })
            .where( {  agent_id:findAgentinControlGraph.agent_id   })
            .execute()
          } else {
    //  console.log(findAgentinControlGraph, agentStatistic ,'4');

            await agentControlGraphEntity.createQueryBuilder()
            .update(agentControlGraphEntity)
            .set({ LastLoginTime: agentStatistic.LastLoginTime,
               FullDurationOfWork: agentStatistic.FulDuration,
              PauseDuration : agentStatistic.PauseDuration,
              TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
              ComeToWorkOnTime :true
            })
            .where( {  agent_id:findAgentinControlGraph.agent_id })
            .execute()
          }
        }
      }else {
        const agentStatistic = await fetchGetagentStatistic(e.month_id?.agent_id.id)

        if(agentStatistic.LastLoginTime = 'not login'){
         await agentControlGraphEntity.createQueryBuilder()
        .insert()
        .into(agentControlGraphEntity)
        .values({ 
          id: e.month_id?.agent_id.id ,
          id_login: e.month_id?.agent_id?.id_login,
          id_login_type_number: + e.month_id?.agent_id?.id_login,
          name : e.month_id?.agent_id?.name,
          timeWork : e.work_time,
          typeWork: e.work_type,
          LastLoginTime:agentStatistic.LastLoginTime,
          FullDurationOfWork: agentStatistic.FulDuration,
          PauseDuration : agentStatistic.PauseDuration,
          TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
         })
        .execute()
        .catch((e) => {
          throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
        });
        }else {
          const lastLoginTimeParseSeconds =  parseTimeStringToSeconds(agentStatistic.LastLoginTime)
          if(lastLoginTimeParseSeconds >= startWorkTimeParseSeconds) {
            await agentControlGraphEntity.createQueryBuilder()
          .insert()
          .into(agentControlGraphEntity)
          .values({ 
            id: e.month_id?.agent_id.id,
            id_login: e.month_id?.agent_id.id_login,
            id_login_type_number: +e.month_id?.agent_id.id_login,
            name : e.month_id?.agent_id.name,
            timeWork : e.work_time,
            typeWork: e.work_type,
            LastLoginTime:agentStatistic.LastLoginTime,
            FullDurationOfWork: agentStatistic.FulDuration,
            PauseDuration : agentStatistic.PauseDuration,
            TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
           })
          .execute()
          .catch((e) => {
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
          });
          } else {
            await agentControlGraphEntity.createQueryBuilder()
            .insert()
            .into(agentControlGraphEntity)
            .values({ 
              id: e.month_id?.agent_id.id ,
              id_login: e.month_id?.agent_id.id_login,
              id_login_type_number: +e.month_id?.agent_id.id_login,
              name : e.month_id?.agent_id.name,
              timeWork : e.work_time,
              typeWork: e.work_type,
              LastLoginTime:agentStatistic.LastLoginTime,
              FullDurationOfWork: agentStatistic.FulDuration,
              PauseDuration : agentStatistic.PauseDuration,
              TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
              ComeToWorkOnTime: true
             })
            .execute()
            .catch((e) => {
              throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
            });
          }
        }
      
      }
      
     } else {
      if(findAgentinControlGraph) {
      //  console.log(agentStatistic); 
       if(findAgentinControlGraph.WorkState != 'did not work') {
        
          const fullDurationOfWorkTimeParseSeconds = parseTimeStringToSeconds(agentStatistic.FulDuration)
          const PauseDurationTimeParseSeconds =    parseTimeStringToSeconds(agentStatistic.PauseDuration)
          const timeofWork = parseTimeStringToSeconds('12:00:00')
          const timeofWorkOtherThanRest = parseTimeStringToSeconds('10:00:00')
          const timeToRest = parseTimeStringToSeconds('02:00:00')
            let timeIsOff = fullDurationOfWorkTimeParseSeconds + startWorkTimeParseSeconds 
          if(worktime = '20-08') {
          const timeofOneDay = parseTimeStringToSeconds('24:00:00')
            timeIsOff = fullDurationOfWorkTimeParseSeconds + startWorkTimeParseSeconds - timeofOneDay
          }
          if(endWorkTimeParseSeconds <= timeIsOff ) {
            if(PauseDurationTimeParseSeconds <= timeToRest) {
        // console.log(findAgentinControlGraph,'elsedan 1');

              await agentControlGraphEntity.createQueryBuilder()
              .update(agentControlGraphEntity)
              .set({ 
                 FullDurationOfWork: agentStatistic.FulDuration,
                PauseDuration : agentStatistic.PauseDuration,
                TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
                LeftAfterWork :true,
                TimeWorkIsDone: true,
                TimeWorked :  timeofWorkOtherThanRest + timeToRest  - fullDurationOfWorkTimeParseSeconds 
              })
              .where( {  agent_id:findAgentinControlGraph?.agent_id   })
              .execute()
            } else {
        // console.log(findAgentinControlGraph,'elsedan 2' , PauseDurationTimeParseSeconds , timeToRest ,timeofWorkOtherThanRest + timeToRest  - fullDurationOfWorkTimeParseSeconds );

              await agentControlGraphEntity.createQueryBuilder()
              .update(agentControlGraphEntity)
              .set({ 
                 FullDurationOfWork: agentStatistic.FulDuration,
                PauseDuration : agentStatistic.PauseDuration,
                TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
                LeftAfterWork :true,
                TimeWorked :  timeofWorkOtherThanRest + timeToRest  - fullDurationOfWorkTimeParseSeconds 
              })
              .where( {  agent_id:findAgentinControlGraph.agent_id   })
              .execute()
            }
      
          }else {
            const timeWorked = timeofWorkOtherThanRest + timeToRest  - fullDurationOfWorkTimeParseSeconds
            if(PauseDurationTimeParseSeconds <= timeToRest &&  timeWorked <= 0 ) {
        // console.log(findAgentinControlGraph,'elsedan 3');

              await agentControlGraphEntity.createQueryBuilder()
              .update(agentControlGraphEntity)
              .set({ 
                 FullDurationOfWork: agentStatistic.FulDuration,
                PauseDuration : agentStatistic.PauseDuration,
                TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
                // LeftAfterWork :true,
                TimeWorkIsDone: true,
                TimeWorked :  timeofWorkOtherThanRest + timeToRest  - fullDurationOfWorkTimeParseSeconds 
              })
              .where( {  agent_id:findAgentinControlGraph.agent_id   })
              .execute()
            } else {
        // console.log(findAgentinControlGraph,'elsedan 5');

              await agentControlGraphEntity.createQueryBuilder()
              .update(agentControlGraphEntity)
              .set({ 
                 FullDurationOfWork: agentStatistic.FulDuration,
                PauseDuration : agentStatistic.PauseDuration,
                TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
                // LeftAfterWork :true,
                TimeWorked :  timeofWorkOtherThanRest + timeToRest  - fullDurationOfWorkTimeParseSeconds 
              })
              .where( {  agent_id:findAgentinControlGraph.agent_id   })
              .execute()
            }
          }
       } else {
        await agentControlGraphEntity.createQueryBuilder()
        .update(agentControlGraphEntity)
        .set({ LastLoginTime: agentStatistic.LastLoginTime,
           FullDurationOfWork: agentStatistic.FulDuration,
          PauseDuration : agentStatistic.PauseDuration,
          TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
          // ComeToWorkOnTime :true
        })
        .where( {  agent_id:findAgentinControlGraph.agent_id   })
        .execute()
      }
       
        } else{
          // console.log('okk' , e , e.month_id.agent_id.id_login, );
          await agentControlGraphEntity.createQueryBuilder()
          .insert()
          .into(agentControlGraphEntity)
          .values({ 
            id: e.month_id?.agent_id.id ,
            id_login: e.month_id?.agent_id.id_login,
            id_login_type_number: +e.month_id?.agent_id.id_login,
            name : e.month_id?.agent_id.name,
            timeWork : e.work_time,
            typeWork: e.work_type,
            LastLoginTime:agentStatistic.LastLoginTime,
            FullDurationOfWork: agentStatistic.FulDuration,
            PauseDuration : agentStatistic.PauseDuration,
            TimeWorkDuration:  subtractTime(agentStatistic.FulDuration , agentStatistic.PauseDuration),
          //   ComeToWorkOnTime: true
        //   WorkState: 'did not work'
           })
          .execute()
          .catch((e) => {
            // console.log(e);
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
          });
        }
     }


    } 
    return [true]

  }