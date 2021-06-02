const { expect } = require('chai');
const request = require('request');
const dbClient = require('../utils/db');

describe('AppController.getStatus', () => {
  it('checks the return of getStatus', (done) => {
    request('http://0.0.0.0:5000/status', (error, response, body) => {
      expect(response.statusCode).to.equal(200);
      expect(JSON.parse(body)).to.deep.equal({ redis: true, db: true });
      done();
    });
  });
});

describe('AppController.getStats', () => {
  it('checks the return of getStats', (done) => {
    request('http://0.0.0.0:5000/stats', async (error, response, body) => {
      const jBody = JSON.parse(body);
      expect(response.statusCode).to.equal(200);
      expect(jBody).to.have.property('users');
      expect(jBody).to.have.property('files');
      expect(jBody.users).to.equal(await dbClient.nbUsers());
      expect(jBody.files).to.equal(await dbClient.nbFiles());
      done();
    });
  });
});
