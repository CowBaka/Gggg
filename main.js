//////////////////////////////////////////////////////
//========= Require all variable need use =========//
/////////////////////////////////////////////////////
const { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync, rm } = require("fs-extra");
const { join, resolve } = require("path");
const { execSync } = require('child_process');
const logger = require("./utils/log.js");
const login = require('@dongdev/fca-unofficial'); // thay fca ở đây nếu cần
const fs = require('fs-extra');
const chalk = require('chalk');
const figlet = require('figlet');
const moment = require('moment-timezone');
if (!fs.existsSync('./utils/data')) {
  fs.mkdirSync('./utils/data', { recursive: true });
}
// Cái này húp từ file Bảo
function getMemoryInfo() {
    const memory = process.memoryUsage();
    const totalRAM = os.totalmem();
    const freeRAM = os.freemem();
    const usedRAM = totalRAM - freeRAM;

    return {
        ram: {
            used: Math.round(usedRAM / 1024 / 1024),
            total: Math.round(totalRAM / 1024 / 1024),
        },
        heap: {
            used: Math.round(memory.heapUsed / 1024 / 1024),
            total: Math.round(memory.heapTotal / 1024 / 1024)
        }
    };
}
global.client = {
  commands: new Map(),
  events: new Map(),
  cooldowns: new Map(),
  eventRegistered: [],
  handleReaction: [],
  handleReply: [],
  mainPath: process.cwd(),
  configPath: "",
  getTime: option => moment.tz("Asia/Ho_Chi_minh").format({ seconds: "ss", minutes: "mm", hours: "HH", date: "DD", month: "MM", year: "YYYY", fullHour: "HH:mm:ss", fullYear: "DD/MM/YYYY", fullTime: "HH:mm:ss DD/MM/YYYY" }[option])
};
global.data = new Object({
    threadInfo: new Map(),
    threadData: new Map(),
    userName: new Map(),
    userBanned: new Map(),
    threadBanned: new Map(),
    commandBanned: new Map(),
    threadAllowNSFW: new Array(),
    allUserID: new Array(),
    allCurrenciesID: new Array(),
    allThreadID: new Array()
});
global.utils = require("./utils/func");
global.config = require('./config.json');
global.configModule = new Object();
global.moduleData = new Array();
global.language = new Object();
const langFile = (readFileSync(`${__dirname}/languages/${global.config.language || "en"}.lang`, { encoding: 'utf-8' })).split(/\r?\n|\r/);
const langData = langFile.filter(item => item.indexOf('#') != 0 && item != '');
for (const item of langData) {
    const getSeparator = item.indexOf('=');
    const itemKey = item.slice(0, getSeparator);
    const itemValue = item.slice(getSeparator + 1, item.length);
    const head = itemKey.slice(0, itemKey.indexOf('.'));
    const key = itemKey.replace(head + '.', '');
    const value = itemValue.replace(/\\n/gi, '\n');
    if (typeof global.language[head] == "undefined") global.language[head] = new Object();
    global.language[head][key] = value;
}
global.getText = function (...args) {
    const langText = global.language;    
    if (!langText.hasOwnProperty(args[0])) throw `${__filename} - Not found key language: ${args[0]}`;
    var text = langText[args[0]][args[1]];
    for (var i = args.length - 1; i > 0; i--) {
        const regEx = RegExp(`%${i}`, 'g');
        text = text.replace(regEx, args[i + 1]);
    }
    return text;
}

try {
    var appStateFile = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || "appstate.json"));
    var appState = require(appStateFile);
    logger.loader(global.getText("mirai", "foundPathAppstate"))
}
catch { 
    logger.loader(global.getText("mirai", "notFoundPathAppstate"), "error")
    return process.exit(0)
    
}
console.log(chalk.bold.hex("#FFFF00").bold("[ KRYSTAL ]"));
function onBot({ models }) {
    const loginData = {};
    loginData['appState'] = appState;
    login(loginData, async(loginError, loginApiData) => {
        if (loginError) return logger(JSON.stringify(loginError), `ERROR`);
        const startMem = getMemoryInfo();
        logger(`• RAM: ${startMem.ram.used}MB/${startMem.ram.total}MB • HEAP: ${startMem.heap.used}MB/${startMem.heap.total}MB`, "[ MEMORY ]");
        setInterval(() => {
            const currentMem = getMemoryInfo();
            logger(`• RAM: ${currentMem.ram.used}MB/${currentMem.ram.total}MB • HEAP: ${currentMem.heap.used}MB/${currentMem.heap.total}MB`, "[ MEMORY ]");
}, 30000);
      global.client.api = loginApiData
        loginApiData.setOptions(global.config.FCAOption)
        writeFileSync(appStateFile, JSON.stringify(loginApiData.getAppState(), null, '\x09'))
        global.config.version = '2.3.9';
        global.client.timeStart = new Date().getTime();
        global.client.api = api;
        const userId = api.getCurrentUserID();
        const user = await api.getUserInfo([userId]);
        const userName = user[userId]?.name || null;
        logger(`Đăng nhập thành công - ${userName} (${userId})`, '[ LOGIN ] >');
        console.log(chalk.yellow(figlet.textSync('WELCOME', { horizontalLayout: 'full' })));
        (function () {
            const loadModules = (path, collection, disabledList, type) => {
              const items = readdirSync(path).filter(file => file.endsWith('.js') && !file.includes('example') && !disabledList.includes(file));
              let loadedCount = 0;   
              for (const file of items) {
                try {
                  const item = require(join(path, file));
                  const { config, run, onLoad, handleEvent } = item;
                  if (!config || !run || (type === 'commands' && !config.commandCategory)) {
                    throw new Error(`Lỗi định dạng trong ${type === 'commands' ? 'lệnh' : 'sự kiện'}: ${file}`);
                  }  
                  if (global.client[collection].has(config.name)) {
                    throw new Error(`Tên ${type === 'commands' ? 'lệnh' : 'sự kiện'} đã tồn tại: ${config.name}`);
                  }
                  if (config.envConfig) {
                    global.configModule[config.name] = global.configModule[config.name] || {};
                    global.config[config.name] = global.config[config.name] || {};  
                    for (const key in config.envConfig) {
                      global.configModule[config.name][key] = global.config[config.name][key] || config.envConfig[key] || '';
                      global.config[config.name][key] = global.configModule[config.name][key];
                    }
                  }
                  if (onLoad) onLoad({ api, models });
                  if (handleEvent) global.client.eventRegistered.push(config.name);
                  global.client[collection].set(config.name, item);
                  loadedCount++;
                } catch (error) {
                  console.error(`Lỗi khi tải ${type === 'commands' ? 'lệnh' : 'sự kiện'} ${file}:`, error);
                }
              }
              if (loadedCount === 0) {
                console.log(`Không tìm thấy ${type === 'commands'? 'lệnh' :'sự kiện'} nào trong thư mục ${path}`); 
              }
              return loadedCount;
            };
            const commandPath = join(global.client.mainPath, 'modules', 'commands');
            const eventPath = join(global.client.mainPath, 'modules', 'events');
            const loadedCommandsCount = loadModules(commandPath, 'commands', global.config.commandDisabled, 'commands');
            logger.loader(`Loaded ${loadedCommandsCount} commands`);    
            const loadedEventsCount = loadModules(eventPath, 'events', global.config.eventDisabled, 'events');
            logger.loader(`Loaded ${loadedEventsCount} events`);
        })();
        logger.loader(' Ping load source: ' + (Date.now() - global.client.timeStart) + 'ms');
        writeFileSync('./config.json', JSON.stringify(global.config, null, 4), 'utf8');
        const listener = require('./includes/listen')({ api, models });
        function listenerCallback(error, event) {
          if (error) {
            if (JSON.stringify(error).includes("601051028565049")) {
              const form = {
                av: api.getCurrentUserID(),
                fb_api_caller_class: "RelayModern",
                fb_api_req_friendly_name: "FBScrapingWarningMutation",
                variables: "{}",
                server_timestamps: "true",
                doc_id: "6339492849481770",
              };
              api.httpPost("https://www.facebook.com/api/graphql/", form, (e, i) => {
                const res = JSON.parse(i);
                if (e || res.errors) return logger("Lỗi không thể xóa cảnh cáo của facebook.", "error");
                if (res.data.fb_scraping_warning_clear.success) {
                  logger("Đã vượt cảnh cáo facebook thành công.", "[ SUCCESS ] >");
                  global.handleListen = api.listenMqtt(listenerCallback);
                  setTimeout(() => (mqttClient.end(), connect_mqtt()), 1000 * 60 * 60 * 1);
                  logger(global.getText('mirai', 'successConnectMQTT'), '[ MQTT ]');
                }
              });
            } else {
              return logger(global.getText("mirai", "handleListenError", JSON.stringify(error)), "error");
            }
          }
          if (["presence", "typ", "read_receipt"].some((data) => data === event?.type)) return;
          if (global.config.DeveloperMode) console.log(event);
          return listener(event);
        }
        function connect_mqtt() {
          global.handleListen = api.listenMqtt(listenerCallback);
          setTimeout(() => (mqttClient.end(), connect_mqtt()), 1000 * 60 * 60 * 1);
          logger(global.getText('mirai', 'successConnectMQTT'), '[ MQTT ]');
        }
        connect_mqtt();
    });
}
(async() => {
    try {
        const { Sequelize, sequelize } = require("./includes/database");
        await sequelize.authenticate();
        const models = require('./includes/database/model')({ Sequelize, sequelize });
        logger(global.getText('mirai', 'successConnectDatabase'), '[ DATABASE ]');
        onBot({ models });
    } catch (error) { 
        console.log(error);
      }
})();
process.on("unhandledRejection", (err, p) => {console.log(p)});

// @LunarKrystal: 
// Chỉnh linh tinh hỏng thì tự chịu
// Bê từ Mirai V3 của @dongDev-VN sang =))