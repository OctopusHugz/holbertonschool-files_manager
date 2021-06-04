const { v4: uuidv4 } = require('uuid');
const redisClient = require('../utils/redis');
const { checkAuthReturnKey, findUserByCreds, credsFromBasicAuth } = require('../utils/helpers');

class AuthController {
  static async getConnect(request, response) {
    const creds = await credsFromBasicAuth(request);
    const user = await findUserByCreds(response, creds.email, creds.password);
    const token = uuidv4();
    const key = `auth_${token}`;
    await redisClient.set(key, user._id.toString(), 60 * 60 * 24);
    return response.json({ token });
  }

  static async getDisconnect(request, response) {
    const key = await checkAuthReturnKey(request, response);
    await redisClient.del(key);
    return response.status(204).end();
  }
}

module.exports = AuthController;
