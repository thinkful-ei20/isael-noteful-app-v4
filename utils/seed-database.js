'use strict';

const mongoose = require('mongoose');

const { MONGODB_URI } = require('../config');
const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tag');
const User = require('../models/user');

const seedNotes = require('../db/seed/notes');
const seedFolders = require('../db/seed/folders');
const seedTags = require('../db/seed/tags');
const seedUsers = require('../db/seed/users');

mongoose.connect(MONGODB_URI)
  .then(() => mongoose.connection.db.dropDatabase())
  .then(() => {
    return Promise.all(seedUsers.map(user => User.hashPassword(user.password)));
  })
  .then((digests) => {
    seedUsers.forEach((user, i) => user.password = digests[i]);
    return Promise.all([
      Note.insertMany(seedNotes),
      User.insertMany(seedUsers),
      Folder.insertMany(seedFolders),
      Folder.createIndexes(),

      Tag.insertMany(seedTags),
      Tag.createIndexes()
    ]);
  })
  .then(() => mongoose.disconnect())
  .catch(err => {
    console.error(`ERROR: ${err.message}`);
    console.error(err);
  });
