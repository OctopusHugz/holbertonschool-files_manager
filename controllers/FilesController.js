const { ObjectID } = require('mongodb');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class FilesController {
  static async postUpload(request, response) {
    const token = request.headers['x-token'];
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (userId === null) response.status(401).json({ error: 'Unauthorized' });

    const { name } = request.body;
    const { type } = request.body;
    let { parentId } = request.body;
    let { isPublic } = request.body;
    const { data } = request.body;

    const files = dbClient.db.collection('files');

    if (!name) {
      response.statusCode = 400;
      response.json({ error: 'Missing name' });
    }
    if (!type || ['folder', 'file', 'name'].indexOf(type) === -1) {
      response.statusCode = 400;
      response.json({ error: 'Missing type' });
    }
    if (!parentId) parentId = 0;
    else {
      // Does the new ObjectID syntax work?
      const parentFileArray = await files.find({ parentId: ObjectID(parentId) }).toArray();
      if (parentFileArray.length === 0) response.status(400).json({ error: 'Parent not found' });

      const file = parentFileArray[0];
      if (file.type !== 'folder') response.status(400).json({ error: 'Parent is not a folder' });
    }
    if (!isPublic) isPublic = false;
    if (!data && type !== 'folder') {
      response.statusCode = 400;
      response.json({ error: 'Missing data' });
    }
    if (type === 'folder') {
      const resultObj = await files.insertOne({
        userId: ObjectID(userId), name, type, isPublic, parentId,
      });
      response.json({
        id: resultObj.ops[0]._id, userId, name, type, isPublic, parentId,
      });
    } else {
      const resultObj = await files.insertOne({
        userId: ObjectID(userId), name, type, isPublic, parentId,
      });
      response.json({
        id: resultObj.ops[0]._id, userId, name, type, isPublic, parentId,
      });
    }
  }
}

module.exports = FilesController;
