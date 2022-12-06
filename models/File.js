const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema({
  id: {
    type: String,
    require: true
  },
  folderId: {
    type: String,
    require: true
  },
  path: {
    type: String,
    require: true
  },
  mimetype:{
    type: String,
    require: true
  },
  originalname:{
    type: String,
    require: true
  },
  filename: {
    type: String,
    require: true
  }, 
  size: {
    type: String,
    require: true
  },
  creation_date: {
    type: String,
    require: true
  }, 
  owner_id: {
    type: String,
    require: true
  }
}
,
{
    timestamps: true
});

module.exports = mongoose.model("File", FileSchema);