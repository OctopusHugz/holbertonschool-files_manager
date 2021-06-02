const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AuthController {
  static async getConnect(request, response) {
    const fullAuthHeader = request.headers.authorization;
    const b64AuthHeader = fullAuthHeader.slice(6);
    const userCreds = Buffer.from(b64AuthHeader, 'base64').toString();
    const email = userCreds.split(':')[0];
    const password = userCreds.split(':')[1];
    const hashedPassword = crypto.createHash('SHA1').update(password).digest('hex');
    const users = dbClient.db.collection('users');
    const userExistsArray = await users.find({ email, password: hashedPassword }).toArray();

    if (userExistsArray.length === 0) response.status(401).json({ error: 'Unauthorized' });

    const user = userExistsArray[0];
    const token = uuidv4();
    const key = `auth_${token}`;
    await redisClient.set(key, user._id.toString(), 60 * 60 * 24);
    response.json({ token });
  }

  static async getDisconnect(request, response) {
    const token = request.headers['x-token'];
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (userId === null) response.status(401).json({ error: 'Unauthorized' });
    await redisClient.del(key);
    response.status(204).end();
  }
}

module.exports = AuthController;
