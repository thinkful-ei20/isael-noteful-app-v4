'use strict';

const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const { TEST_MONGODB_URI } = require('../config'); ('../config');

const User = require('../models/user');

const expect = chai.expect;

chai.use(chaiHttp);

describe.only('Noteful API - Users', function () {
  const username = 'exampleUser';
  const password = 'examplePass';
  const fullname = 'Example User';
  const firstName = 'Example';
  const lastName = 'User';
  const nonStringUser = [];
  const nonStringPass = [];
  const nonTrimmedUser = '   exampleUser';
  const nonTrimmedPass = '   examplePass';
  const nonTrimmedFullName = '  isael lizama   ';
  const emptyUser = '';
  const emptyPass = '';
  const overLimitPass = 'thisHasToBeOver72CharactersLongIDontKnowHowLongThatIsSoImStillTypingThisFeelsWeird';

  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase())
      .then(() => User.ensureIndexes());
  });

  beforeEach(function () {
    // noop
  });

  afterEach(function () {
    return User.remove();
    //return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    return mongoose.disconnect();
  });

  describe.only('/api/users', function () {
    describe('POST', function () {
      it('Should create a new user', function () {
        const testUser = { username, password, fullname };

        let res;
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(_res => {
            res = _res;
            expect(res).to.have.status(201);
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.keys('id', 'username', 'fullname');

            expect(res.body.id).to.exist;
            expect(res.body.username).to.equal(testUser.username);
            expect(res.body.fullname).to.equal(testUser.fullname);

            return User.findOne({ username });
          })
          .then(user => {
            expect(user).to.exist;
            expect(user.id).to.equal(res.body.id);
            expect(user.fullname).to.equal(testUser.fullname);
            return user.validatePassword(password);
          })
          .then(isValid => {
            expect(isValid).to.be.true;
          });
      });
      it('Should reject users with missing username', function () {
        const testUser = { password, fullname};
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal('Missing username in request body');
            expect(res.body.location).to.equal('username');
          });
      });

      /**
       * COMPLETE ALL THE FOLLOWING TESTS
       */
      it('Should reject users with missing password', function(){
        return chai.request(app)
          .post('/api/users')
          .send({username, firstName, lastName})
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal('Missing password in request body');
            expect(res.body.location).to.equal('password');
          });
          
      });
      it('Should reject users with non-string username', function(){
        return chai.request(app)
          .post('/api/users')
          .send({password, lastName, firstName, username: nonStringUser})
          .then( res => {
            expect(res).to.have.status(422);
            // expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal('username has to be a string');
            expect(res.body.location).to.equal('username');
          });
      });
      it('Should reject users with non-string password', function(){
        return chai.request(app)
          .post('/api/users')
          .send({password: nonStringPass, lastName, firstName, username})
          .then(res => {
            expect(res).to.have.status(422);
            // expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal('password has to be a string');
            expect(res.body.location).to.equal('password');
          });
      });
      it('Should reject users with non-trimmed username', function(){
        return chai.request(app)
          .post('/api/users')
          .send({password, fullname, username: nonTrimmedUser})
          .then(res => {
            expect(res).to.have.status(422);
            // expect(res.body.reason).to.equal('ValidatonError');
            expect(res.body.message).to.equal('username has spaces.');
            expect(res.body.location).to.equal('username');
          });
      });
      it('Should reject users with non-trimmed password', function(){
        return chai.request(app)
          .post('/api/users')
          .send({username, fullname, password: nonTrimmedPass})
          .then(res => {
            expect(res).to.have.status(422);
            // expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal('password has spaces.');
            expect(res.body.location).to.equal('password');
          });
      });
      it('Should reject users with empty username', function(){
        return chai.request(app)
          .post('/api/users')
          .send({password, fullname, username: emptyUser})
          .then(res => {
            expect(res).to.have.status(422);
            // expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal('username has to be at least one character.');
            expect(res.body.location).to.equal('username');
          });
      });
      it('Should reject users with password less than 8 characters', function(){
        return chai.request(app)
          .post('/api/users')
          .send({password:emptyPass, fullname, username})
          .then(res =>{
            expect(res).to.have.status(422);
            // expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal('password has to be at least 8 characters long.');
            expect(res.body.location).to.equal('password');
          });
      });
      it('Should reject users with password greater than 72 characters', function() {
        return chai.request(app)
          .post('/api/users')
          .send({password: overLimitPass, firstName, lastName, username})
          .then(res => {
            expect(res).to.have.status(422);
            // expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal('password has to be at most 72 characters');
            expect(res.body.location).to.equal('password');
          });
      });
      it('Should reject users with duplicate username', function(){
        return User.create({username, password, firstName, lastName})
          .then(() => {
            return chai.request(app).post('/api/users').send({username, password, firstName, lastName});
          })
          .then(res => {
            expect(res).to.have.status(400);
            expect(res.body.message).to.equal('The username already exists');
            expect(res.body.location).equal('username');
          });
      });
      it('Should trim fullname', function(){

        return chai.request(app).post('/api/users').send({username, password, fullname: nonTrimmedFullName})
          .then(result => {
            expect(result).to.have.status(201);
            expect(result.body.fullname).to.not.equal(nonTrimmedFullName);
            expect(result).to.be.json;
          });
      });
    });

    // describe('GET', function () {
    //   it('Should return an empty array initially', function () {
    //     return chai.request(app).get('/api/users')
    //       .then(res => {
    //         expect(res).to.have.status(200);
    //         expect(res.body).to.be.an('array');
    //         expect(res.body).to.have.length(0);
    //       });
    //   });
    //   it('Should return an array of users', function () {
    //     const testUser0 = {
    //       username: `${username}`,
    //       password: `${password}`,
    //       fullname: ` ${fullname} `
    //     };
    //     const testUser1 = {
    //       username: `${username}1`,
    //       password: `${password}1`,
    //       fullname: `${fullname}1`
    //     };
    //     const testUser2 = {
    //       username: `${username}2`,
    //       password: `${password}2`,
    //       fullname: `${fullname}2`
    //     };

    //     /**
    //      * CREATE THE REQUEST AND MAKE ASSERTIONS
    //      */
    //   });
    // });
  });
});