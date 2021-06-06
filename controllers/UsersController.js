import Queue from 'bull';
import dbClient from '../utils/db';
import { checkAuth, findUserById, userInputValidation } from '../utils/helpers';

class UsersController {
  static async postNew(request, response) {
    const userQueue = new Queue('userQueue');
    const { email } = request.body;
    const { password } = request.body;
    const hashedPassword = await userInputValidation(response, email, password);

    const resultObj = await dbClient.users.insertOne({ email, password: hashedPassword });
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

export default UsersController;
