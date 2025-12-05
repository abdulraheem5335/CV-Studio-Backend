/**
 * Models Index - Export all MongoDB models
 */

const User = require('./User');
const Post = require('./Post');
const Event = require('./Event');
const Zone = require('./Zone');
const Quest = require('./Quest');
const Badge = require('./Badge');
const Item = require('./Item');
const Club = require('./Club');

module.exports = {
  User,
  Post,
  Event,
  Zone,
  Quest,
  Badge,
  Item,
  Club,
};
