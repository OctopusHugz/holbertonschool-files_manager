const Queue = require('bull');
const { ObjectID } = require('mongodb');
const fs = require('fs');
const imageThumbnail = require('image-thumbnail');
const dbClient = require('./utils/db');

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job, done) => {
  if (!job.data.fileId) throw new Error('Missing fileId');
  if (!job.data.userId) throw new Error('Missing userId');

  const files = dbClient.db.collection('files');
  const fileArray = await files.find(
    { userId: ObjectID(job.data.userId), _id: ObjectID(job.data.fileId) },
  ).toArray();
  if (fileArray.length === 0) throw new Error('File not found');

  const file = fileArray[0];
  try {
    const thumbnail100 = await imageThumbnail(`${file.name}`, { width: 100, responseType: 'base64' });
    const thumbnail250 = await imageThumbnail(`${file.name}`, { width: 250, responseType: 'base64' });
    const thumbnail500 = await imageThumbnail(`${file.name}`, { width: 500, responseType: 'base64' });
    await fs.promises.writeFile(`${file.localPath}_100`, thumbnail100, 'base64');
    await fs.promises.writeFile(`${file.localPath}_250`, thumbnail250, 'base64');
    await fs.promises.writeFile(`${file.localPath}_500`, thumbnail500, 'base64');
  } catch (error) {
    console.error(error);
  }

  done();
});
