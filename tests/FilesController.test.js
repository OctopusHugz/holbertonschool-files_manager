const { expect } = require('chai');
const { ObjectID } = require('mongodb');
const request = require('request');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const { findUserByCreds, credsFromAuthHeaderString } = require('../utils/helpers');

describe('FilesController', () => {
  it('checks the return of .postUpload() with valid user', (done) => {
    // Authorization: Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=
    // for user 'bob@dylan.com'
    const headerData = {
      Authorization: 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=',
    };
    let token;
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

      const postHeaders = { 'X-Token': token, 'Content-Type': 'application/json' };
      const bodyData = { name: 'myText.txt', type: 'file', data: 'SGVsbG8gV2Vic3RhY2shCg==' };
      request.post({
        url: 'http://0.0.0.0:5000/files',
        headers: postHeaders,
        body: JSON.stringify(bodyData),
      }, async (error, response, body) => {
        const jBody = JSON.parse(body);
        const files = dbClient.db.collection('files');
        const fileArray = await files.find(
          { userId: ObjectID(user._id), _id: ObjectID(jBody.id) },
        ).toArray();
        const file = fileArray[0];
        expect(response.statusCode).to.equal(201);
        expect(jBody.id.length).to.equal(24);
        expect(jBody.userId).to.equal(user._id.toString());
        expect(jBody.name).to.equal('myText.txt');
        expect(jBody.type).to.equal('file');
        expect(jBody.isPublic).to.equal(false);
        expect(jBody.parentId).to.equal(0);
        expect(fileArray.length).to.equal(1);
        expect(file._id.toString()).to.equal(jBody.id);
        expect(file.userId.toString()).to.equal(user._id.toString());
        expect(file.name).to.equal('myText.txt');
        expect(file.type).to.equal('file');
        expect(file.isPublic).to.equal(false);
        expect(file.parentId).to.equal(0);
        done();
      });
    });
  });

  it('checks the return of .postUpload() with valid user, missing name in request body', (done) => {
    // Authorization: Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=
    // for user 'bob@dylan.com'
    const headerData = {
      Authorization: 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=',
    };
    let token;
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

      const postHeaders = { 'X-Token': token, 'Content-Type': 'application/json' };
      const bodyData = { type: 'file', data: 'SGVsbG8gV2Vic3RhY2shCg==' };
      request.post({
        url: 'http://0.0.0.0:5000/files',
        headers: postHeaders,
        body: JSON.stringify(bodyData),
      }, async (error, response, body) => {
        const jBody = JSON.parse(body);
        expect(response.statusCode).to.equal(400);
        expect(jBody).to.deep.equal({ error: 'Missing name' });
        done();
      });
    });
  });

  it('checks the return of .postUpload() with valid user, missing type in request body', (done) => {
    // Authorization: Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=
    // for user 'bob@dylan.com'
    const headerData = {
      Authorization: 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=',
    };
    let token;
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

      const postHeaders = { 'X-Token': token, 'Content-Type': 'application/json' };
      const bodyData = { name: 'myText.txt', data: 'SGVsbG8gV2Vic3RhY2shCg==' };
      request.post({
        url: 'http://0.0.0.0:5000/files',
        headers: postHeaders,
        body: JSON.stringify(bodyData),
      }, async (error, response, body) => {
        const jBody = JSON.parse(body);
        expect(response.statusCode).to.equal(400);
        expect(jBody).to.deep.equal({ error: 'Missing type' });
        done();
      });
    });
  });

  it('checks the return of .postUpload() with valid user, missing data in request body and type != folder', (done) => {
    // Authorization: Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=
    // for user 'bob@dylan.com'
    const headerData = {
      Authorization: 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=',
    };
    let token;
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

      const postHeaders = { 'X-Token': token, 'Content-Type': 'application/json' };
      const bodyData = { name: 'myText.txt', type: 'file' };
      request.post({
        url: 'http://0.0.0.0:5000/files',
        headers: postHeaders,
        body: JSON.stringify(bodyData),
      }, async (error, response, body) => {
        const jBody = JSON.parse(body);
        expect(response.statusCode).to.equal(400);
        expect(jBody).to.deep.equal({ error: 'Missing data' });
        done();
      });
    });
  });

  it('checks the return of .postUpload() with valid user, parentId is set, parentId file exists and type == folder', (done) => {
    // Authorization: Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=
    // for user 'bob@dylan.com'
    const headerData = {
      Authorization: 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=',
    };
    let token;
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

      const postHeaders = { 'X-Token': token, 'Content-Type': 'application/json' };
      const bodyData = { name: 'images', type: 'folder' };
      request.post({
        url: 'http://0.0.0.0:5000/files',
        headers: postHeaders,
        body: JSON.stringify(bodyData),
      }, async (error, response, body) => {
        const jBody = JSON.parse(body);
        const parentId = jBody.id;
        const files = dbClient.db.collection('files');
        const fileArray = await files.find(
          { userId: ObjectID(user._id), _id: ObjectID(jBody.id) },
        ).toArray();
        const file = fileArray[0];
        expect(response.statusCode).to.equal(201);
        expect(jBody.id.length).to.equal(24);
        expect(jBody.userId).to.equal(user._id.toString());
        expect(jBody.name).to.equal('images');
        expect(jBody.type).to.equal('folder');
        expect(jBody.isPublic).to.equal(false);
        expect(jBody.parentId).to.equal(0);
        expect(fileArray.length).to.equal(1);
        expect(file._id.toString()).to.equal(jBody.id);
        expect(file.userId.toString()).to.equal(user._id.toString());
        expect(file.name).to.equal('images');
        expect(file.type).to.equal('folder');
        expect(file.isPublic).to.equal(false);
        expect(file.parentId).to.equal(0);

        const postHeaders = { 'X-Token': token, 'Content-Type': 'application/json' };
        const bodyData = {
          name: 'myText.txt', type: 'file', data: 'SGVsbG8gV2Vic3RhY2shCg==', parentId,
        };
        request.post({
          url: 'http://0.0.0.0:5000/files',
          headers: postHeaders,
          body: JSON.stringify(bodyData),
        }, async (error, response, body) => {
          const jBody = JSON.parse(body);
          const files = dbClient.db.collection('files');
          const fileArray = await files.find(
            { userId: ObjectID(user._id), _id: ObjectID(jBody.id) },
          ).toArray();
          const file = fileArray[0];
          expect(response.statusCode).to.equal(201);
          expect(jBody.id.length).to.equal(24);
          expect(jBody.userId).to.equal(user._id.toString());
          expect(jBody.name).to.equal('myText.txt');
          expect(jBody.type).to.equal('file');
          expect(jBody.isPublic).to.equal(false);
          expect(jBody.parentId).to.equal(parentId);
          expect(fileArray.length).to.equal(1);
          expect(file._id.toString()).to.equal(jBody.id);
          expect(file.userId.toString()).to.equal(user._id.toString());
          expect(file.name).to.equal('myText.txt');
          expect(file.type).to.equal('file');
          expect(file.isPublic).to.equal(false);
          expect(file.parentId.toString()).to.equal(parentId);
          done();
        });
      });
    });
  });

  it('checks the return of .postUpload() with valid user, parentId is set, parentId file doesn\'t exist', (done) => {
    // Authorization: Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=
    // for user 'bob@dylan.com'
    const headerData = {
      Authorization: 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=',
    };
    let token;
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
      const parentId = '5f1e881cc7ba06511e683b23';

      const postHeaders = { 'X-Token': token, 'Content-Type': 'application/json' };
      const bodyData = {
        name: 'myText.txt', type: 'file', data: 'SGVsbG8gV2Vic3RhY2shCg==', parentId,
      };
      request.post({
        url: 'http://0.0.0.0:5000/files',
        headers: postHeaders,
        body: JSON.stringify(bodyData),
      }, async (error, response, body) => {
        const jBody = JSON.parse(body);
        expect(response.statusCode).to.equal(400);
        expect(jBody).to.deep.equal({ error: 'Parent not found' });
        done();
      });
    });
  });

  it('checks the return of .postUpload() with valid user, parentId is set, parentId file exists and type != folder', (done) => {
    // Authorization: Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=
    // for user 'bob@dylan.com'
    const headerData = {
      Authorization: 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=',
    };
    let token;
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

      const postHeaders = { 'X-Token': token, 'Content-Type': 'application/json' };
      const bodyData = { name: 'myText.txt', type: 'file', data: 'SGVsbG8gV2Vic3RhY2shCg==' };
      request.post({
        url: 'http://0.0.0.0:5000/files',
        headers: postHeaders,
        body: JSON.stringify(bodyData),
      }, async (error, response, body) => {
        const jBody = JSON.parse(body);
        const parentId = jBody.id;
        const files = dbClient.db.collection('files');
        const fileArray = await files.find(
          { userId: ObjectID(user._id), _id: ObjectID(jBody.id) },
        ).toArray();
        const file = fileArray[0];
        expect(response.statusCode).to.equal(201);
        expect(jBody.id.length).to.equal(24);
        expect(jBody.userId).to.equal(user._id.toString());
        expect(jBody.name).to.equal('myText.txt');
        expect(jBody.type).to.equal('file');
        expect(jBody.isPublic).to.equal(false);
        expect(jBody.parentId).to.equal(0);
        expect(fileArray.length).to.equal(1);
        expect(file._id.toString()).to.equal(jBody.id);
        expect(file.userId.toString()).to.equal(user._id.toString());
        expect(file.name).to.equal('myText.txt');
        expect(file.type).to.equal('file');
        expect(file.isPublic).to.equal(false);
        expect(file.parentId).to.equal(0);

        const postHeaders = { 'X-Token': token, 'Content-Type': 'application/json' };
        const bodyData = {
          name: 'myText2.txt', type: 'file', data: 'SGVsbG8gV2Vic3RhY2shCg==', parentId,
        };
        request.post({
          url: 'http://0.0.0.0:5000/files',
          headers: postHeaders,
          body: JSON.stringify(bodyData),
        }, async (error, response, body) => {
          const jBody = JSON.parse(body);
          const files = dbClient.db.collection('files');
          const fileArray = await files.find(
            { userId: ObjectID(user._id), _id: ObjectID(jBody.id) },
          ).toArray();
          expect(response.statusCode).to.equal(400);
          expect(fileArray.length).to.equal(0);
          expect(jBody).to.deep.equal({ error: 'Parent is not a folder' });
          done();
        });
      });
    });
  });
});
