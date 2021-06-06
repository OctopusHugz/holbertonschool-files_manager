import { expect } from 'chai';
import { MongoClient, Db } from 'mongodb';
import dbClient from '../utils/db';

describe('dbClient', () => {
  before(async () => {
    await dbClient.connectToClient();
    await dbClient.users.deleteMany({});
    await dbClient.files.deleteMany({});
  });

  after(async () => {
    await dbClient.users.deleteMany({});
    await dbClient.files.deleteMany({});
  });

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
    expect(dbClient.isAlive()).to.equal(true);
    await dbClient.users.insertOne({ email: 'me-0@me.com' });
    await dbClient.users.insertOne({ email: 'me-1@me.com' });
    await dbClient.users.insertOne({ email: 'me-2@me.com' });
    await dbClient.users.insertOne({ email: 'me-3@me.com' });
    expect(await dbClient.nbUsers()).to.equal(4);
  });

  it('checks the return of .nbFiles()', async () => {
    expect(dbClient.isAlive()).to.equal(true);
    await dbClient.files.insertOne({ name: 'file0' });
    await dbClient.files.insertOne({ name: 'file1' });
    await dbClient.files.insertOne({ name: 'file2' });
    await dbClient.files.insertOne({ name: 'file3' });
    expect(await dbClient.nbFiles()).to.equal(4);
  });
});
