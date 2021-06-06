import { expect } from 'chai';
import { MongoClient, Db } from 'mongodb';
import dbClient from '../utils/db';

describe('dbClient', () => {
  it('checks the properties of dbClient', () => {
    expect(dbClient.host).to.equal(process.env.DB_HOST || 'localhost');
    expect(dbClient.port).to.equal(process.env.DB_PORT || 27017);
    expect(dbClient.dbName).to.equal(process.env.DB_DATABASE || 'files_manager');
    expect(dbClient.client).to.be.instanceOf(MongoClient);
    expect(dbClient.db).to.be.instanceOf(Db);
  });

  it('checks the return of .isAlive()', () => {
    expect(dbClient.isAlive()).to.equal(true);
  });

  it('checks the return of .nbUsers()', async () => {
    const numUsers = await dbClient.db.collection('users').countDocuments();
    expect(await dbClient.nbUsers()).to.equal(numUsers);
  });

  it('checks the return of .nbFiles()', async () => {
    const numFiles = await dbClient.db.collection('files').countDocuments();
    expect(await dbClient.nbFiles()).to.equal(numFiles);
  });
});
