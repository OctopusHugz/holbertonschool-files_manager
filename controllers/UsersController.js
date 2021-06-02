const crypto = require('crypto');
const dbClient = require('../utils/db');

class UsersController {
  static async postNew(request, response) {
    const { email } = request.body;
    const { password } = request.body;
    if (!email) {
      response.statusCode = 400;
      response.json({ error: 'Missing email' });
    }
    if (!password) {
      response.statusCode = 400;
      response.json({ error: 'Missing password' });
    }

    // If email already exists in DB
    const users = dbClient.db.collection('users');
    const userExistsArray = await users.find({ email }).toArray();
    if (userExistsArray.length > 0) {
      response.statusCode = 400;
      response.json({ error: 'Already exist' });
    }

    const hashedPassword = crypto.createHash('SHA1').update(password).digest('hex');
    const resultObj = await users.insertOne({ email, password: hashedPassword });
    const createdUser = { id: resultObj.ops[0]._id, email: resultObj.ops[0].email };
    response.statusCode = 201;
    response.json(createdUser);
  }
}

module.exports = UsersController;
