require("dotenv").config();
const express = require("express");
const app = express();

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Our app is running on port ${PORT}`);
});

const options = {
  adminId: process.env.ADMINID,
  botId: process.env.BOTID,
  token: process.env.TOKEN,
  request_Url: process.env.REQUEST_URL,
  mongoURL: process.env.MONGO_URL,
};
const { token, adminId, botId, mongoURL, request_Url } = options;

const axios = require("axios");
const mongoose = require("mongoose");
const TelegramBot = require("node-telegram-bot-api");

let rigStatus;

try {
  mongoose.connect(
    mongoURL,
    { useNewUrlParser: true, useUnifiedTopology: true },
    () => console.log("connected to DataBase")
  );
} catch (error) {
  console.log("could not connect to DataBase", error);
}

async function sendRequestRigs() {
  console.log("Now is", new Date());
  const id = await telegramId.distinct("id").exec();
  id.forEach((element) => {
    const rigs = rigState
      .find(
        { id: element },
        {
          _id: false,
          id: false,
        }
      )
      .exec()
      .then((rigs) => {
        // console.log('Element ', element, rigs)
        rigs.forEach((rigs) => {
          const rigResponse = getStatus(rigs.rigNumber, rigs.rigToken).then(
            (rigResponse) => {
              // console.log('rig response', rigResponse)
              if (rigResponse !== rigs.rigStatus) {
                switch (rigResponse) {
                  case 0: {
                    console.log("To telegram", element);
                    bot.sendMessage(
                      element,
                      `Rig <b>${rigs.rigNumber}</b> is <b>offline</b>🔴`,
                      {
                        parse_mode: "HTML",
                      }
                    );
                    break;
                  }
                  case 1: {
                    console.log("To telegram", element);
                    bot.sendMessage(
                      element,
                      `Rig <b>${rigs.rigNumber}</b> is <b>online</b>🟢`,
                      {
                        parse_mode: "HTML",
                      }
                    );
                    break;
                  }
                  case 2: {
                    console.log("To telegram", element);
                    bot.sendMessage(
                      element,
                      `Rig <b>${rigs.rigNumber}</b> is online with errors❓`,
                      {
                        parse_mode: "HTML",
                      }
                    );
                    break;
                  }

                  default:
                    console.log("State unknown");
                }
              }
              const currentCheckTime = new Date();
              // console.log('Now is', currentCheckTime)
              // console.log(rigResponse)
              // if (typeof rigResponse==='undefined') {
              //   console.log('undefined status')
              //   rigResponse=2
              // }

              const newStatus = rigState
                .updateOne(
                  { rigNumber: rigs.rigNumber },
                  {
                    $set: {
                      rigStatus: rigResponse,
                      rigCheckTime: currentCheckTime,
                    },
                  }
                )
                .exec();
              // .then((newStatus) => console.log('from sendRequestS', rigs.rigNumber, rigs.rigStatus))
            }
          );
        });
      });
  });
  // console.log(id)
}
async function getStatus(req, request_Token = "") {
  if (request_Token === "") {
    return 2;
  } else {
    try {
      // console.log('Send rig', req, 'rig token', request_Token)
      const response = await axios.get(`${request_Url}${req}`, {
        headers: {
          "X-Auth-Token": request_Token,
        },
      });
      const { data } = response;

      // console.log({ data });
      // const rigId = data.id

      const rigStatus = data.online_status;
      const rigMpu = data.mpu_list.length;

      console.log(
        "from getStatus",
        data.name,
        " ",
        data.id,
        " Online status",
        data.online_status,
        " MPU number ",
        data.mpu_list.length
      );

      return rigStatus && rigMpu && 1;
    } catch (error) {
      console.error({ error });
    }
    return rigStatus && rigMpu && 1;
  }
}
async function getFullStatus(req, request_Token = "") {
  console.log("Request fullstatus rig", req, "rig token", request_Token);
  if (request_Token === "") {
    return 2;
  } else {
    try {
      // console.log('Send rig', req, 'rig token', request_Token)
      const response = await axios.get(`${request_Url}${req}`, {
        headers: {
          "X-Auth-Token": request_Token,
        },
      });
      const { data } = response;
      return data;
    } catch (error) {
      console.error({ error });
    }
    return rigStatus;
  }
}
function parseStatus(serverResponse) {
  const rigStatus = {
    id: serverResponse.id,
    name: serverResponse.name,
    online_status: serverResponse.online_status,
    mb_info: serverResponse.sys_info.mb_info.mb_name,
    cpu_info: serverResponse.sys_info.cpu_info.name,
    boot_time: serverResponse.sys_info.boot_time,
    coin_name: serverResponse.mining_info[0].coin_name,
    pool_id: serverResponse.mining_info[0].pool_id,
    power: [],
    temp: [],
    hashrate: [],
    fan_percent: [],
    fan_rpm: [],
  };
  const mpu_list = serverResponse.mpu_list.forEach((videocard) => {
    rigStatus.temp = [...rigStatus.temp, videocard.temp];
    rigStatus.hashrate = [...rigStatus.hashrate, videocard.hashrate];
    rigStatus.fan_percent = [...rigStatus.fan_percent, videocard.fan_percent];
    rigStatus.fan_rpm = [...rigStatus.fan_rpm, videocard.fan_rpm];
    rigStatus.power = [...rigStatus.power, videocard.power];
  });
  return rigStatus;
}
function upTime(sec) {
  const day = Math.trunc(sec / 86400);
  const hour = Math.trunc((sec % 86400) / 3600);
  const min = Math.trunc((sec - day * 86400 - hour * 3600) / 60);
  return `${day}d:${hour}h:${min}m`;
}
const rigStateSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
    },
    rigNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    rigToken: {
      type: String,
      required: false,
    },
    rigStatus: {
      type: Number,
      required: true,
      default: 0,
    },
    rigCheckTime: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
    timestamp: true,
  }
);
const telegramIdSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    is_bot: {
      type: Boolean,

      required: true,
    },
    first_name: {
      type: String,
      required: false,
    },
    last_name: {
      type: String,
      required: false,
    },
    username: {
      type: String,
      required: false,
    },
    rigNumber: {
      type: Number,
      required: false,
    },
    rigNumbers: {
      type: [],
      required: false,
    },
    registerTime: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
    timestamp: true,
  }
);
const rigState = mongoose.model("rigState", rigStateSchema);
const telegramId = mongoose.model("telegramId", telegramIdSchema);

const bot = new TelegramBot(token, { polling: true });

bot.on("message", async function (msg) {
  // console.log(msg)
  const fromId = msg.from.id; // Получаем ID отправителя
  const user = await telegramId.findOne({ id: fromId });
  if (user) {
    console.log(
      "yyyyyyyyyyyyyyyyyyyyyyyyeeeeeeeeeeeeeeeeeeeeehhhhhhhhhhhhhhaaaaaaa"
    );
    let rigNumbers = await telegramId.find(
      { id: fromId },
      {
        _id: false,
        is_bot: false,
        id: false,
        first_name: false,
        last_name: false,
        username: false,
        rigNumber: false,
        registerTime: false,
      }
    );
    rigNumbers[0].rigNumbers.forEach((rigNumber) => {
      if (rigNumber === msg.text) {
        bot.sendMessage(fromId, `Type ${rigNumber} token`, {
          reply_markup: {
            force_reply: true,
          },
        });
      }
    });
    // console.log(msg)
    if (msg.reply_to_message) {
      const isBot = msg.reply_to_message.from.id;
      const regexp = /[^\D]/g;
      const setRig = msg.reply_to_message.text.match(regexp).join("");
      console.log(setRig);
      const setToken = msg.text;
      if (isBot === botId) {
        let newRig = await rigState.findOne({ rigNumber: setRig });
        if (!newRig) {
          const newState = new rigState({
            id: fromId,
            rigNumber: setRig,
            rigToken: setToken,
            rigStatus: 0,
          });
          await newState.save();
        } else {
          const newRigState = rigState
            .updateOne({ rigNumber: setRig }, { $set: { rigToken: setToken } })
            .exec()
            .then((newStatus) => {
              console.log(`Set token ${setToken} to ${setRig} rig`);
              bot.sendMessage(fromId, `Set token ${setToken} to ${setRig} rig`);
            });
        }
      }
    }
  } else {
    bot.sendMessage(fromId, `Please register`);
  }
});
// Функция добавления риг в список просмотра
bot.onText(/\/watch (.+)/, async function (msg, match) {
  // console.log(msg)
  const fromId = msg.from.id // Получаем ID отправителя
  const rig = match[1] // Получаем текст после /echo
  const user = await telegramId.findOne({ id: fromId })
  if (user) {
    const { id, is_bot, first_name, last_name, username } = msg.from

    let newRig = await rigState.findOne({ rigNumber: rig })
    console.log(newRig)
    if (!newRig) {
      console.log('IF')
      // const newState = new rigState({
      //   id: fromId,
      //   rigNumber: rig,
      //   rigToken: ' ',
      //   rigStatus: 0
      // })
      // await newState.save()
      const newtelegramId = telegramId
        .updateOne({ id: fromId }, { $addToSet: { rigNumbers: rig } })
        .exec()
        .then((newStatus) => console.log('Add new rigs', fromId, rig))
      bot.sendMessage(fromId, `Start watching ${rig} rig`)

      // let rigNumbers = await telegramId.find(
      //   { id: fromId },
      //   {
      //     _id: false,
      //     is_bot: false,
      //     id: false,
      //     first_name: false,
      //     last_name: false,
      //     username: false,
      //     rigNumber: false,
      //     registerTime: false
      //   }
      // )

      // console.log(rigNumbers[0].rigNumbers)
      bot.sendMessage(fromId, `Please select ${rig} to send token`, {
        reply_markup: {
          keyboard: [[rig]]
        }
      })
    } else {
      console.log('ELSE')
      bot.sendMessage(fromId, `Rig already registered`)
    }
  } else {
    bot.sendMessage(fromId, `Please register to add rigs`)
  }
})
// Функция установки токена для риг
bot.onText(/\/token/, async function (msg, match) {
  const fromId = msg.from.id // Получаем ID отправителя
  let rigNumbers = await telegramId.find(
    { id: fromId },
    {
      _id: false,
      is_bot: false,
      id: false,
      first_name: false,
      last_name: false,
      username: false,
      rigNumber: false,
      registerTime: false
    }
  )
  console.log(rigNumbers[0].rigNumbers)
  if (rigNumbers[0].rigNumbers.length === 0) {
    bot.sendMessage(fromId, 'Please add any rig by /watch command')
  } else {
    bot.sendMessage(fromId, 'Select rig to change token', {
      reply_markup: {
        keyboard: [rigNumbers[0].rigNumbers]
      }
    })
  }
})
// Функция удаления риг из списка просмотра
bot.onText(/\/watchstop (.+)/, async function (msg, match) {
  const fromId = msg.from.id // Получаем ID отправителя
  const rig = match[1] // Получаем текст после /echo
  const user = await telegramId.findOne({ id: fromId })
  if (user) {
    let rigNumbers = await telegramId.find(
      { id: fromId },
      {
        _id: false,
        is_bot: false,
        id: false,
        first_name: false,
        last_name: false,
        username: false,
        rigNumber: false,
        registerTime: false
      }
    )
    console.log(rigNumbers[0].rigNumbers, rig)
    if (rigNumbers[0].rigNumbers.includes(rig)) {
      const newtelegramId = telegramId
        .updateOne({ id: fromId }, { $pull: { rigNumbers: rig } })
        .exec()
        .then((newStatus) => console.log('Remove rig', fromId, rig))
        .catch(function (err) {
          console.log(err)
        })

      bot.sendMessage(fromId, `Stop watching ${rig} rig`)
    } else {
      bot.sendMessage(fromId, `You rigs list not includes ${rig} rig`)
    }
  } else {
    bot.sendMessage(fromId, `Please register to remove watching rigs`)
  }
})

// Функция вывода списка просматриваемых риг
bot.onText(/\/watchrig/, async function (msg, match) {
  const fromId = msg.from.id // Получаем ID отправителя
  const user = await telegramId.findOne({ id: fromId })
  if (user) {
    let rigNumbers = await telegramId.find(
      { id: fromId },
      {
        _id: false,
        is_bot: false,
        id: false,
        first_name: false,
        last_name: false,
        username: false,
        rigNumber: false,
        registerTime: false
      }
    )
    const resp = rigNumbers[0].rigNumbers
    console.log(`User ${fromId} watch ${resp}`)
    bot.sendMessage(fromId, `You watching ${resp} rig`)
  } else {
    bot.sendMessage(fromId, `Please register to watch rigs`)
  }
})
// Функция опроса статуса зарегистрированых риг
bot.onText(/\/status/, async function (msg, match) {
  const fromId = msg.from.id // Получаем ID отправителя
  const user = await telegramId.findOne({ id: fromId })
  if (user) {
    let rigNumbers = await telegramId.find(
      { id: fromId },
      {
        _id: false,
        is_bot: false,
        id: false,
        first_name: false,
        last_name: false,
        username: false,
        rigNumber: false,
        registerTime: false
      }
    )
    console.log('Request status rigs', rigNumbers[0].rigNumbers)
    const resp = rigNumbers[0].rigNumbers.forEach((element) => {
      const rigs = rigState
        .find(
          { rigNumber: element },
          {
            _id: false,
            id: false
          }
        )
        .exec()
        .then((rigs) => {
          // console.log('Rigs ', element, rigs)
          rigs.forEach((rigs) => {
            const rigResponse = getStatus(rigs.rigNumber, rigs.rigToken).then((rigResponse) => {
              // console.log('rig response', rigResponse)
              switch (rigResponse) {
                case 0: {
                  console.log('To telegram', fromId)
                  bot.sendMessage(fromId, `Rig <b>${rigs.rigNumber}</b> is <b>offline</b>🔴`, {
                    parse_mode: 'HTML'
                  })
                  break
                }
                case 1: {
                  console.log('To telegram', fromId)
                  bot.sendMessage(fromId, `Rig <b>${rigs.rigNumber}</b> is <b>online</b>🟢`, {
                    parse_mode: 'HTML'
                  })
                  break
                }
                case 2: {
                  console.log('To telegram', fromId)
                  bot.sendMessage(fromId, `Rig <b>${rigs.rigNumber}</b> is online with errors❓`, {
                    parse_mode: 'HTML'
                  })
                  break
                }

                default:
                  console.log('State unknown')
              }

              const currentCheckTime = new Date()
              const newStatus = rigState
                .updateOne(
                  { rigNumber: rigs.rigNumber },
                  { $set: { rigStatus: rigResponse, rigCheckTime: currentCheckTime } }
                )
                .exec()
              // .then((newStatus) => console.log('from sendRequestS', rigs.rigNumber, rigs.rigStatus))
            })
          })
        })
    })
  } else {
    bot.sendMessage(fromId, `Please register to watch status rigs`)
  }
})
// Функция регистрации пользователя
bot.onText(/\/register/, async function (msg, match) {
  const fromId = msg.from.id // Получаем ID отправителя
  const { id, is_bot, first_name, last_name, username } = msg.from
  const user = await telegramId.findOne({ id: fromId })
  if (!user) {
    const newId = new telegramId({
      id,
      is_bot,
      first_name,
      last_name,
      username,
      rigNumbers: []
    })
    await newId.save((err, result) => {
      if (err) {
        console.log('Unable update user: ', err)
      }
    })
    bot.sendMessage(fromId, `You register to watch rigs`)
  } else {
    bot.sendMessage(fromId, `You already registered`)
  }
})
// Функция удаления пользователя
bot.onText(/\/unregister/, async function (msg, match) {
  const fromId = msg.from.id // Получаем ID отправителя
  const user = await telegramId.findOne({ id: fromId })

  if (user) {
    console.log(`${fromId} deleted`)
    let res = await telegramId.deleteOne({ id: fromId })
    bot.sendMessage(fromId, `You id deleted`)
  } else {
    bot.sendMessage(fromId, 'You not registered')
  }
})
// Функция выдачи помощи
bot.onText(/\/help/, async function (msg, match) {
  const fromId = msg.from.id // Получаем ID отправителя
  const user = await telegramId.findOne({ id: fromId })

  if (user) {
    bot.sendMessage(fromId, `HELP`)
  }
})
bot.onText(/\/serverwatch/, async function (msg, match) {
  const fromId = msg.from.id; // Получаем ID отправителя
  if (fromId === adminId) {
    const rigNumbers = await rigState.distinct("rigNumber").exec();
    console.log(rigNumbers);
    bot.sendMessage(fromId, `Server now watching ${rigNumbers}`);
  }
});
// Функция просмотра полного статуса риги
bot.onText(/\/fstatus (.+)/, async function (msg, match) {
  const fromId = msg.from.id // Получаем ID отправителя
  const rig = match[1] // Получаем текст после /echo
  if (fromId === adminId) {
    console.log(`Request fullstatus ${rig}`)
    const rigs = await rigState
      .find(
        { rigNumber: rig },
        {
          _id: false,
          id: false
        }
      )
      .exec()
      .then((rigs) => {
        // console.log('request', rigs[0].rigNumber, rigs[0].rigToken)
        const rigResponse = getFullStatus(rigs[0].rigNumber, rigs[0].rigToken).then((response) => {
          // console.log(response)
          const rigStatus = parseStatus(response)
          // console.log(rigStatus)
          const textConst = `
          <b>ℹ️ID: </b><i>${rigStatus.id}</i> <b>Name: </b><i>${rigStatus.name}</i>
<b>CPU: </b><i>${rigStatus.cpu_info}</i>
<b>MB: </b><i>${rigStatus.mb_info}</i>
<b>⏱UpTime: </b><i>${upTime(rigStatus.boot_time)}</i>
<b>⚡️Power: </b><i>${rigStatus.power}</i>
<b>🔥Temp °C: </b><i>${rigStatus.temp}</i>
<b>❄️Fan %: </b><i>${rigStatus.fan_percent}</i>
<b>💰Hashrate: </b><i>${rigStatus.hashrate}</i>
          `
          bot.sendMessage(fromId, textConst, {
            parse_mode: 'HTML'
          })
        })
      })
  }
  else {
    const user = await telegramId.findOne({ id: fromId })
      if (user) {
    let rigNumbers = await telegramId.find(
          { id: fromId },
          {
            _id: false,
            is_bot: false,
            id: false,
            first_name: false,
            last_name: false,
            username: false,
            rigNumber: false,
            registerTime: false
          }).then((res)=>{
            if (res[0].rigNumbers.includes(rig)) {
            console.log(`Request fullstatus ${rig}`)
    const rigs = rigState
      .find(
        { rigNumber: rig },
        {
          _id: false,
          id: false
        }
      )
      .exec()
      .then((rigs) => {
        // console.log('request', rigs[0].rigNumber, rigs[0].rigToken)
        const rigResponse = getFullStatus(rigs[0].rigNumber, rigs[0].rigToken).then((response) => {
          // console.log(response)
          const rigStatus = parseStatus(response)
          // console.log(rigStatus)
          const textConst = `
          <b>ℹ️ID: </b><i>${rigStatus.id}</i> <b>Name: </b><i>${rigStatus.name}</i>
<b>CPU: </b><i>${rigStatus.cpu_info}</i>
<b>MB: </b><i>${rigStatus.mb_info}</i>
<b>⏱UpTime: </b><i>${upTime(rigStatus.boot_time)}</i>
<b>⚡️Power: </b><i>${rigStatus.power}</i>
<b>🔥Temp °C: </b><i>${rigStatus.temp}</i>
<b>❄️Fan %: </b><i>${rigStatus.fan_percent}</i>
<b>💰Hashrate: </b><i>${rigStatus.hashrate}</i>
          `
          bot.sendMessage(fromId, textConst, {
            parse_mode: 'HTML'
          })
        })
      })
            }
          })

        }
       else{
        bot.sendMessage(fromId, 'You dont register this rig')
      }
  }
})

function stopwatching() {
  // остановить вывод через 1000 миллисекунд * 60 секунд * 1 минут
  const timeStop = 1000 * 60 * 1;
  setTimeout(() => {
    clearInterval(timerId);
  }, timeStop);
}

// Set interval request 1000 msec * 60 sec * 1 min
const timeInterval = 1000 * 60 * 5;
let timerId = setInterval(() => sendRequestRigs(), timeInterval);
