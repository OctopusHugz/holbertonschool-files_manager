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
    redisClient.set(key, user._id.toString(), 60 * 60 * 24);
    response.json({ token });
  }

  static getDisconnect(request, response) {
    // Retrieve the user based on the token:
    // If not found, return an error Unauthorized with a status code 401
    // Otherwise, delete the token in Redis and return nothing with a status code 204
  }
}

module.exports = AuthController;
