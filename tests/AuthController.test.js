const { expect } = require('chai');
const request = require('request');
const redisClient = require('../utils/redis');
const { findUserByCreds, credsFromAuthHeaderString } = require('../utils/helpers');

let token;

describe('AuthController', () => {
  it('checks the return of .getConnect() with valid user', (done) => {
    // Authorization: Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=
    // for user 'bob@dylan.com'
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
      done();
    });
  });

  it('checks the return of .getConnect() with invalid user', (done) => {
    const headerData = {
      Authorization: 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIchop=',
    };
    request({
      url: 'http://0.0.0.0:5000/connect',
      headers: headerData,
    }, async (error, response, body) => {
      const jBody = JSON.parse(body);
      expect(response.statusCode).to.equal(401);
      expect(jBody).to.deep.equal({ error: 'Unauthorized' });
      done();
    });
  });

  it('checks the return of .getDisconnect() with valid user', (done) => {
    const headerData = { 'X-Token': token };
    request({
      url: 'http://0.0.0.0:5000/disconnect',
      headers: headerData,
    }, async (error, response, body) => {
      expect(response.statusCode).to.equal(204);
      expect(body).to.equal('');
      expect(await redisClient.get(`auth_${token}`)).to.equal(null);
      done();
    });
  });

  it('checks the return of .getDisconnect() with invalid user', (done) => {
    const headerData = { 'X-Token': '031bffac-3edc-4e51-aaae-1c121317da8a' };
    request({
      url: 'http://0.0.0.0:5000/disconnect',
      headers: headerData,
    }, async (error, response, body) => {
      const jBody = JSON.parse(body);
      expect(response.statusCode).to.equal(401);
      expect(jBody).to.deep.equal({ error: 'Unauthorized' });
      done();
    });
  });
});
