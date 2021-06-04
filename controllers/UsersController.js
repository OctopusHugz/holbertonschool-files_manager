const crypto = require('crypto');
const Queue = require('bull');
const dbClient = require('../utils/db');
const { checkAuth, findUserById } = require('../utils/helpers');

class UsersController {
  static async postNew(request, response) {
    const userQueue = new Queue('userQueue');
    const { email } = request.body;
    const { password } = request.body;
    const users = dbClient.db.collection('users');

    // Refactor checks for missing attributes into inputValidation()
    if (!email) {
      response.statusCode = 400;
      return response.json({ error: 'Missing email' });
    }
    if (!password) {
      response.statusCode = 400;
      return response.json({ error: 'Missing password' });
    }

    const userExistsArray = await users.find({ email }).toArray();
    if (userExistsArray.length > 0) {
      response.statusCode = 400;
      return response.json({ error: 'Already exist' });
    }

    const hashedPassword = crypto.createHash('SHA1').update(password).digest('hex');
    const resultObj = await users.insertOne({ email, password: hashedPassword });
    const createdUser = { id: resultObj.ops[0]._id, email: resultObj.ops[0].email };
    userQueue.add({ userId: createdUser.id });
    response.statusCode = 201;
    return response.json(createdUser);
  }

  static async getMe(request, response) {
    const userId = await checkAuth(request, response);
    const user = await findUserById(userId);
    return response.json({ id: user._id, email: user.email });
  }
}

module.exports = UsersController;
