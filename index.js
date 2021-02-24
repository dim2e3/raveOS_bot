require("dotenv").config();

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
      rigs.forEach((rigs) => {
          const rigResponse = getStatus(rigs.rigNumber, rigs.rigToken).then(
            (rigResponse) => {
            if (rigResponse !== rigs.rigStatus) {
                switch (rigResponse) {
                  case 0: {
                    console.log("To telegram", element);
                    bot.sendMessage(
                      element,
                      `Rig ${rigs.rigNumber} is offline`
                    );
                    break;
                  }
                  case 1: {
                    console.log("To telegram", element);
                    bot.sendMessage(element, `Rig ${rigs.rigNumber} is online`);
                    break;
                  }
                  case 2: {
                    console.log("To telegram", element);
                    bot.sendMessage(
                      element,
                      `Rig ${rigs.rigNumber} is online with errors`
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
                      rigStatus: rigResponse,
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
async function getStatus(
  req,
  request_Token = "9efffce7-d616-4aa9-9fe5-fce8723a0214"
) {
  try {

    const response = await axios.get(`${request_Url}${req}`, {
      headers: {
        "X-Auth-Token": request_Token,
      },
    });
    const { data } = response;

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
      required: true,
    },
    rigStatus: {
      type: Number,
      required: true,
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
    console.log(setRig);
    const setToken = msg.text;
    if (isBot === Number(botId)) {
      const newRigState = rigState
        .updateOne({ rigNumber: setRig }, { $set: { rigToken: setToken } })
        .exec()
        .then((newStatus) => {
          console.log(`Set ${setRig} ${setToken}`);
          bot.sendMessage(fromId, `Set token ${setToken} to ${setRig} rig`);
        });
    }
  }
});
bot.onText(/\/watch (.+)/, async function (msg, match) {
  const fromId = msg.from.id;
  const rig = match[1];

  const { id, is_bot, first_name, last_name, username } = msg.from;

  let newRig = await rigState.findOne({ rigNumber: rig });
  console.log(newRig);
  if (!newRig) {
    console.log("IF");
    const newState = new rigState({
      id: fromId,
      rigNumber: rig,
      rigToken: "",
      rigStatus: 0,
    });
    await newState.save();
    const newtelegramId = telegramId
      .updateOne({ id: fromId }, { $addToSet: { rigNumbers: rig } })
      .exec()
      .then((newStatus) => console.log("Add new rigs", fromId, rig));
    bot.sendMessage(fromId, `Start watching ${rig} rig`);
  } else {
    console.log("ELSE");
    bot.sendMessage(fromId, `Rig already registered`);
  }
});

bot.onText(/\/watchstop (.+)/, async function (msg, match) {
  const fromId = msg.from.id;
  const rig = match[1];
  bot.sendMessage(fromId, `Stop watching ${rig} rig`);

   const newtelegramId = telegramId
    .updateOne({ id: fromId }, { $pull: { rigNumbers: rig } })
    .exec()
    .then((newStatus) => console.log("Remove rig", fromId, rig))
    .catch(function (err) {
      console.log(err);
    });
  console.log(newtelegramId);
});

bot.onText(/\/watchrig/, async function (msg, match) {
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
  const resp = rigNumbers[0].rigNumbers;
  console.log(`User ${fromId} watch ${resp}`);
  bot.sendMessage(fromId, `You watching ${resp} rig`);
});
bot.onText(/\/status/, async function (msg, match) {
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
  console.log("Massive ", rigNumbers[0].rigNumbers);
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
                       switch (rigResponse) {
                case 0: {
                  console.log("To telegram", fromId);
                  bot.sendMessage(fromId, `Rig ${rigs.rigNumber} is offline`);
                  break;
                }
                case 1: {
                  console.log("To telegram", fromId);
                  bot.sendMessage(fromId, `Rig ${rigs.rigNumber} is online`);
                  break;
                }
                case 2: {
                  console.log("To telegram", fromId);
                  bot.sendMessage(
                    fromId,
                    `Rig ${rigs.rigNumber} is online with errors`
                  );
                  break;
                }
                default:
                  console.log("State unknown");
              }
              const currentCheckTime = new Date();
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
                          }
          );
        });
      });
  });
});
bot.onText(/\/register/, async function (msg, match) {
  const fromId = msg.from.id;
  const { id, is_bot, first_name, last_name, username } = msg.from;

  let user = await telegramId.findOne({ id: fromId });
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
    bot.sendMessage(fromId, `You register to watch rigs`);
  } else {
    bot.sendMessage(fromId, `You already registered`);
  }
});

bot.onText(/\/serverwatch/, async function (msg, match) {
  const fromId = msg.from.id;
  console.log('from server watch', adminId)
  if (fromId === Number(adminId)) {
    const rigNumbers = await rigState.distinct("rigNumber").exec();
    console.log(rigNumbers);
    bot.sendMessage(fromId, `Server now watching ${rigNumbers}`);
  }
});

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

  console.log(rigNumbers[0].rigNumbers);
  bot.sendMessage(fromId, "Select rig to enter token", {
    reply_markup: {
      keyboard: [rigNumbers[0].rigNumbers],
    },
  });
});


// Set interval request 1000 msec * 60 sec * 1 min
const timeInterval = 1000 * 60 * 1;
let timerId = setInterval(() => sendRequestRigs(), timeInterval);

