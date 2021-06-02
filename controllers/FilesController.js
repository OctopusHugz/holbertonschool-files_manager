const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const mime = require('mime-types');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class FilesController {
  static async postUpload(request, response) {
    const files = dbClient.db.collection('files');
    const token = request.headers['x-token'];
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (userId === null) response.status(401).json({ error: 'Unauthorized' });

    const { name } = request.body;
    const { type } = request.body;
    let { parentId } = request.body;
    let { isPublic } = request.body;
    const { data } = request.body;
    let resultObj;

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
      resultObj = await files.insertOne({
        userId: ObjectID(userId),
        name,
        type,
        isPublic,
        parentId: parentId === 0 ? parentId : ObjectID(parentId),
        localPath,
      });
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
    const files = dbClient.db.collection('files');
    const token = request.headers['x-token'];
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (userId === null) return response.status(401).json({ error: 'Unauthorized' });

    const fileId = request.params.id;
    const fileArray = await files.find(
      { userId: ObjectID(userId), _id: ObjectID(fileId) },
    ).toArray();
    if (fileArray.length === 0) return response.status(404).json({ error: 'Not found' });

    const file = fileArray[0];
    return response.json({
      id: file._id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getIndex(request, response) {
    const files = dbClient.db.collection('files');
    const token = request.headers['x-token'];
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (userId === null) response.status(401).json({ error: 'Unauthorized' });

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
    const token = request.headers['x-token'];
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (userId === null) return response.status(401).json({ error: 'Unauthorized' });

    const fileId = request.params.id;
    let fileArray = await files.find(
      { userId: ObjectID(userId), _id: ObjectID(fileId) },
    ).toArray();
    if (fileArray.length === 0) return response.status(404).json({ error: 'Not found' });

    await files.updateOne(
      { userId: ObjectID(userId), _id: ObjectID(fileId) },
      { $set: { isPublic: true } },
    );
    fileArray = await files.find(
      { userId: ObjectID(userId), _id: ObjectID(fileId) },
    ).toArray();
    const file = fileArray[0];

    const returnObj = { id: file._id, ...file };
    delete returnObj._id;
    delete returnObj.localPath;
    return response.json(returnObj);
  }

  static async putUnpublish(request, response) {
    const files = dbClient.db.collection('files');
    const token = request.headers['x-token'];
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (userId === null) response.status(401).json({ error: 'Unauthorized' });

    const fileId = request.params.id;
    let fileArray = await files.find(
      { userId: ObjectID(userId), _id: ObjectID(fileId) },
    ).toArray();
    if (fileArray.length === 0) return response.status(404).json({ error: 'Not found' });

    await files.updateOne(
      { userId: ObjectID(userId), _id: ObjectID(fileId) },
      { $set: { isPublic: false } },
    );
    fileArray = await files.find(
      { userId: ObjectID(userId), _id: ObjectID(fileId) },
    ).toArray();
    const file = fileArray[0];

    const returnObj = { id: file._id, ...file };
    delete returnObj._id;
    delete returnObj.localPath;
    return response.json(returnObj);
  }

  static async getFile(request, response) {
    const files = dbClient.db.collection('files');
    const token = request.headers['x-token'];
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    const fileId = request.params.id;
    const fileArray = await files.find({ _id: ObjectID(fileId) }).toArray();
    if (fileArray.length === 0) return response.status(404).json({ error: 'Not found' });

    const file = fileArray[0];
    if (file.isPublic === false || userId === null) return response.status(404).json({ error: 'Not found' });
    if (file.type === 'folder') return response.status(400).json({ error: 'A folder doesn\'t have content' });
    if (!fs.existsSync(file.localPath)) return response.status(404).json({ error: 'Not found' });

    const mimeType = mime.lookup(file.name);
    response.setHeader('Content-Type', mimeType);
    const data = await fs.promises.readFile(file.localPath);
    return response.end(data);
  }
}

module.exports = FilesController;
