const { ObjectID } = require('mongodb');
const redisClient = require('./redis');

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

module.exports.getRandomInt = getRandomInt;
module.exports.checkAuth = checkAuth;
module.exports.findFile = findFile;
module.exports.sanitizeReturnObj = sanitizeReturnObj;
