const crypto = require('crypto');
const { ObjectID } = require('mongodb');
const { expect } = require('chai');
const request = require('request');
const dbClient = require('../utils/db');

const { getRandomInt } = require('../utils/helpers');

const randomUserId = getRandomInt(1, 99999999);
const randomPassword = getRandomInt(1, 99999999);

describe('UserController.postNew', () => {
  it('checks the return of postNew with a random new user', (done) => {
    // Below code is possible fix to timeout of dbClient,
    // but search for more robust fix

    // const dbConnected = dbClient.isAlive();
    // while (!dbConnected) {
    //   console.log('Trying to reconnect to dbClient!');
    //   dbConnected = dbClient.isAlive();
    // }
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
});
