# raveOS_bot
Small version of telegram bot for Rave OS

Available commands:

/register - register you telegramID on server to watch status rig
/unregister - delete you telegramID from the server
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