const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
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
      return response.json({ error: 'Missing name' });
    }
    if (!type || ['folder', 'file', 'name'].indexOf(type) === -1) {
      response.statusCode = 400;
      return response.json({ error: 'Missing type' });
    }
    if (!parentId) parentId = 0;
    else {
      const parentFileArray = await files.find({ _id: ObjectID(parentId) }).toArray();
      if (parentFileArray.length === 0) return response.status(400).json({ error: 'Parent not found' });

      const file = parentFileArray[0];
      if (file.type !== 'folder') return response.status(400).json({ error: 'Parent is not a folder' });
    }
    if (!isPublic) isPublic = false;
    if (!data && type !== 'folder') {
      response.statusCode = 400;
      return response.json({ error: 'Missing data' });
    }
    if (type !== 'folder') {
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);

      const fileNameUUID = uuidv4();
      const localPath = `${folderPath}/${fileNameUUID}`;
      const clearData = Buffer.from(data, 'base64').toString();
      await fs.promises.writeFile(localPath, clearData, { flag: 'w+' });
      const resultObj = await files.insertOne({
        userId: ObjectID(userId),
        name,
        type,
        isPublic,
        parentId: parentId === 0 ? parentId : ObjectID(parentId),
        localPath,
      });
      return response.json({
        id: resultObj.ops[0]._id, userId, name, type, isPublic, parentId, localPath,
      });
    }
    const resultObj = await files.insertOne({
      userId: ObjectID(userId),
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? parentId : ObjectID(parentId),
    });
    return response.json({
      id: resultObj.ops[0]._id, userId, name, type, isPublic, parentId,
    });
  }
}

module.exports = FilesController;
