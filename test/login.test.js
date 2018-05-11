'use strict';
const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const {TEST_MONGODB_URI, JWT_SECRET} = require('../config');

const User = require('../models/user');

const expect = chai.expect;
chai.use(chaiHttp);

describe('Noteful API - Login', function(){
  const fullname = 'Example User';
  const username = 'exampleUser';
  const password = 'password';

  before(function(){
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return User.hashPassword(password)
      .then(digest => User.create({ fullname, username, password: digest }));
  });

  afterEach(function(){
    return mongoose.connection.db.dropDatabase();
  });

  after(function(){
    return mongoose.disconnect();
  });

  it('Should return a valid auth token', function(){
    return chai.request(app)
      .post('/api/login')
      .send({username, password})
      .then(res => {
        expect(res).to.have.status(200);
        expect(res.body).to.be.an('object');
        expect(res.body.authToken).to.be.a('string');

        const payload = jwt.verify(res.body.authToken, JWT_SECRET);

        expect(payload.user).to.not.have.property('password');
        expect(payload.user.username).to.equal(username);
        expect(payload.user.fullname).to.equal(fullname);
      });
  });

  it('Should reject requests with no credentials', function(){
    return chai.request(app)
      .post('/api/login')
      .send({})
      .then(res => {
        expect(res).to.have.status(400);
        expect(res).to.be.an('object');
        expect(res.body.message).to.equal('Bad Request');
        expect(res.body.authToken).to.equal(undefined);

      });
  });
  it('Should reject requests with incorrect usernames', function(){
    return chai.request(app)
      .post('/api/login')
      .send({username: 'funkypickle', password})
      .then(res => {
        expect(res).to.have.status(401);
        expect(res).to.be.an('object');
        expect(res.body.message).to.equal('Unauthorized');
        expect(res.body.authToken).to.equal(undefined);
      });
  });
  it('Should reject requests with incorrect passwords', function(){
    return chai.request(app)
      .post('/api/login')
      .send({username, password: 'notCoolPass'})
      .then(res => {
        expect(res).to.have.status(401);
        expect(res).to.be.an('object');
        expect(res.body.message).to.equal('Unauthorized');
        expect(res.body.authToken).to.equal(undefined);
      });
  });

  describe('/api/refresh', function(){
    it('should return a valid token with the newer expiry date', function(){
      const user = {username, fullname};
      const token = jwt.sign({user}, JWT_SECRET, {subject: username, expiresIn: '1m'});
      const decoded = jwt.decode(token);

      return chai.request(app)
        .post('/api/refresh')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('object');
          const authToken = res.body.authToken;
          expect(authToken).to.be.a('string');

          const payload = jwt.verify(authToken, JWT_SECRET);
          expect(payload.user).to.deep.equal({username, fullname});
          expect(payload.exp).to.be.greaterThan(decoded.exp);
        });
    });

    it('should reject requests with no credentials', function(){
      const user = {};
      const token = jwt.sign(user, JWT_SECRET, {subject: username, expiresIn:'1m'});
      const decoded = jwt.decode(token);
  
      return chai.request(app)
        .post('/api/refresh')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(401);
          expect(res.body).to.be.an('object');
          expect(res.body.message).to.equal('Unauthorized');        
        });
    });
  
    it('should reject requests with an invalid token', function(){
      const user = {username, password};
      const token = jwt.sign(user, 'isidsi', {subject: username, expiresIn: '1m'});
  
      return chai.request(app)
        .post('/api/refresh')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(401);
          expect(res.body.message).to.equal('Unauthorized');
          expect(res.body).to.be.an('object');
        });
    });
  
    it('should reject requests with an expired token',function(){
      const user = {username, password};
      const token = jwt.sign(user, JWT_SECRET, {subject: username, expiresIn: 0});
  
      return chai.request(app)
        .post('/api/login')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('Bad Request');
          expect(res.body).to.be.an('object');
        });
    });

  });
});

