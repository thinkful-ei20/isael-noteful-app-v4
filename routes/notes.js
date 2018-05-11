'use strict';

const express = require('express');
const router = express.Router();
const passport = require('passport');
const mongoose = require('mongoose');

const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tag');
router.use('/', passport.authenticate('jwt', { session: false, failWithError: true }));
function validateFolderId(userId,folderId){
  if(!folderId) {
    return Promise.resolve();
  }
  return Folder.findOne({_id: folderId,userId: userId})
    .then(result => {
      if(!result) {
        return Promise.reject('Invalid Folder');
      }
    });
}

function validateTagsId(userId,tagId){
  if(!tagId) {
    return Promise.resolve();
  }
  return Tag.findOne({_id: tagId,userId: userId})
    .then(result => {
      if(!result) {
        return Promise.reject('Invalid Tag');
      }
    });
}


/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const { searchTerm, folderId, tagId } = req.query;
  const { id: userId } = req.user;
  let filter = {userId};

  if (searchTerm) {
    // filter.title = { $regex: searchTerm };
    filter.$or = [{ 'title': { $regex: searchTerm } }, { 'content': { $regex: searchTerm } }];
  }

  if (folderId) {
    filter.folderId = folderId;
  }

  if (tagId) {
    filter.tags = tagId;
  }

  Note.find(filter)
    .populate('tags')
    .sort({ 'updatedAt': 'desc' })
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {
  const { id } = req.params;
  const { id: userId } = req.user;
  console.log(req.user);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findOne({_id: id, userId})
    .populate('tags')
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  let { title, content, tags = [], folderId } = req.body;
  const userId = req.user.id;
  const newNote = { title, content, userId, folderId, tags };

  /***** Never trust users - validate input *****/
  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return next(err);
  }

  if (tags) {
    tags.forEach((tag) => {
      if (!mongoose.Types.ObjectId.isValid(tag)) {
        const err = new Error('The `id` is not valid');
        err.status = 400;
        return next(err);
      }      
    });
  }

  if(folderId === '') newNote.folderId = undefined;

  const valFolderIdPromise = validateFolderId(userId, newNote.folderId);

  const valTagIdPromise = Promise.all(tags.map(tag =>
    validateTagsId(userId, tag)
  )
  );
  

  Promise.all([valFolderIdPromise, valTagIdPromise])
    .then(() => Note.create(newNote))
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      if(err === 'Invalid Folder') {
        err = new Error('The folder is not valid');
        res.status(400);
      }
      if(err === 'Invalid Tag') {
        err = new Error('The tag is not valid');
        res.status(400);
      }
      next(err);
    });

});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  const { id } = req.params;
  const { title, content, folderId, tags = [] } = req.body;
  const { id: userId } = req.user;
  const newNote = {title, content, folderId, userId, tags};

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return next(err);
  }

  if (tags) {
    tags.forEach((tag) => {
      if (!mongoose.Types.ObjectId.isValid(tag)) {
        const err = new Error('The `tags.id` is not valid');
        err.status = 400;
        return next(err);
      }
    });
  }
  if(folderId === '') newNote.folderId = undefined;
  
  const valFolderIdPromise = validateFolderId(userId, newNote.folderId);
  const valTagIdPromise = Promise.all(tags.map(tag => validateTagsId(userId, tag)));
  Promise.all([valFolderIdPromise, valTagIdPromise])
    .then(() => Note.findOneAndUpdate({_id: id, userId},  newNote , { new: true }))
    .then(result => {
      if (result) {
        console.log(newNote);
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const { id } = req.params;
  const { id: userId } = req.user;

  Note.findOneAndRemove({userId: userId, _id: id})
    .then(() => {
      res.status(204).end();
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;