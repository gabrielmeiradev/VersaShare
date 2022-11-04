const mongoose = require("mongoose");

const FolderSchema = new mongoose.Schema({
  id: {
    type: String,
    require: true
  },
  name: {
    type: String,
    require: true
  },
  location: {
    type: String,
    require: true
  },
  owner_id:{
    type: String,
    require: true
  }
}
,
{
    timestamps: true
});

module.exports = mongoose.model("Folder", FolderSchema);