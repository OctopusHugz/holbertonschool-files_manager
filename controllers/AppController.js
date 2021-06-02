const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AppController {
  static getStatus(request, response) {
    const resObj = { redis: redisClient.isAlive(), db: dbClient.isAlive() };
    return response.json(resObj);
  }

  static async getStats(request, response) {
    const resObj = { users: await dbClient.nbUsers(), files: await dbClient.nbFiles() };
    return response.json(resObj);
  }
}

module.exports = AppController;
