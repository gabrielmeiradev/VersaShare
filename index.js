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
    if (!req.session.userId) {
        return next();
    }

    res.redirect('/')
})

async function checkIfIsLogged(req, res, next) {
    if (!req.session.userId) return res.redirect('/login');

    const user = await User.findOne({
        id: req.session.userId
    })

    req.user = user;

    req.temporary = req.session.temporary;

    next()
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

    const currentWorkspace = user.workspaceId;

    // Fazer isso em todas as rotas de pastas, inclusive no Workspace
    const folders = await Folder.find({
        location: currentWorkspace
    })

    const workspaceFolders = folders;

    res.render('dynamic/app', {
        user,
        workspaceFolders,
        currentWorkspace
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

    if (!user) return res.redirect('/login?fail=true')

    if (!bcrypt.compareSync(password, user.password)) return res.redirect('/login?fail=true')

    req.session.userId = user.id;

    if (!remember) req.session.temporary = true

    res.redirect('/')
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

    const name = registerbody.name;

    const username = registerbody.username;

    const email = registerbody.email;

    const password = registerbody.password;

    const user = await User.findOne({
        $or: [{
                email: email
            },
            {
                username: username
            }
        ]
    })


    const id = crypto.randomUUID();
    const workspaceId = crypto.randomUUID();

    if (user) return res.render('register')

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
    const message = {

        html: `<h1>Confirme sua conta VersaShare:</h1><br /><a href='${process.env.DOMAIN}/activation/${id}'>Confirmar sua conta</a>`,

        plain: 'Confirme sua conta. Copie o link e cole no navegador: localhost:4040/activation/' + id
    }

    const userEmail = email

    emailconfirmation(userEmail, message);

    res.redirect('/login');

})

server.get('/logout', (req, res) => {
    req.session.destroy();

    res.redirect('/')
})

server.get('/email/:email', async (req, res) => {
    const email = req.params.email;

    const user = await User.findOne({
        email: email
    });

    if (!user) return res.send({
        response: false
    });

    res.send({
        response: true
    })
})

server.get('/username/:username', async (req, res) => {
    const username = req.params.username;

    const user = await User.findOne({
        username: username
    })

    if (!user) return res.send({
        response: false
    })

    res.send({
        response: true
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
    const userId = req.session.userId;

    if (!userId) return res.redirect('/');

    const address = req.params.address;
    const workspaceId = req.params.workspaceId;

    const user = await User.findOne({
        id: userId,
    });

    if (!user) return res.send('nao tem user');

    const isWorkspaceFromTheSameUser = user.workspaceId === workspaceId;

    // Realiza uma ação caso workspace não seja desse user 
    if (!isWorkspaceFromTheSameUser) return res.send('sai fora malandrão');

    const name = req.body.folderName;

    const folder = await Folder.findOne({
        name: name,
    });

    if (!folder || folder.owner_id !== userId) {
        await Folder.create({
            id: crypto.randomUUID(),
            name: name,
            location: address,
            owner_id: user.id,
        });

        return res.redirect('/');
    }

    res.send('pasta ja existe xxxtentacion');
});

server.post('/add-contact', async (req, res) => {
    if(!req.session.userId) return res.redirect('/')

    const contactId = req.body.contactId
    const sessionId = req.session.userId

    const userToBeAdded = await User.find(
        { $or: [{email: contactId}, {username: contactId}] },
    )
    await User.insertOne({
        id: sessionId,

    })
    .then(() => {res.redirect('/?success1')})



    if(!user) return res.redirect('/?error=1')

    

    
    
    res.redirect('/');
})


server.get('/politica-de-privacidade', (req, res) => {

    res.render('static/politica-de-privacidade')

})

server.listen(4040, (req, res) => {

    console.log('rodando na 4040')
    
})