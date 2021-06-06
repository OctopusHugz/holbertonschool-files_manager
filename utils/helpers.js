import crypto from 'crypto';
import { ObjectID } from 'mongodb';
import fs from 'fs';
import mime from 'mime-types';
import redisClient from './redis';
import dbClient from './db';

function getRandomInt(min, max) {
  const minCeil = Math.ceil(min);
  const maxFloor = Math.floor(max);
  return Math.floor(Math.random() * (maxFloor - minCeil) + minCeil);
}

async function checkAuth(request, response) {
  const token = request.headers['x-token'];
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);
  if (userId === null) response.status(401).json({ error: 'Unauthorized' });
  return userId;
}

async function findFile(request, response, files, userId) {
  const fileId = request.params.id;
  const fileArray = await files.find(
    { userId: ObjectID(userId), _id: ObjectID(fileId) },
  ).toArray();
  if (fileArray.length === 0) return response.status(404).json({ error: 'Not found' });
  return fileArray[0];
}

async function sanitizeReturnObj(response, file, userId) {
  return response.json({
    id: file._id,
    userId,
    name: file.name,
    type: file.type,
    isPublic: file.isPublic,
    parentId: file.parentId,
  });
}

async function findAndUpdateFile(request, response, files, userId, isPublic) {
  const fileId = request.params.id;
  await findFile(request, response, files, userId);
  await files.updateOne(
    { userId: ObjectID(userId), _id: ObjectID(fileId) },
    { $set: { isPublic } },
  );
  return findFile(request, response, files, userId);
}

async function aggregateAndPaginate(response, files, page, searcher) {
  const folderArray = await files.aggregate([
    { $match: { searcher: ObjectID(searcher) } },
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

async function findUserById(userId) {
  const users = dbClient.db.collection('users');
  const userExistsArray = await users.find(`ObjectId("${userId}")`).toArray();
  return userExistsArray[0];
}

async function checkAuthReturnKey(request, response) {
  const token = request.headers['x-token'];
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);
  if (userId === null) response.status(401).json({ error: 'Unauthorized' });
  return key;
}

async function findUserByCreds(response, email, hashedPassword) {
  const users = dbClient.db.collection('users');
  const userExistsArray = await users.find({ email, password: hashedPassword }).toArray();
  if (userExistsArray.length === 0) response.status(401).json({ error: 'Unauthorized' });
  return userExistsArray[0];
}

async function credsFromBasicAuth(request) {
  const fullAuthHeader = request.headers.authorization;
  const b64AuthHeader = fullAuthHeader.slice(6);
  const userCreds = Buffer.from(b64AuthHeader, 'base64').toString();
  const email = userCreds.split(':')[0];
  const password = userCreds.split(':')[1];
  const hashedPassword = crypto.createHash('SHA1').update(password).digest('hex');
  return { email, password: hashedPassword };
}

async function checkFileAndReadContents(response, file, token, userId, size) {
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

async function userInputValidation(response, email, password) {
  if (!email) {
    response.statusCode = 400;
    return response.json({ error: 'Missing email' });
  }
  if (!password) {
    response.statusCode = 400;
    return response.json({ error: 'Missing password' });
  }

  const users = dbClient.db.collection('users');
  const userExistsArray = await users.find({ email }).toArray();
  if (userExistsArray.length > 0) {
    response.statusCode = 400;
    return response.json({ error: 'Already exist' });
  }

  const hashedPassword = crypto.createHash('SHA1').update(password).digest('hex');
  return hashedPassword;
}

async function credsFromAuthHeaderString(fullAuthHeader) {
  const b64AuthHeader = fullAuthHeader.slice(6);
  const userCreds = Buffer.from(b64AuthHeader, 'base64').toString();
  const email = userCreds.split(':')[0];
  const password = userCreds.split(':')[1];
  const hashedPassword = crypto.createHash('SHA1').update(password).digest('hex');
  return { email, password: hashedPassword };
}

export default {
  getRandomInt,
  checkAuth,
  findFile,
  sanitizeReturnObj,
  findAndUpdateFile,
  aggregateAndPaginate,
  findUserById,
  checkAuthReturnKey,
  findUserByCreds,
  credsFromBasicAuth,
  checkFileAndReadContents,
  userInputValidation,
  credsFromAuthHeaderString,
};
