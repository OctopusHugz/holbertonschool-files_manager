import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import dbClient from '../utils/db';
import app from '../server';

chai.use(chaiHttp);

describe('AppController', () => {
  beforeEach(async () => {
    await dbClient.users.deleteMany({});
    await dbClient.files.deleteMany({});
    await dbClient.users.insertMany([
      { email: 'me@me.com' },
      { email: 'me2@me.com' },
      { email: 'bob@dylan.com', password: '89cad29e3ebc1035b29b1478a8e70854f25fa2b2' },
    ]);
    await dbClient.files.insertMany([
      { name: 'file 1' },
      { name: 'file 2' },
      { name: 'file 3' },
      { name: 'file 4' },
    ]);
  });

  afterEach(async () => {
    await dbClient.users.deleteMany({});
    await dbClient.files.deleteMany({});
  });

  it('GET /status', (done) => {
    chai.request(app)
      .get('/status')
      .end((err, res) => {
        expect(err).to.equal(null);
        expect(res).to.have.status(200);
        expect(res.body).to.deep.equal({ redis: true, db: true });
        done();
      });
  });

  it('GET /stats', (done) => {
    chai.request(app)
      .get('/stats')
      .end(async (err, res) => {
        expect(err).to.equal(null);
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('users');
        expect(res.body).to.have.property('files');
        expect(res.body.users).to.equal(3);
        expect(res.body.files).to.equal(4);
        done();
      });
  });
});
