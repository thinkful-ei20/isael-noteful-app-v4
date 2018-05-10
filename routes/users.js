'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/user');

router.post('/', (req, res, next) => {
  const { username, password } = req.body;
  let { fullname } = req.body;
  const requireFields = ['username', 'password'];

  const missingField = requireFields.find(
    field => !(field in req.body)
  );

  if(missingField){
    const err = new Error(`Missing ${missingField} in request body`);
    err.status = 422;
    return next(err);
  }

  const notStringField = requireFields.find(
    field => typeof req.body[field] !== 'string'
  );

  if(notStringField){
    const err = new Error(`${notStringField} has to be a string`);
    err.status = 422;
    return next(err);
  }

  const whiteSpace = requireFields.find(
    field => req.body[field].trim() !== req.body[field]
  );

  if(whiteSpace){
    const err = new Error(`${whiteSpace} has spaces.`);
    err.status = 422;
    return next(err);
  }

  const userMinimum = username.length;

  if(userMinimum < 1){
    const err = new Error('username has to be at least one character.');
    err.status = 422;
    return next(err);
  }

  const passValidation = password.length;

  if(passValidation < 8){
    const err = new Error('password has to be at least 8 character long');
    err.status = 422;
    return next(err);
  }

  if(passValidation > 72){
    const err = new Error('password has to be at most 72 characters');
    err.status = 422;
    return next(err);
  }

  if(fullname) fullname = fullname.trim();
  
  return User.hashPassword(password)
    .then(digest =>{
      const newUser = {
        username, 
        password: digest,
        fullname        
      };
      return User.create(newUser);
    })
    .then(result => {
      return res.status(201).location(`/api/users/${result.id}`).json(result);
    })
    .catch(err =>{
      if(err.code === 11000){
        err = new Error('The username already exists');
        err.status = 400;
      }
      next(err);
    });
  
});



module.exports = router;
