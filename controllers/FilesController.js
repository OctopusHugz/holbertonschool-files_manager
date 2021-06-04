const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const mime = require('mime-types');
const Queue = require('bull');
const dbClient = require('../utils/db');
const {
  checkAuth, findFile, sanitizeReturnObj, findAndUpdateFile,
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
    const files = dbClient.db.collection('files');
    const userId = await checkAuth(request, response);
    const { parentId } = request.query;
    let { page } = request.query;

    if (!page) page = 0;
    if (!parentId) {
      // Still need to test this pagination with > 20 items and page > 0
      const folderArray = await files.aggregate([
        { $match: { userId: ObjectID(userId) } },
        { $skip: page * 20 },
        { $limit: 20 },
      ]).toArray();
      if (folderArray.length === 0) return response.json([]);
      const mappedFolderArray = folderArray.map((file) => ({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      }));
      return response.json(mappedFolderArray);
    }
    // Still need to test this pagination with > 20 items and page > 0
    const folderArray = await files.aggregate([
      { $match: { parentId: ObjectID(parentId) } },
      { $skip: page * 20 },
      { $limit: 20 },
    ]).toArray();
    if (folderArray.length === 0) return response.json([]);
    const mappedFolderArray = folderArray.map((file) => ({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    }));
    return response.json(mappedFolderArray);
  }

  static async putPublish(request, response) {
    const files = dbClient.db.collection('files');
    const userId = await checkAuth(request, response);
    const file = await findAndUpdateFile(request, response, files, userId, true);
    return sanitizeReturnObj(response, file, userId);
  }

  static async putUnpublish(request, response) {
    const files = dbClient.db.collection('files');
    const userId = await checkAuth(request, response);
    const file = await findAndUpdateFile(request, response, files, userId, false);
    return sanitizeReturnObj(response, file, userId);
  }

  static async getFile(request, response) {
    const files = dbClient.db.collection('files');
    const token = request.headers['x-token'];
    const { size } = request.query;
    const userId = await checkAuth(request, response);
    const file = await findFile(request, response, files, userId);

    if (file.isPublic === false || (token !== undefined && userId === null)) return response.status(404).json({ error: 'Not found' });
    if (file.type === 'folder') return response.status(400).json({ error: 'A folder doesn\'t have content' });
    if (!fs.existsSync(file.localPath)) return response.status(404).json({ error: 'Not found' });
    const mimeType = mime.lookup(file.name);
    response.setHeader('Content-Type', mimeType);
    let data;
    if (size) {
      data = await fs.promises.readFile(`${file.localPath}_${size}`);
    } else {
      data = await fs.promises.readFile(file.localPath);
    }
    if (data) { return response.end(data); }
    return response.status(404).json({ error: 'Not found' });
  }
}

module.exports = FilesController;
