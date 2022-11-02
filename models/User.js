const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  id: {
    type: String,
    require: true
  },
  name: {
    type: String,
    require: true,
  },
  username: {
    type: String,
    require: true,
  },
  email: {
    type: String,
    require: true,
  },
  password: {
    type: String,
    require: true
  },
  emailConfirmed: {
    type: Boolean,
    require: false,
    default: false
  },
  avatarBGColor: {
    type: String,
    require: false
  },
  contacts: {
    type: Array,
    require: false
  },
  teams: {
    type: Array,
    require: false
  },
  userId: {
    type: String,
    require: false
  }
}
,
{
    timestamps: true
});

module.exports = mongoose.model("User", UserSchema);