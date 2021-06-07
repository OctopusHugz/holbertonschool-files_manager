import { expect } from 'chai';
import { MongoClient, Db } from 'mongodb';
import dbClient from '../utils/db';

describe('dbClient', () => {
  beforeEach(async () => {
    await dbClient.users.deleteMany({});
    await dbClient.files.deleteMany({});
  });

  afterEach(async () => {
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
    await dbClient.users.insertMany([
      { email: 'me@me.com' },
      { email: 'me2@me.com' },
    ]);
    expect(await dbClient.nbUsers()).to.equal(2);
  });

  it('checks the return of .nbFiles()', async () => {
    await dbClient.files.insertMany([
      { name: 'file 1' },
      { name: 'file 2' },
      { name: 'file 3' },
    ]);
    expect(await dbClient.nbFiles()).to.equal(3);
  });
});
