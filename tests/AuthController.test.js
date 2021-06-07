import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import app from '../server';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import { findUserByCreds, credsFromAuthHeaderString } from '../utils/helpers';

chai.use(chaiHttp);

describe('AuthController', () => {
  beforeEach(async () => {
    await dbClient.users.deleteMany({});
    await dbClient.files.deleteMany({});
    await dbClient.users.insertOne({ email: 'bob@dylan.com', password: '89cad29e3ebc1035b29b1478a8e70854f25fa2b2' });
    // Authorization: Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=
    // for user 'bob@dylan.com'
  });

  afterEach(async () => {
    await dbClient.users.deleteMany({});
    await dbClient.files.deleteMany({});
  });

  it('GET /connect with valid user', async () => {
    const headerData = {
      Authorization: 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=',
    };
    const res = await chai.request(app).get('/connect').set(headerData).catch(console.error);
    const creds = await credsFromAuthHeaderString(headerData.Authorization);
    const user = await findUserByCreds(creds.email, creds.password);
    const { token } = res.body;
    expect(res).to.have.status(200);
    expect(res.body).to.have.property('token');
    expect(token.length).to.equal(36);
    expect(await redisClient.get(`auth_${token}`)).to.equal(user._id.toString());
  });

  it('GET /connect with invalid user', async () => {
    const headerData = {
      Authorization: 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIchop=',
    };
    const res = await chai.request(app).get('/connect').set(headerData).catch(console.error);
    expect(res).to.have.status(401);
    expect(res.body).to.deep.equal({ error: 'Unauthorized' });
  });

  it('GET /connect with invalid auth', async () => {
    const headerData = {
      Authorization: 'hello friend',
    };
    const res = await chai.request(app).get('/connect').set(headerData).catch(console.error);
    expect(res).to.have.status(401);
    expect(res.body).to.deep.equal({ error: 'Unauthorized' });
  });

  it('GET /disconnect with valid user', async () => {
    const authHeaderData = {
      Authorization: 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=',
    };
    const connectRes = await chai.request(app).get('/connect').set(authHeaderData).catch(console.error);
    const { token } = connectRes.body;
    const headerData = { 'X-Token': token };
    const disconnectRes = await chai.request(app).get('/disconnect').set(headerData).catch(console.error);
    expect(disconnectRes).to.have.status(204);
    expect(await redisClient.get(`auth_${token}`)).to.equal(null);
  });

  it('GET /disconnect with invalid user', async () => {
    const headerData = { 'X-Token': '031bffac-3edc-4e51-aaae-1c121317da8a' };
    const res = await chai.request(app).get('/disconnect').set(headerData).catch(console.error);
    expect(res).to.have.status(401);
    expect(res.body).to.deep.equal({ error: 'Unauthorized' });
  });
});
