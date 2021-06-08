import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import { ObjectID } from 'mongodb';
import dbClient from '../utils/db';
import { findUserByCreds, credsFromAuthHeaderString } from '../utils/helpers';
import app from '../server';

chai.use(chaiHttp);
const fPath = process.env.FOLDER_PATH || '/tmp/files_manager';
let insertedFileId;
let insertedUserId;

describe('FilesController', () => {
  beforeEach(async () => {
    await dbClient.users.deleteMany({});
    await dbClient.files.deleteMany({});
    const userObj = await dbClient.users.insertOne({ email: 'bob@dylan.com', password: '89cad29e3ebc1035b29b1478a8e70854f25fa2b2' });
    const resultObj = await dbClient.files.insertOne({
      name: 'testFile.txt',
      type: 'file',
      isPublic: false,
      parentId: 0,
    });
    insertedFileId = resultObj.ops[0]._id.toString();
    insertedUserId = userObj.ops[0]._id.toString();
  });

  afterEach(async () => {
    await dbClient.users.deleteMany({});
    await dbClient.files.deleteMany({});
  });

  it('POST /files with valid user', (done) => {
    const headerData = {
      Authorization: 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=',
    };
    chai.request(app)
      .get('/connect')
      .set(headerData)
      .then(async (res) => {
        const creds = await credsFromAuthHeaderString(headerData.Authorization);
        const user = await findUserByCreds(creds.email, creds.password);
        const { token } = res.body;
        expect(res).to.have.status(200);
        const postHeaders = { 'X-Token': token, 'Content-Type': 'application/json' };
        const bodyData = { name: 'myText.txt', type: 'file', data: 'SGVsbG8gV2Vic3RhY2shCg==' };
        chai.request(app)
          .post('/files')
          .set(postHeaders)
          .send(bodyData)
          .then(async (res) => {
            const files = dbClient.db.collection('files');
            const fileArray = await files.find(
              { userId: ObjectID(user._id), _id: ObjectID(res.body.id) },
            ).toArray();
            const file = fileArray[0];
            expect(res).to.have.status(201);
            expect(res.body.id.length).to.equal(24);
            expect(res.body.userId).to.equal(user._id.toString());
            expect(res.body.name).to.equal('myText.txt');
            expect(res.body.type).to.equal('file');
            expect(res.body.isPublic).to.equal(false);
            expect(res.body.parentId).to.equal(0);
            expect(fileArray.length).to.equal(1);
            expect(file._id.toString()).to.equal(res.body.id);
            expect(file.userId.toString()).to.equal(user._id.toString());
            expect(file.name).to.equal('myText.txt');
            expect(file.type).to.equal('file');
            expect(file.isPublic).to.equal(false);
            expect(file.parentId).to.equal(0);
            expect(file).to.have.property('localPath');
            expect(file.localPath).to.contain(fPath);
            done();
          });
      });
  });

  it('POST /files with valid user, missing name in request body', (done) => {
    const headerData = {
      Authorization: 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=',
    };
    chai.request(app)
      .get('/connect')
      .set(headerData)
      .then(async (res) => {
        const { token } = res.body;
        expect(res).to.have.status(200);
        const postHeaders = { 'X-Token': token, 'Content-Type': 'application/json' };
        const bodyData = { type: 'file', data: 'SGVsbG8gV2Vic3RhY2shCg==' };
        chai.request(app)
          .post('/files')
          .set(postHeaders)
          .send(bodyData)
          .then((res) => {
            expect(res).to.have.status(400);
            expect(res.body).to.deep.equal({ error: 'Missing name' });
            done();
          });
      });
  });

  it('POST /files with valid user, missing type in request body', (done) => {
    const headerData = {
      Authorization: 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=',
    };
    chai.request(app)
      .get('/connect')
      .set(headerData)
      .then(async (res) => {
        const { token } = res.body;
        expect(res).to.have.status(200);
        const postHeaders = { 'X-Token': token, 'Content-Type': 'application/json' };
        const bodyData = { name: 'myText.txt', data: 'SGVsbG8gV2Vic3RhY2shCg==' };
        chai.request(app)
          .post('/files')
          .set(postHeaders)
          .send(bodyData)
          .then((res) => {
            expect(res).to.have.status(400);
            expect(res.body).to.deep.equal({ error: 'Missing type' });
            done();
          });
      });
  });

  it('POST /files with valid user, missing data in request body and type != folder', (done) => {
    const headerData = {
      Authorization: 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=',
    };
    chai.request(app)
      .get('/connect')
      .set(headerData)
      .then(async (res) => {
        const { token } = res.body;
        expect(res).to.have.status(200);
        const postHeaders = { 'X-Token': token, 'Content-Type': 'application/json' };
        const bodyData = { name: 'myText.txt', type: 'file' };
        chai.request(app)
          .post('/files')
          .set(postHeaders)
          .send(bodyData)
          .then((res) => {
            expect(res).to.have.status(400);
            expect(res.body).to.deep.equal({ error: 'Missing data' });
            done();
          });
      });
  });

  it('POST /files with valid user, parentId is set, parentId file exists and type == folder', (done) => {
    const headerData = {
      Authorization: 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=',
    };
    chai.request(app)
      .get('/connect')
      .set(headerData)
      .then(async (res) => {
        const creds = await credsFromAuthHeaderString(headerData.Authorization);
        const user = await findUserByCreds(creds.email, creds.password);
        const { token } = res.body;
        expect(res).to.have.status(200);
        const postHeaders = { 'X-Token': token, 'Content-Type': 'application/json' };
        const bodyData = { name: 'images', type: 'folder' };
        chai.request(app)
          .post('/files')
          .set(postHeaders)
          .send(bodyData)
          .then(async (res) => {
            const parentId = res.body.id;
            const fileArray = await dbClient.files.find(
              { userId: ObjectID(user._id), _id: ObjectID(res.body.id) },
            ).toArray();
            const file = fileArray[0];
            expect(res.statusCode).to.equal(201);
            expect(res.body.id.length).to.equal(24);
            expect(res.body.userId).to.equal(user._id.toString());
            expect(res.body.name).to.equal('images');
            expect(res.body.type).to.equal('folder');
            expect(res.body.isPublic).to.equal(false);
            expect(res.body.parentId).to.equal(0);
            expect(fileArray.length).to.equal(1);
            expect(file._id.toString()).to.equal(res.body.id);
            expect(file.userId.toString()).to.equal(user._id.toString());
            expect(file.name).to.equal('images');
            expect(file.type).to.equal('folder');
            expect(file.isPublic).to.equal(false);
            expect(file.parentId).to.equal(0);

            const bodyData = {
              name: 'myText.txt', type: 'file', data: 'SGVsbG8gV2Vic3RhY2shCg==', parentId,
            };
            chai.request(app)
              .post('/files')
              .set(postHeaders)
              .send(bodyData)
              .then(async (res) => {
                const fileArray = await dbClient.files.find(
                  { userId: ObjectID(user._id), _id: ObjectID(res.body.id) },
                ).toArray();
                const file = fileArray[0];
                expect(res.statusCode).to.equal(201);
                expect(res.body.id.length).to.equal(24);
                expect(res.body.userId).to.equal(user._id.toString());
                expect(res.body.name).to.equal('myText.txt');
                expect(res.body.type).to.equal('file');
                expect(res.body.isPublic).to.equal(false);
                expect(res.body.parentId).to.equal(parentId);
                expect(fileArray.length).to.equal(1);
                expect(file._id.toString()).to.equal(res.body.id);
                expect(file.userId.toString()).to.equal(user._id.toString());
                expect(file.name).to.equal('myText.txt');
                expect(file.type).to.equal('file');
                expect(file.isPublic).to.equal(false);
                expect(file.parentId.toString()).to.equal(parentId);
                expect(file).to.have.property('localPath');
                expect(file.localPath).to.contain(fPath);
                done();
              });
          });
      });
  });

  it('POST /files with valid user, parentId is set, parentId file doesn\'t exist', (done) => {
    const headerData = {
      Authorization: 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=',
    };
    chai.request(app)
      .get('/connect')
      .set(headerData)
      .then(async (res) => {
        const { token } = res.body;
        expect(res).to.have.status(200);
        const parentId = '5f1e881cc7ba06511e683b23';
        const postHeaders = { 'X-Token': token, 'Content-Type': 'application/json' };
        const bodyData = {
          name: 'myText.txt', type: 'file', data: 'SGVsbG8gV2Vic3RhY2shCg==', parentId,
        };
        chai.request(app)
          .post('/files')
          .set(postHeaders)
          .send(bodyData)
          .then(async (res) => {
            expect(res).to.have.status(400);
            expect(res.body).to.deep.equal({ error: 'Parent not found' });
            done();
          });
      });
  });

  it('POST /files with valid user, parentId is set, parentId file exists and type != folder', (done) => {
    const headerData = {
      Authorization: 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=',
    };
    chai.request(app)
      .get('/connect')
      .set(headerData)
      .then(async (res) => {
        const creds = await credsFromAuthHeaderString(headerData.Authorization);
        const user = await findUserByCreds(creds.email, creds.password);
        const { token } = res.body;
        expect(res).to.have.status(200);
        const postHeaders = { 'X-Token': token, 'Content-Type': 'application/json' };
        const bodyData = { name: 'myText.txt', type: 'file', data: 'SGVsbG8gV2Vic3RhY2shCg==' };
        chai.request(app)
          .post('/files')
          .set(postHeaders)
          .send(bodyData)
          .then(async (res) => {
            const parentId = res.body.id;
            const fileArray = await dbClient.files.find(
              { userId: ObjectID(user._id), _id: ObjectID(res.body.id) },
            ).toArray();
            const file = fileArray[0];
            expect(res.statusCode).to.equal(201);
            expect(res.body.id.length).to.equal(24);
            expect(res.body.userId).to.equal(user._id.toString());
            expect(res.body.name).to.equal('myText.txt');
            expect(res.body.type).to.equal('file');
            expect(res.body.isPublic).to.equal(false);
            expect(res.body.parentId).to.equal(0);
            expect(fileArray.length).to.equal(1);
            expect(file._id.toString()).to.equal(res.body.id);
            expect(file.userId.toString()).to.equal(user._id.toString());
            expect(file.name).to.equal('myText.txt');
            expect(file.type).to.equal('file');
            expect(file.isPublic).to.equal(false);
            expect(file.parentId).to.equal(0);

            const bodyData = {
              name: 'myText.txt', type: 'file', data: 'SGVsbG8gV2Vic3RhY2shCg==', parentId,
            };
            chai.request(app)
              .post('/files')
              .set(postHeaders)
              .send(bodyData)
              .then(async (res) => {
                const fileArray = await dbClient.files.find(
                  { userId: ObjectID(user._id), _id: ObjectID(res.body.id) },
                ).toArray();
                expect(res.statusCode).to.equal(400);
                expect(fileArray.length).to.equal(0);
                expect(res.body).to.deep.equal({ error: 'Parent is not a folder' });
                done();
              });
          });
      });
  });

  it('GET /files/:id with valid user, file linked to userId', (done) => {
    const headerData = {
      Authorization: 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=',
    };
    chai.request(app)
      .get('/connect')
      .set(headerData)
      .then((res) => {
        const { token } = res.body;
        const postHeaders = { 'X-Token': token };

        chai.request(app)
          .get(`/files/${insertedFileId}`)
          .set(postHeaders)
          .then((res) => {
            expect(res).to.have.status(200);
            expect(res.body.id).to.equal(insertedFileId);
            expect(res.body.userId).to.equal(insertedUserId);
            expect(res.body.name).to.equal('testFile.txt');
            expect(res.body.type).to.equal('file');
            expect(res.body.isPublic).to.be.false;
            expect(res.body.parentId).to.equal(0);
            done();
          });
      });
  });

  it.skip('GET /files/:id with invalid user', () => {

  });

  it.skip('GET /files/:id with valid user, no file linked to userId', () => {

  });

  it.skip('GET /files with valid user, parentId linked to user folder', () => {

  });

  it.skip('GET /files with valid user, parentId not linked to user folder', () => {

  });

  it.skip('GET /files with valid user, parentId == 0', () => {

  });

  it.skip('GET /files with valid user, parentId linked to user folder, with pagination', () => {

  });

  it.skip('GET /files with valid user, parentId == 0, with pagination', () => {

  });

  it.skip('GET /files with invalid user', () => {

  });
});
