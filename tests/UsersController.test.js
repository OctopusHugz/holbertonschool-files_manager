import crypto from 'crypto';
import { ObjectID } from 'mongodb';
import { expect } from 'chai';
import request from 'request';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import { getRandomInt, credsFromAuthHeaderString, findUserByCreds } from '../utils/helpers';

const randomUserId = getRandomInt(1, 99999999);
const randomPassword = getRandomInt(1, 99999999);

describe('UsersController', () => {
  it('checks the return of postNew with a random new user', (done) => {
    const users = dbClient.db.collection('users');
    const bodyData = {
      email: `testuser${randomUserId}@email.com`,
      password: `${randomPassword}abcde`,
    };
    request.post({
      url: 'http://0.0.0.0:5000/users',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData),
    }, async (error, response, body) => {
      const jBody = JSON.parse(body);
      const userArray = await users.find({
        _id: ObjectID(jBody.id),
        email: bodyData.email,
      }).toArray();
      const user = userArray[0];
      const hashedPassword = crypto.createHash('SHA1').update(bodyData.password).digest('hex');
      expect(response.statusCode).to.equal(201);
      expect(jBody).to.have.property('email');
      expect(jBody).to.have.property('id');
      expect(jBody.email).to.equal(bodyData.email);
      expect(userArray.length).to.be.greaterThan(0);
      expect(user.email).to.equal(bodyData.email);
      expect(user._id.toString()).to.equal(ObjectID(jBody.id).toString());
      expect(user.password).to.equal(hashedPassword);
      done();
    });
  });

  it('checks the return of postNew with user that already exists', (done) => {
    const bodyData = {
      email: `testuser${randomUserId}@email.com`,
      password: `${randomPassword}abcde`,
    };
    request.post({
      url: 'http://0.0.0.0:5000/users',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData),
    }, (error, response, body) => {
      const jBody = JSON.parse(body);
      expect(response.statusCode).to.equal(400);
      expect(jBody).to.deep.equal({ error: 'Already exist' });
      done();
    });
  });

  it('checks the return of postNew with missing email', (done) => {
    const bodyData = {
      password: `${randomPassword}abcde`,
    };
    request.post({
      url: 'http://0.0.0.0:5000/users',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData),
    }, (error, response, body) => {
      const jBody = JSON.parse(body);
      expect(response.statusCode).to.equal(400);
      expect(jBody).to.deep.equal({ error: 'Missing email' });
      done();
    });
  });

  it('checks the return of postNew with missing password', (done) => {
    const bodyData = {
      email: `testuser${randomUserId}@email.com`,
    };
    request.post({
      url: 'http://0.0.0.0:5000/users',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData),
    }, (error, response, body) => {
      const jBody = JSON.parse(body);
      expect(response.statusCode).to.equal(400);
      expect(jBody).to.deep.equal({ error: 'Missing password' });
      done();
    });
  });

  // rewrite using fetch() to avoid callback hell?
  it('checks the return of .getMe() with valid user', (done) => {
    // Authorization: Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=
    // for user 'bob@dylan.com'
    let token;
    const headerData = {
      Authorization: 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=',
    };
    request({
      url: 'http://0.0.0.0:5000/connect',
      headers: headerData,
    }, async (error, response, body) => {
      const jBody = JSON.parse(body);
      const creds = await credsFromAuthHeaderString(headerData.Authorization);
      const user = await findUserByCreds(response, creds.email, creds.password);
      token = jBody.token;
      expect(response.statusCode).to.equal(200);
      expect(jBody).to.have.property('token');
      expect(token.length).to.equal(36);
      expect(await redisClient.get(`auth_${token}`)).to.equal(user._id.toString());

      // GET /users/me with header:
      // X-Token: ${tokenFromGetConnect}
      const tokenHeader = { 'X-Token': token };
      request({
        url: 'http://0.0.0.0:5000/users/me',
        headers: tokenHeader,
      }, async (error, response, body) => {
        const jBody = JSON.parse(body);
        expect(response.statusCode).to.equal(200);
        expect(jBody).to.have.property('id');
        expect(jBody).to.have.property('email');
        expect(jBody.id.length).to.equal(24);
        expect(await redisClient.get(`auth_${token}`)).to.equal(jBody.id);
        expect(jBody.email).to.equal('bob@dylan.com');

        request({
          url: 'http://0.0.0.0:5000/disconnect',
          headers: tokenHeader,
        }, async (error, response, body) => {
          expect(response.statusCode).to.equal(204);
          expect(body).to.equal('');
          expect(await redisClient.get(`auth_${token}`)).to.equal(null);

          request({
            url: 'http://0.0.0.0:5000/users/me',
            headers: tokenHeader,
          }, async (error, response, body) => {
            const jBody = JSON.parse(body);
            expect(response.statusCode).to.equal(401);
            expect(jBody).to.deep.equal({ error: 'Unauthorized' });
            done();
          });
        });
      });
    });
  });

  it('checks the return of .getMe() with invalid user', (done) => {
    const headerData = { 'X-Token': '031bffac-3edc-4e51-aaae-1c121317da8a' };
    request({
      url: 'http://0.0.0.0:5000/users/me',
      headers: headerData,
    }, async (error, response, body) => {
      const jBody = JSON.parse(body);
      expect(response.statusCode).to.equal(401);
      expect(jBody).to.deep.equal({ error: 'Unauthorized' });
      done();
    });
  });
});
