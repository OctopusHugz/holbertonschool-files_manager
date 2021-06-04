const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const Queue = require('bull');
const dbClient = require('../utils/db');
const {
  checkAuth, findFile, sanitizeReturnObj, findAndUpdateFile,
  aggregateAndPaginate, checkFileAndReadContents,
} = require('../utils/helpers');

class FilesController {
  static async postUpload(request, response) {
    const fileQueue = new Queue('fileQueue');
    const files = dbClient.db.collection('files');
    const userId = await checkAuth(request, response);
    const { name, type, data } = request.body;
    let { parentId, isPublic } = request.body;
    let resultObj;

    if (!name) {
      response.statusCode = 400;
      return response.json({ error: 'Missing name' });
    }
    if (!type || ['folder', 'file', 'image'].indexOf(type) === -1) {
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
      const clearData = Buffer.from(data, 'base64');
      await fs.promises.writeFile(localPath, clearData.toString(), { flag: 'w+' });
      resultObj = await files.insertOne({
        userId: ObjectID(userId),
        name,
        type,
        isPublic,
        parentId: parentId === 0 ? parentId : ObjectID(parentId),
        localPath,
      });
      if (type === 'image') {
        await fs.promises.writeFile(localPath, clearData, { flag: 'w+', encoding: 'binary' });
        fileQueue.add({ userId, fileId: resultObj.insertedId, localPath });
      }
    } else {
      resultObj = await files.insertOne({
        userId: ObjectID(userId),
        name,
        type,
        isPublic,
        parentId: parentId === 0 ? parentId : ObjectID(parentId),
      });
    }
    response.statusCode = 201;
    return response.json({
      id: resultObj.ops[0]._id, userId, name, type, isPublic, parentId,
    });
  }

  static async getShow(request, response) {
    const userId = await checkAuth(request, response);
    const files = dbClient.db.collection('files');
    const file = await findFile(request, response, files, userId);
    return sanitizeReturnObj(response, file, userId);
  }

  static async getIndex(request, response) {
    const userId = await checkAuth(request, response);
    const files = dbClient.db.collection('files');
    const { parentId } = request.query;
    const searcher = parentId || userId;
    const { page } = request.query || 0;
    return aggregateAndPaginate(response, files, page, searcher);
  }

  static async putPublish(request, response) {
    const userId = await checkAuth(request, response);
    const files = dbClient.db.collection('files');
    const file = await findAndUpdateFile(request, response, files, userId, true);
    return sanitizeReturnObj(response, file, userId);
  }

  static async putUnpublish(request, response) {
    const userId = await checkAuth(request, response);
    const files = dbClient.db.collection('files');
    const file = await findAndUpdateFile(request, response, files, userId, false);
    return sanitizeReturnObj(response, file, userId);
  }

  static async getFile(request, response) {
    const userId = await checkAuth(request, response);
    const files = dbClient.db.collection('files');
    const token = request.headers['x-token'];
    const { size } = request.query;
    const file = await findFile(request, response, files, userId);
    return checkFileAndReadContents(response, file, token, userId, size);
  }
}

module.exports = FilesController;
