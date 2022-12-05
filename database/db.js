const mongoose = require("mongoose");

const connectToDb = () => {
  mongoose
    .connect('', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log("MongoDB Atlas Conectado!"))
    .catch((err) => console.error(err));
};

module.exports = connectToDb;