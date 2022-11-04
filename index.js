const express = require('express');
const server = express();
const expressLayouts = require('express-ejs-layouts');
const User = require("./models/User");
const Folder = require("./models/Folder");
const connectToDb = require("./database/db");
const register = require('./models/User');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cookieParser = require("cookie-parser");
const crypto = require('crypto');

const emailconfirmation = require('./mails/emailconfirmation');
const {
    reset
} = require('nodemon');

// GLOBAL VARIABLES
require('dotenv').config()

connectToDb();

server.use(cookieParser());
server.use(session({
    secret: 'gabrielmeira',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
}));

server.use('/login', (req, res, next) => {
    if (req.session.userId) {
        res.redirect('/')
    } else {
        next();
    }
})

async function checkIfIsLogged(req, res, next) {
    if (req.session.userId) {
        const user = await User.findOne({
            id: req.session.userId
        })
        req.user = user;
        if (req.session.temporary) {
            req.temporary = true;
        } else {
            req.temporary = false;
        }
        next()
    } else {
        res.redirect('/login');
    }
}

server.use(expressLayouts);
server.set('layout', 'main')
server.set('view engine', 'ejs')
server.use(express.static('public'))
server.use(express.urlencoded());

server.get('/', checkIfIsLogged, async (req, res) => {
    const user = req.user;
    const temporary = req.temporary;
    if (temporary) {
        req.session.destroy();
    }
    let currentWorkspace = user.workspaceId;
    // Fazer isso em todas as rotas de pastas, inclusive no Workspace

    Folder.find({
        location: currentWorkspace
    }).exec((err, folders) => {
        if (folders) {
            let workspaceFolders;
            workspaceFolders = folders
            res.render('dynamic/app', {
                user,
                workspaceFolders,
                currentWorkspace
            })
        }
    })

})

server.get('/login', async (req, res) => {
    let message = null;
    let fail = ((req.query.fail) ? true : false);
    if (req.query.fail) message = 'Usuário e/ou senha inválidos!';
    res.render('static/login', {
        fail
    });
})

server.post('/login', async (req, res) => {
    let email = req.body.email;
    let password = req.body.password;
    let remember = req.body.remember;
    const user = await User.findOne({
        email: email
    })

    if (user) {
        if (bcrypt.compareSync(password, user.password)) {
            // Logado 
            // Setar sessão
            req.session.userId = user.id;

            if (!remember) {
                req.session.temporary = true;
            }

            res.redirect('/')
        } else {
            // Não logado
            res.redirect('/login?fail=true');
        }
    } else {
        res.redirect('/login?fail=true');
    }
})


const randomDarkColor = () => {
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += Math.floor(Math.random() * 10);
    }
    return color;
}

server.get('/register', (req, res) => {
    res.render('static/register')
})

server.post('/register', async (req, res) => {
    const registerbody = req.body;
    let name = registerbody.name;
    let username = registerbody.username;
    let email = registerbody.email;
    let password = registerbody.password;

    User.findOne({
        $or: [{
                email: email
            },
            {
                username: username
            }
        ]
    }).exec((err, user) => {

        let id = crypto.randomUUID();
        let workspaceId = crypto.randomUUID();

        if (user) {
            res.render('register')
        } else {
            User.create({
                "id": id,
                "name": name,
                "username": username,
                "email": email,
                "password": bcrypt.hashSync(password, 10),
                "avatarBGColor": randomDarkColor(),
                "workspaceId": workspaceId
            });

            // Enviando email de confirmação:
            let message = {
                html: `<h1>Confirme sua conta VersaShare:</h1><br /><a href='${process.env.DOMAIN}/activation/${id}'>Confirmar sua conta</a>`,
                plain: 'Confirme sua conta. Copie o link e cole no navegador: localhost:4040/activation/' + id
            }

            let userEmail = email
            emailconfirmation(userEmail, message);

            res.redirect('/login');
        }
    });
})

server.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/')
})

server.get('/email/:email', (req, res) => {
    let e = req.params.email;
    User.findOne({
        email: e
    }).exec((err, user) => {
        if (user) {
            res.send({
                response: true
            })
        } else {
            res.send({
                response: false
            })
        }
    })
})

server.get('/username/:username', (req, res) => {
    let u = req.params.username;
    User.findOne({
        username: u
    }).exec((err, user) => {
        if (user) {
            res.send({
                response: true
            })
        } else {
            res.send({
                response: false
            })
        }
    })
})

server.get('/activation/:userid', async (req, res) => {
    let userID = req.params.userid;
    User.updateOne({
        id: userID
    }, {
        $set: {
            emailConfirmed: true
        }
    }).then(() => {
        res.redirect('/');
    })
})

server.post('/create-folder/:address/:workspaceId', async (req, res) => {
    // Verifica se o cara que tá enviando o form é realmente o dono do workspace
    if (req.session.userId) {
        let address = req.params.address;
        let workspaceId = req.params.workspaceId;
        User.findOne({
            id: req.session.userId
        }).exec((err, user) => {
            if (user) {
                if (user.workspaceId == workspaceId) {
                    let name = req.body.folderName;
                    Folder.findOne({
                        "name": name
                    }).exec((err, folder) => {
                        if (!folder) {
                            Folder.create({
                                "id": crypto.randomUUID(),
                                "name": name,
                                "location": address,
                                "owner_id": user.id
                            }).then(() => {
                                res.redirect('/')
                            })
                        } else {
                            res.send('pasta ja existe xxxtentacion')
                        }
                    })

                } else {
                    res.send('sai fora maladrão');
                }
            }
        })
    } else {
        res.redirect('/');
    }
})


server.get('/politica-de-privacidade', (req, res) => {
    res.render('static/politica-de-privacidade')
})

server.listen(4040, (req, res) => {
    console.log('rodando na 4040')
})