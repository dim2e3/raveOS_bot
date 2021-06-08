import express from "express";
import options from "./config.js";
import axios from "axios";
import mongoose from "mongoose";
import TelegramBot from "node-telegram-bot-api";
const { token, adminId, botId, mongoURL, request_Url } = options;
import { parseStatus, boldTemp, boldFan, upTime } from "./function.js";
import { menu } from "./menu.js";

const app = express();

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Our app is running on port ${PORT}`);
});

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
        rigs.forEach((rigs) => {
          const rigResponse = getStatus(rigs.rigNumber, rigs.rigToken).then(
            (rigResponse) => {
              // saveStat(parseStatus(rigResponse));
              // // Проверка температуры видеокарт
              // if (
              //   parseStatus(rigResponse).temp.reduce(
              //     (acc, rec) => acc || rec >= rigs.rigTemp,
              //     false
              //   )
              // ) {
              //   sendMessage(
              //     element,
              //     `<b>🔥Warning ${rigResponse.name} ${
              //       rigs.rigNumber
              //     } 🔥</b>${boldTemp(
              //       parseStatus(rigResponse).temp,
              //       rigs.rigTemp
              //     )} °C`
              //   );
              // }
              // // Проверка вращения вентиляторов
              // if (
              //   parseStatus(rigResponse).fan_percent.reduce(
              //     (acc, rec) => acc || (rec < rigs.rigFan && rec != -1),
              //     false
              //   )
              // ) {
              //   sendMessage(
              //     element,
              //     `<b>❄️Warning ${rigResponse.name} ${
              //       rigs.rigNumber
              //     } ❄️</b>${boldFan(
              //       parseStatus(rigResponse).fan_percent,
              //       rigs.rigFan
              //     )} %`
              //   );
              // }

              const rigResp =
                rigResponse.online_status && rigResponse.mpu_list.length && 1;
              if (rigResp !== rigs.rigStatus) {
                switch (rigResp) {
                  case 0: {
                    console.log("To telegram", element);
                    bot.sendMessage(
                      element,
                      `<b>${rigResponse.name} ${rigs.rigNumber}</b> is <b>offline</b>🔴`,
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
                      `<b>${rigResponse.name} ${rigs.rigNumber}</b> is <b>online</b>🟢`,
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
                      `<b>${rigResponse.name} ${rigs.rigNumber}</b> is online with errors❓`,
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
              const newStatus = rigState
                .updateOne(
                  { rigNumber: rigs.rigNumber },
                  {
                    $set: {
                      rigStatus: rigResp,
                      rigCheckTime: currentCheckTime,
                    },
                  }
                )
                .exec();
            }
          );
        });
      });
  });
}
// Request rig's online status
async function getStatus(req, request_Token = "") {
  if (request_Token === "") {
    return 2;
  } else {
    try {
      const response = await axios.get(`${request_Url}${req}`, {
        headers: {
          "X-Auth-Token": request_Token,
        },
      });
      const { data } = response;
      if (!data.error) {
        console.log(
          "GetStatus",
          data.name,
          " ",
          data.id,
          " Online status",
          data.online_status,
          " MPU number ",
          data.mpu_list.length
        );
        return data;
      } else {
        return data;
      }
    } catch (error) {
      console.error("Error in GetStatus", { error });
    }
    return rigStatus && rigMpu && 1;
  }
}
// Request rig's full status
async function getFullStatus(req, request_Token = "") {
  console.log("Request fullstatus rig", req, "rig token", request_Token);
  if (request_Token === "") {
    return 2;
  } else {
    try {
      const response = await axios.get(`${request_Url}${req}`, {
        headers: {
          "X-Auth-Token": request_Token,
        },
      });
      const { data } = response;

      return data;
    } catch (error) {
      return error.response.status;
    }
  }
}
// function parseStatus(serverResponse) {
//   const rigStatus = {
//     id: serverResponse.id,
//     name: serverResponse.name,
//     online_status: serverResponse.online_status,
//     mb_info: serverResponse.sys_info.mb_info.mb_name,
//     cpu_info: serverResponse.sys_info.cpu_info.name,
//     boot_time: serverResponse.sys_info.boot_time,
//     coin_name: serverResponse.mining_info[0].coin_name,
//     pool_id: serverResponse.mining_info[0].pool_id,
//     power: [],
//     temp: [],
//     hashrate: [],
//     fan_percent: [],
//     fan_rpm: [],
//     video: [],
//   };
//   const mpu_list = serverResponse.mpu_list.forEach((videocard) => {
//     rigStatus.temp = [...rigStatus.temp, videocard.temp];
//     rigStatus.hashrate = [...rigStatus.hashrate, videocard.hashrate];
//     rigStatus.fan_percent = [...rigStatus.fan_percent, videocard.fan_percent];
//     rigStatus.fan_rpm = [...rigStatus.fan_rpm, videocard.fan_rpm];
//     rigStatus.power = [...rigStatus.power, videocard.power];
//     rigStatus.video = [...rigStatus.video, videocard.name];
//   });
//   return rigStatus;
// }
// function upTime(sec) {
//   const day = Math.trunc(sec / 86400);
//   const hour = Math.trunc((sec % 86400) / 3600);
//   const min = Math.trunc((sec - day * 86400 - hour * 3600) / 60);
//   return `${day}d:${hour}h:${min}m`;
// }
// function boldTemp(array, number) {
//   return `${array.map((item) => {
//     if (item > number) {
//       return `<b>${item}</b>`;
//     } else {
//       return `<i>${item}</i>`;
//     }
//   })}`;
// }
// function boldFan(array, number) {
//   return `${array.map((item) => {
//     if (item < number) {
//       return `<b>${item}</b>`;
//     } else {
//       return `<i>${item}</i>`;
//     }
//   })}`;
// }

// Save rig's status to db
async function saveStat(serverResponse) {
  const newData = new rigData({
    id: serverResponse.id,
    rigDate: Date.now(),
    rigOnline_status: serverResponse.online_status,
    rigPower: serverResponse.power,
    rigTemp: serverResponse.temp,
    rigHashrate: serverResponse.hashrate,
    rigFan_percent: serverResponse.fan_percent,
    rigFan_rpm: serverResponse.fan_rpm,
  });
  // console.log(newData)
  await newData.save((err, result) => {
    if (err) {
      console.log("Unable update rigData: ", err);
    }
  });
}
async function sendMessage(userID, userMessage) {
  bot.getChat(userID).then(
    bot.sendMessage(userID, userMessage, {
      parse_mode: "HTML",
    })
  );
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
    rigTemp: {
      type: Number,
      required: false,
      default: 99,
    },
    rigCheckTemp: {
      type: Boolean,
      required: false,
      default: true,
    },
    rigFan: {
      type: Number,
      required: false,
      default: 0,
    },
    rigCheckFan: {
      type: Boolean,
      required: false,
      default: true,
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
const rigDataSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
    },
    rigTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    rigOnline_status: {
      type: Number,
      required: true,
    },
    rigPower: {
      type: [],
      required: false,
    },
    rigTemp: {
      type: [],
      required: false,
    },
    rigHashrate: {
      type: [],
      required: false,
    },
    rigFan_percent: {
      type: [],
      required: false,
    },
    rigFan_rpm: {
      type: [],
      required: false,
    },
  },
  {
    versionKey: false,
    timestamp: true,
  }
);
const rigState = mongoose.model("rigState", rigStateSchema);
const telegramId = mongoose.model("telegramId", telegramIdSchema);
const rigData = mongoose.model("rigdata", rigDataSchema);

const bot = new TelegramBot(token, { polling: true });

bot.on("message", async function (msg) {
  const fromId = msg.from.id; // Получаем ID отправителя
  const user = await telegramId.findOne({ id: fromId });
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
    if (msg.reply_to_message) {
      const isBot = msg.reply_to_message.from.id;
      const regexp = /[^\D]/g;
      const setRig = msg.reply_to_message.text.match(regexp).join("");
      console.log("Setting rig", setRig);
      const setToken = msg.text;
      if (`Type ${setRig} token` === msg.reply_to_message.text) {
        if (isBot == botId) {
          let newRig = await rigState.findOne({ rigNumber: setRig });
          if (!newRig) {
            const regexp = /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/;
            if (regexp.test(setToken)) {
              getFullStatus(setRig, setToken).then((response) => {
                if (response != "500") {
                  if (response.online_status) {
                    const newState = new rigState({
                      id: fromId,
                      rigNumber: setRig,
                      rigToken: setToken,
                      rigStatus: 0,
                      rigTemp: 70,
                      rigFan: 10,
                      rigCheckTime: true,
                      rigCheckFan: true,
                    });
                    newState.save();
                    bot.sendMessage(
                      fromId,
                      `You add ${setRig} rig. Type /status`
                    );
                  } else {
                    console.log(`error of add new ${setRig} rig from `, fromId);
                    bot.sendMessage(
                      fromId,
                      `Add ${setRig} token failed, please enter correct token`
                    );
                  }
                } else {
                  console.log(`error of add new ${setRig} rig from `, fromId);
                  bot.sendMessage(
                    fromId,
                    `Add ${setRig} token failed, please enter correct token`
                  );
                }
              });
            } else {
              console.log(
                `error in token ${setToken}  in ${setRig} from`,
                fromId
              );
              bot.sendMessage(
                fromId,
                `${setToken} token failed, please enter correct token`
              );
            }
          } else {
            const newRigState = rigState
              .updateOne(
                { rigNumber: setRig },
                { $set: { rigToken: setToken } }
              )
              .exec()
              .then((newStatus) => {
                console.log(`Set token ${setToken} to ${setRig} rig`);
                bot.sendMessage(
                  fromId,
                  `Set token ${setToken} to ${setRig} rig`
                );
              });
          }
        }
      }
    }
  } else {
    bot.sendMessage(fromId, `Please register`);
  }
});

// Функция добавления риг в список просмотра
bot.onText(/\/watch (.+)/, async function (msg, match) {
  const fromId = msg.from.id;
  const rig = match[1];
  const user = await telegramId.findOne({ id: fromId });
  if (user) {
    const { id, is_bot, first_name, last_name, username } = msg.from;

    let newRig = await rigState.findOne({ rigNumber: rig });
    if (!newRig) {
      const newtelegramId = telegramId
        .updateOne({ id: fromId }, { $addToSet: { rigNumbers: rig } })
        .exec()
        .then((newStatus) => console.log("Add new rigs", fromId, rig));
      bot.sendMessage(fromId, `Start watching ${rig} rig`);
      bot.sendMessage(fromId, `Please select ${rig} to send token`, {
        reply_markup: {
          keyboard: [[rig]],
        },
      });
    } else {
      bot.sendMessage(fromId, `Rig already registered`);
    }
  } else {
    bot.sendMessage(fromId, `Please register to add rigs`);
  }
});
// Функция установки токена для риг
bot.onText(/\/token/, async function (msg, match) {
  const fromId = msg.from.id;
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
  console.log("Set token", rigNumbers[0].rigNumbers);
  if (rigNumbers[0].rigNumbers.length === 0) {
    bot.sendMessage(fromId, "Please add any rig by /watch command");
  } else {
    bot.sendMessage(fromId, "Select rig to change token", {
      reply_markup: {
        keyboard: [rigNumbers[0].rigNumbers],
      },
    });
  }
});

// Функция удаления риг из списка просмотра
bot.onText(/\/watchstop (.+)/, async function (msg, match) {
  const fromId = msg.from.id;
  const rig = match[1];
  const user = await telegramId.findOne({ id: fromId });
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
        registerTime: false,
      }
    );
    if (rigNumbers[0].rigNumbers.includes(rig)) {
      console.log(`We are here!!!!!`, rig);

      const newtelegramId = telegramId
        .updateOne({ id: fromId }, { $pull: { rigNumbers: rig } })
        .exec()
        .then((newStatus) => console.log("Remove rig", fromId, rig))
        .catch(function (err) {
          console.log(err);
        });
      const res = await rigState.deleteOne({ rigNumber: rig });
      bot.sendMessage(fromId, `Stop watching ${rig} rig`);
    } else {
      bot.sendMessage(fromId, `You rigs list not includes ${rig} rig`);
    }
  } else {
    bot.sendMessage(fromId, `Please register to remove watching rigs`);
  }
});

// Функция вывода списка просматриваемых риг
bot.onText(/\/watchrig/, func_Watchrig);

async function func_Watchrig(msg) {
  const fromId = msg.from.id;
  const user = await telegramId.findOne({ id: fromId });
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
        registerTime: false,
      }
    );
    const resp = rigNumbers[0].rigNumbers;
    if (resp != 0) {
      console.log(`User ${fromId} watch ${resp}`);
      bot.sendMessage(fromId, `You watching ${resp} rig`);
    } else {
      bot.sendMessage(fromId, `Nothing to see, please add rig to watch`);
    }
  } else {
    bot.sendMessage(fromId, `Please register to watch rigs`);
  }
}

// Функция опроса статуса зарегистрированых риг
bot.onText(/\/status/, func_Status);

async function func_Status(msg, match) {
  const fromId = msg.from.id;
  const user = await telegramId.findOne({ id: fromId });
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
        registerTime: false,
      }
    );
    console.log("Request status rigs", rigNumbers[0].rigNumbers);
    const resp = rigNumbers[0].rigNumbers.forEach((element) => {
      const rigs = rigState
        .find(
          { rigNumber: element },
          {
            _id: false,
            id: false,
          }
        )
        .exec()
        .then((rigs) => {
          rigs.forEach((rigs) => {
            const rigResponse = getStatus(rigs.rigNumber, rigs.rigToken).then(
              (rigResponse) => {
                const rigResp =
                  rigResponse.online_status && rigResponse.mpu_list.length && 1;
                switch (rigResp) {
                  case 0: {
                    console.log("To telegram", fromId);
                    bot.sendMessage(
                      fromId,
                      `<b>${rigResponse.name} ${rigs.rigNumber}</b> is <b>offline</b>🔴`,
                      {
                        parse_mode: "HTML",
                      }
                    );
                    break;
                  }
                  case 1: {
                    console.log("To telegram", fromId);
                    bot.sendMessage(
                      fromId,
                      `<b>${rigResponse.name} ${rigs.rigNumber}</b> is <b>online</b>🟢`,
                      {
                        parse_mode: "HTML",
                      }
                    );
                    break;
                  }
                  case 2: {
                    console.log("To telegram", fromId);
                    bot.sendMessage(
                      fromId,
                      `<b>${rigResponse.name} ${rigs.rigNumber}</b> is online with errors❓`,
                      {
                        parse_mode: "HTML",
                      }
                    );
                    break;
                  }

                  default:
                    console.log(`${rigs.rigNumber} Status unknown `);
                }

                const currentCheckTime = new Date();
                const newStatus = rigState
                  .updateOne(
                    { rigNumber: rigs.rigNumber },
                    {
                      $set: {
                        rigStatus: rigResp,
                        rigCheckTime: currentCheckTime,
                      },
                    }
                  )
                  .exec();
              }
            );
          });
        });
    });
  } else {
    bot.sendMessage(fromId, `Please register to watch status rigs`);
  }
}

// Функция опроса полного статуса зарегистрированых риг
bot.onText(/\/fullstatus/, func_Fullstatus);

async function func_Fullstatus(msg, match) {
  const fromId = msg.from.id;
  const user = await telegramId.findOne({ id: fromId });
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
        registerTime: false,
      }
    );
    console.log("Request fullstatus rigs", rigNumbers[0].rigNumbers);
    const resp = rigNumbers[0].rigNumbers.forEach((element) => {
      const rigs = rigState
        .find(
          { rigNumber: element },
          {
            _id: false,
            id: false,
          }
        )
        .exec()
        .then((rigs) => {
          const rigResponse = getFullStatus(
            rigs[0].rigNumber,
            rigs[0].rigToken
          ).then((response) => {
            const rigStatus = parseStatus(response);
            const textConst = `
          <b>ℹ️ID: </b><i>${rigStatus.id}</i> <b>Name: </b><i>${
              rigStatus.name
            }</i>
<b>CPU: </b><i>${rigStatus.cpu_info}</i>
<b>MB: </b><i>${rigStatus.mb_info}</i>
<b>⏱UpTime: </b><i>${upTime(rigStatus.boot_time)}</i>
<b>⚡️Power W: </b><i>${rigStatus.power}</i> <b></b>
<b>🔥Temp °C: </b><i>${boldTemp(rigStatus.temp, rigs[0].rigTemp)}</i> <b></b>
<b>❄️Fan %: </b><i>${boldFan(rigStatus.fan_percent, rigs[0].rigFan)}</i> <b></b>
<b>💰Hashrate: </b><i>${rigStatus.hashrate.map(
              (item) => Math.ceil(item / 100000) / 10
            )}</i> <b>MH/s</b>
          `;
            bot.sendMessage(fromId, textConst, {
              parse_mode: "HTML",
            });
          });
        });
    });
  } else {
    bot.sendMessage(fromId, `Please register to watch status rigs`);
  }
}
// Функция опроса температуры зарегистрированых риг
bot.onText(/\/temp/, func_Temp);

async function func_Temp(msg, match) {
  const fromId = msg.from.id;
  const user = await telegramId.findOne({ id: fromId });
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
        registerTime: false,
      }
    );
    console.log("Request fullstatus rigs", rigNumbers[0].rigNumbers);
    const resp = rigNumbers[0].rigNumbers.forEach((element) => {
      const rigs = rigState
        .find(
          { rigNumber: element },
          {
            _id: false,
            id: false,
          }
        )
        .exec()
        .then((rigs) => {
          const rigResponse = getFullStatus(
            rigs[0].rigNumber,
            rigs[0].rigToken
          ).then((response) => {
            const rigStatus = parseStatus(response);
            const textConst = `
          <b>ℹ️ID: </b><i>${rigStatus.id}</i> <b>Name: </b><i>${
              rigStatus.name
            }</i>
<b>⏱UpTime: </b><i>${upTime(rigStatus.boot_time)}</i>
<b>⚡️Power W: </b><i>${rigStatus.power}</i> <b></b>
<b>🔥Temp °C: </b><i>${boldTemp(rigStatus.temp, rigs[0].rigTemp)}</i> <b></b>
<b>❄️Fan %: </b><i>${boldFan(rigStatus.fan_percent, rigs[0].rigFan)}</i> <b></b>
          `;
            bot.sendMessage(fromId, textConst, {
              parse_mode: "HTML",
            });
          });
        });
    });
  } else {
    bot.sendMessage(fromId, `Please register to watch status rigs`);
  }
}
// Функция установки температуры перегрева риг
bot.onText(/\/settemp (\d{6}) (\d{1,2})$/, async function (msg, match) {
  const fromId = msg.from.id;
  const setRig = match[1];
  const setTemp = match[2];
  const user = await telegramId.findOne({ id: fromId });
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
        registerTime: false,
      }
    );
    if (rigNumbers[0].rigNumbers.includes(setRig)) {
      const res = await rigState.updateOne(
        { rigNumber: setRig },
        {
          $set: {
            rigTemp: setTemp,
          },
        }
      );
      bot.sendMessage(
        fromId,
        `Set warning Temperature 🔥  <b>${setTemp} °C</b> to  <b>${setRig}</b> rig`,
        {
          parse_mode: "HTML",
        }
      );
    } else {
      bot.sendMessage(fromId, `You rigs list not includes ${rig} rig`);
    }
  } else {
    bot.sendMessage(fromId, `Please register to remove watching rigs`);
  }
});
// Функция установки алерта вентиляторов
bot.onText(/\/setfan (\d{6}) (\d{1,2})$/, async function (msg, match) {
  const fromId = msg.from.id;
  const setRig = match[1];
  const setFan = match[2];
  const user = await telegramId.findOne({ id: fromId });
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
        registerTime: false,
      }
    );
    if (rigNumbers[0].rigNumbers.includes(setRig)) {
      const res = await rigState.updateOne(
        { rigNumber: setRig },
        {
          $set: {
            rigFan: setFan,
          },
        }
      );
      bot.sendMessage(
        fromId,
        `Set warning Fan ❄️<b>${setFan} %</b> to  <b>${setRig}</b> rig`,
        {
          parse_mode: "HTML",
        }
      );
    } else {
      bot.sendMessage(fromId, `You rigs list not includes ${rig} rig`);
    }
  } else {
    bot.sendMessage(fromId, `Please register to remove watching rigs`);
  }
});
// Функция опроса hash зарегистрированых риг
bot.onText(/\/hashrate/, func_Hashrate);

async function func_Hashrate(msg, match) {
  const fromId = msg.from.id;
  const user = await telegramId.findOne({ id: fromId });
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
        registerTime: false,
      }
    );
    console.log("Request fullstatus rigs", rigNumbers[0].rigNumbers);
    const resp = rigNumbers[0].rigNumbers.forEach((element) => {
      const rigs = rigState
        .find(
          { rigNumber: element },
          {
            _id: false,
            id: false,
          }
        )
        .exec()
        .then((rigs) => {
          const rigResponse = getFullStatus(
            rigs[0].rigNumber,
            rigs[0].rigToken
          ).then((response) => {
            const rigStatus = parseStatus(response);
            const textConst = `
          <b>ℹ️ID: </b><i>${rigStatus.id}</i> <b>Name: </b><i>${
              rigStatus.name
            }</i>
<b>⏱UpTime: </b><i>${upTime(rigStatus.boot_time)}</i>
<b>💰Hashrate: </b><i>${rigStatus.hashrate.map((item) =>
              (item / (1024 * 1024)).toFixed(1)
            )}</i> <b>MH/s</b>
          `;
            bot.sendMessage(fromId, textConst, {
              parse_mode: "HTML",
            });
          });
        });
    });
  } else {
    bot.sendMessage(fromId, `Please register to watch status rigs`);
  }
}
// Функция регистрации пользователя
bot.onText(/\/register/, async function (msg, match) {
  const fromId = msg.from.id;
  const { id, is_bot, first_name, last_name, username } = msg.from;
  const user = await telegramId.findOne({ id: fromId });
  if (!user) {
    const newId = new telegramId({
      id,
      is_bot,
      first_name,
      last_name,
      username,
      rigNumbers: [],
    });
    await newId.save((err, result) => {
      if (err) {
        console.log("Unable update user: ", err);
      }
    });
    bot.sendMessage(
      fromId,
      `You register to watch rigs, type /help to see available commands`
    );
  } else {
    bot.sendMessage(fromId, `You already registered`);
  }
});

// Функция удаления пользователя
bot.onText(/\/unregister/, func_Unregister);

async function func_Unregister(msg, match) {
  const fromId = msg.from.id;
  const user = await telegramId.findOne({ id: fromId });

  if (user) {
    console.log(`${fromId} deleted`);
    let res = await telegramId.deleteOne({ id: fromId });
    let rig = await rigState.deleteMany({ id: fromId });
    bot.sendMessage(fromId, `You id and rigs deleted`);
  } else {
    bot.sendMessage(fromId, "You not registered");
  }
}
// Функция выдачи помощи
bot.onText(/\/help/, func_Help);

async function func_Help(msg, match) {
  const fromId = msg.from.id; // Получаем ID отправителя
  const user = await telegramId.findOne({ id: fromId });
  const textConst = `
/register - register you telegramID on server to watch status rig
/unregister - delete you telegramID from the server
/menu - show bot menu
/watch <b>num</b>  - add Rig to watchlist, where <b>num</b> is number of you Rig ex. /watch 999999
/watchstop <b>num</b> - remove Rig from watchlist
/watchrig  - request numbers of watching rigs
/status -  request status rig from watchlist
/fstatus <b>num</b> - request full status of <b>num</b> rig
/fullstatus - request full status of watching rigs
/temp - temperature, uptime, power and fan percentage of watching rigs
/hashrate - hashrate, uptime of watching rigs
/settemp <b>num</b> <b>temp</b> - set warning temperature for rig
/setfan <b>num</b> <b>fan</b> - set warning fan percentage for rig
/token - change rig token
/help - this help

for help and questions @MyRave_bot_support
`;
  if (user) {
    bot.sendMessage(fromId, textConst, {
      parse_mode: "HTML",
    });
  }
}

bot.onText(/\/serverwatch/, async function (msg, match) {
  const fromId = msg.from.id;
  if (fromId == adminId) {
    const rigNumbers = await rigState.distinct("rigNumber").exec();
    bot.sendMessage(
      fromId,
      `Server now watching ${rigNumbers.length} rigs, they are ${rigNumbers}`
    );
  }
});
bot.onText(/\/serveruser/, async function (msg, match) {
  const fromId = msg.from.id;
  if (fromId == adminId) {
    const userId = await telegramId.distinct("id").exec();
    bot.sendMessage(
      fromId,
      `On server now registered ${userId.length} users, they are ${userId}`
    );
  }
});

bot.onText(/\/serverutil/, async function (msg, match) {
  const fromId = msg.from.id;
  if (fromId == adminId) {
    const rigNumbers = await rigState
      .distinct("rigNumber")
      .then((rigNumbers) => {
        rigNumbers.forEach((item) => {
          const res = rigState.find(
            { rigNumber: item },
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
          console.log(res);

          // const res = rigState.updateOne(
          //   { rigNumber: item },
          //   {
          //     $set: {
          //       rigCheckTemp: true,
          //       rigCheckFan: true
          //     },
          //   }
          // );
        });
      });
  }
});
bot.onText(/\/serverutil/, async function (msg, match) {
  const fromId = msg.from.id;
  if (fromId == adminId) {
    const rigNumbers = await rigState
      .distinct("rigNumber")
      .then((rigNumbers) => {
        rigNumbers.forEach((item) => {
          const res = rigState.find(
            { rigNumber: item },
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
          console.log(res);

          // const res = rigState.updateOne(
          //   { rigNumber: item },
          //   {
          //     $set: {
          //       rigCheckTemp: true,
          //       rigCheckFan: true
          //     },
          //   }
          // );
        });
      });
  }
});

bot.onText(/\/menu/, async function (msg, match) {
  const fromId = msg.from.id;

  console.log(`Menu select`, fromId);
  // console.log(msg)
  bot.sendMessage(fromId, `RaveOS_Bot Menu`, {
    reply_markup: {
      inline_keyboard: menu.root_Menu,
    },
  });
});

// Функция обработки коллбеков клавиатуры
bot.on("callback_query", (query) => {
  const opts = {
    chat_id: query.message.chat.id,
    message_id: query.message.message_id,
  };

  switch (query.data) {
    //     case "01": {
    //       bot.editMessageText(`Status`, {
    //         ...opts,
    //         reply_markup: {
    //           inline_keyboard: menu.root_Menu,
    //         },
    //       }).catch((error) => {
    //   console.log(error.code);  // => 'ETELEGRAM'
    //   console.log(error.response.body); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
    // });
    //     break
    //     }
    case "01": {
      func_Status(query);
      break;
    }
    case "02": {
      bot.editMessageReplyMarkup(
        {
          inline_keyboard: menu.status_Menu,
        },
        opts
      );
      break;
    }
    case "03": {
      bot.editMessageReplyMarkup(
        {
          inline_keyboard: menu.settings_Menu,
        },
        opts
      );
      break;
    }
    case "04": {
      // bot.sendMessage(query.message.chat.id, "Close Menu", {
      //   reply_markup: {
      //     remove_keyboard: true,
      //   },
      // });
      bot.editMessageText(`Close Menu`, {
        ...opts,
        reply_markup: null,
      });
      break;
    }
    case "21": {
      func_Fullstatus(query);
      // bot.sendMessage(query.message.chat.id, "Full Status Rigs");
      break;
    }
    case "22": {
      func_Temp(query);
      // bot.sendMessage(query.message.chat.id, "Temperature");
      break;
    }
    case "23": {
      func_Hashrate(query);
      // bot.sendMessage(query.message.chat.id, "Hashrate");
      break;
    }
    case "24": {
      bot.editMessageReplyMarkup(
        {
          inline_keyboard: menu.root_Menu,
        },
        opts
      );
      break;
    }
    case "31": {
      bot.editMessageReplyMarkup(
        {
          inline_keyboard: menu.rig_Menu,
        },
        opts
      );
      break;
    }
    case "32": {
      bot.editMessageText(`Are You sure?`, {
        ...opts,
        reply_markup: {
          inline_keyboard: menu.unregister_Menu,
        },
      });
      break;
    }
    case "33": {
      func_Help(query);
      // bot.sendMessage(query.message.chat.id, "Help");
      break;
    }
    case "34": {
      bot.editMessageReplyMarkup(
        {
          inline_keyboard: menu.root_Menu,
        },
        opts
      );
      break;
    }
    case "41": {
      bot.sendMessage(query.message.chat.id, `Add Rig`);
      break;
    }
    case "42": {
      bot.sendMessage(query.message.chat.id, "Edit Token");
      break;
    }
    case "43": {
      bot.sendMessage(query.message.chat.id, "Remove Rig");
      break;
    }
    case "44": {
      bot.sendMessage(query.message.chat.id, "Set Temperature");
      break;
    }
    case "45": {
      bot.sendMessage(query.message.chat.id, "Set Fan");
      break;
    }
    case "46": {
      bot.editMessageReplyMarkup(
        {
          inline_keyboard: menu.settings_Menu,
        },
        opts
      );
      break;
    }
    case "47": {
      func_Watchrig(query);
      break;
    }
    case "51": {
      func_Unregister(query);
      bot.editMessageText(`Unregister`, {
        ...opts,
        reply_markup: null,
      });
      break;
    }
    case "52": {
      bot.editMessageText(`RaveOS_Bot Menu`, {
        ...opts,
        reply_markup: {
          inline_keyboard: menu.settings_Menu,
        },
      });
      break;
    }
  }
});

bot.on("polling_error", (error) => {
  console.log(error.code); // => 'EFATAL'
});
// Функция просмотра полного статуса риги
bot.onText(/\/fstatus (.+)/, async function (msg, match) {
  const fromId = msg.from.id;
  const rig = match[1];
  if (fromId == adminId) {
    console.log(`Request fullstatus ${rig}`);
    const rigs = await rigState
      .find(
        { rigNumber: rig },
        {
          _id: false,
          id: false,
        }
      )
      .exec()
      .then((rigs) => {
        if (rigs.length !== 0) {
          const rigResponse = getFullStatus(
            rigs[0].rigNumber,
            rigs[0].rigToken
          ).then((response) => {
            const rigStatus = parseStatus(response);
            const textConst = `
          <b>ℹ️ID: </b><i>${rigStatus.id}</i> <b>Name: </b><i>${
              rigStatus.name
            }</i>
<b>CPU: </b><i>${rigStatus.cpu_info}</i>
<b>MB: </b><i>${rigStatus.mb_info}</i>
<b>⏱UpTime: </b><i>${upTime(rigStatus.boot_time)}</i>
<b>💎Video: </b><i>${rigStatus.video}</i> <b></b>
<b>⚡️Power W: </b><i>${rigStatus.power}</i> <b></b>
<b>🔥Temp °C: </b><i>${boldTemp(rigStatus.temp, rigs[0].rigTemp)}</i> <b></b>
<b>❄️Fan %: </b><i>${boldFan(rigStatus.fan_percent, rigs[0].rigFan)}</i> <b></b>
<b>💰Hashrate: </b><i>${rigStatus.hashrate.map((item) =>
              (item / (1024 * 1024)).toFixed(1)
            )}</i> <b>MH/s</b>
          `;
            bot.sendMessage(fromId, textConst, {
              parse_mode: "HTML",
            });
          });
        } else {
          bot.sendMessage(fromId, "this rig not reistered in DB", {
            parse_mode: "HTML",
          });
        }
      });
  } else {
    const user = await telegramId.findOne({ id: fromId });
    if (user) {
      let rigNumbers = await telegramId
        .find(
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
        )
        .then((res) => {
          if (res[0].rigNumbers.includes(rig)) {
            console.log(`Request fullstatus ${rig}`);
            const rigs = rigState
              .find(
                { rigNumber: rig },
                {
                  _id: false,
                  id: false,
                }
              )
              .exec()
              .then((rigs) => {
                const rigResponse = getFullStatus(
                  rigs[0].rigNumber,
                  rigs[0].rigToken
                ).then((response) => {
                  const rigStatus = parseStatus(response);
                  const textConst = `
          <b>ℹ️ID: </b><i>${rigStatus.id}</i> <b>Name: </b><i>${
                    rigStatus.name
                  }</i>
<b>CPU: </b><i>${rigStatus.cpu_info}</i>
<b>MB: </b><i>${rigStatus.mb_info}</i>
<b>⏱UpTime: </b><i>${upTime(rigStatus.boot_time)}</i>
<b>💎Video: </b><i>${rigStatus.video}</i> <b></b>
<b>⚡️Power W: </b><i>${rigStatus.power}</i> <b></b>
<b>🔥Temp °C: </b><i>${boldTemp(rigStatus.temp, rigs[0].rigTemp)}</i> <b></b>
<b>❄️Fan %: </b><i>${boldFan(rigStatus.fan_percent, rigs[0].rigFan)}</i> <b></b>
<b>💰Hashrate: </b><i>${rigStatus.hashrate.map((item) =>
                    (item / (1024 * 1024)).toFixed(1)
                  )}</i> <b>MH/s</b>
          `;
                  bot.sendMessage(fromId, textConst, {
                    parse_mode: "HTML",
                  });
                });
              });
          }
        });
    } else {
      bot.sendMessage(fromId, "You dont register this rig");
    }
  }
});

// Set interval request 1000 msec * 60 sec * 5 min
const timeInterval = 1000 * 60 * 5;
let timerId = setInterval(() => sendRequestRigs(), timeInterval);
