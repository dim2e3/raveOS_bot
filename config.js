import dotenv from "dotenv";
const result = dotenv.config()

if (result.error) {
  throw result.error
}

const options = {
  adminId: process.env.ADMINID,
  botId: process.env.BOTID,
  token: process.env.TOKEN,
  request_Url: process.env.REQUEST_URL,
  mongoURL: process.env.MONGO_URL,
};

export default options

