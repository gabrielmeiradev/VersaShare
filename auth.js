const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const User = require("./models/User");

function initialize(passport) {

    async function getUserByEmail(email){
        let user = await User.findOne({ "email": email });
        return user;
    }

    async function getUserById(id){
        let user = await User.findOne({ "id": id });
        return user
    }

  const authenticateUser = async (email, password, done) => {
    const user = getUserByEmail(email)
    if (user == null) {
      return done(null, false)
    }

    try {
      if (user.password === password) {
        return done(null, user)
      } else {
        return done(null, false)
      }
    } catch (e) {
      return done(e)
    }
  }

  passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser))
  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser((id, done) => {
    return done(null, getUserById(id))
  })
}

module.exports = initialize