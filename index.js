const express = require('express');
const server = express();
const expressLayouts = require('express-ejs-layouts');
const User = require("./models/User");
const File = require("./models/File");
const Folder = require("./models/Folder");
const connectToDb = require("./database/db");
const register = require('./models/User');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cookieParser = require("cookie-parser");
const crypto = require('crypto');
const emailconfirmation = require('./mails/emailconfirmation');
const multer  = require('multer');
const path = require('path')
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname))
    }
  })

const upload = multer({ storage: storage });
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


const errors = {
    "1": "E-mail e/ou senha incorreto",
    "2": "Pasta já existente, crie outra com outro nome",
    "3": "Usuário não encontrado",
    "4": "Usuário já adicionado"
}

server.use((req, res, next) => {
    const error = req.query.error;

    if (error) req.error = errors[error];

    next();
})

async function checkIfIsLogged(req, res, next) {
    if (!req.session.userId) {
        server.set('layout', 'main');
        return res.redirect('/login')
    };

    const user = await User.findOne({
        id: req.session.userId
    })

    req.user = user;

    next()
}

server.use(expressLayouts);
server.set('layout', 'main')
server.set('view engine', 'ejs')
server.use(express.static('public'))
server.use(express.urlencoded());

async function returnBasics(req, res, next) {
    const query = req.query.q;

    const user = await User.findOne({
        id: req.session.userId
    })

    let folders = await Folder.find({
        location: user.workspaceId
    })

    
    let contacts = []
    
    for (var contact of user.contacts) {
        const thisContact = await User.findOne({
            id: contact
        })
        contacts.push(thisContact)
    }
    
    if(query){
        folders = folders.filter(elem => elem.name.toLowerCase().includes(query));
        contacts = contacts.filter(elem => elem.name.toLowerCase().includes(query)) 
    }


    req.folders = folders;
    req.contacts = contacts;
    req.user = user;

    next();
}

server.get('/', checkIfIsLogged, returnBasics, async (req, res) => {
    const user = req.user;
    const workspaceFolders = req.folders;
    const contacts = req.contacts;

    const currentWorkspace = user.workspaceId;


    const error = req.error;

    server.set('layout', 'app-body');

    res.render('dynamic/app', {
        error,
        contacts,
        user,
        workspaceFolders,
        currentWorkspace
    })
})

server.get('/login', async (req, res) => {
    const error = req.error

    res.render('static/login', {
        error
    });
})

server.post('/login', async (req, res) => {
    let email = req.body.email;

    let password = req.body.password;

    let remember = req.body.remember;

    const user = await User.findOne({
        email: email
    })

    if (!user) return res.redirect('/login?error=1')

    if (!bcrypt.compareSync(password, user.password)) return res.redirect('/login?error=1')

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
    req.session.destroy((err) => {
        res.redirect('/')
    })
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

    // TODO: caso não tenha user
    if (!user) return res.send('nao tem user');

    const isWorkspaceFromTheSameUser = user.workspaceId === workspaceId;

    // TODO: ação caso esse workspace não seja desse user -> Essa linha realiza uma ação caso workspace não seja desse user 
    if (!isWorkspaceFromTheSameUser) return res.send('sai fora malandrão');

    const name = req.body.folderName;

    const folder = await Folder.findOne({
        name: name,
        location: address
    });

    let id = crypto.randomUUID();

    if (!folder || folder.owner_id !== userId) {
        await Folder.create({
            id: id,
            name: name,
            location: address,
            owner_id: user.id,
        })

        if (address === workspaceId) {
            return res.redirect('/');
        } else {
            return res.redirect('/folder/' + address)
        }

    }

    res.redirect('/?error=2');
});

server.post('/add-contact', async (req, res) => {
    if (!req.session.userId) return res.redirect('/')

    const contactId = req.body.contactId

    const sessionId = req.session.userId

    const userToBeAdded = await User.findOne({
        $or: [{
            email: contactId
        }, {
            username: contactId
        }]
    })

    if (!userToBeAdded || userToBeAdded.id === sessionId) return res.redirect('/?error=3')

    const user = await User.findOne({
        id: sessionId
    })

    const isUserAlreadyAdded = user.contacts.some(contact => contact === userToBeAdded.id)
    if (isUserAlreadyAdded) return res.redirect('/?error=4')

    const addToUser1 = await User.updateOne({
        id: user.id
    }, {
        $push: {
            contacts: userToBeAdded.id
        }
    })

    const addToUser2 = await User.updateOne({
        id: userToBeAdded.id
    }, {
        $push: {
            contacts: user.id
        }
    })

    Promise.all([addToUser1, addToUser2]);

    res.redirect('/');
})

server.post('/upload-file/', upload.single('arquivo'), async (req, res) => {
    const originalPath = req.body.originalFolderId;
    
    const file = req.file;

    const date = new Date();
    const month = (date.getMonth() + 1) < 10 ? '0' + date.getMonth() + 1 : date.getMonth() + 1;
    const day = (date.getDate()) < 10 ? '0' + date.getDate(): date.getDate();

    await File.create({
        id: crypto.randomUUID(),
        path: file.path,
        mimetype: file.mimetype,
        owner_id: req.session.userId,
        originalname: file.originalname,
        filename: file.filename,
        size: file.size,
        folderId: originalPath,
        creation_date:`${day}/${month}`
    })
  
    res.redirect('/folder/' + originalPath);
  
})

server.get('/download/:fileid', async (req, res) => {
    const fileId = req.params.fileid;
    const file = await File.findOne({
        id: fileId
    })
    res.redirect('/uploads/' + file.filename)
})

server.post('/rename-file/', checkIfIsLogged, async (req, res) => {
    const newName = req.body.newName;
    const fileId = req.body.originalFileId;

    await File.updateOne(
        {id: fileId},
        {originalname: newName}
    )

    const file = await File.findOne({id: fileId})
    res.redirect('/folder/' + file.folderId);
})

server.get('/delete-contact/:id', checkIfIsLogged, async (req, res) => {
    const idToBeDeleted = req.params.id;

    const deleteFromUser1 = await User.updateOne({
        id: req.session.userId
    }, {
        $pull: {
            'contacts': idToBeDeleted
        }
    })

    const deleteFromUser2 = await User.updateOne({
        id: idToBeDeleted
    }, {
        $pull: {
            'contacts': req.session.userId
        }
    })

    Promise.all([deleteFromUser1, deleteFromUser2])

    res.redirect('/')
})

server.get('/delete-file/:id', checkIfIsLogged, async (req, res) => {

    const fileId = req.params.id;

    const file = await File.findOne({id: fileId});

    await File.deleteOne({id: fileId})

    if(file.owner_id === req.session.userId){
        res.redirect('/folder/' + file.folderId);
    }

})

server.get('/politica-de-privacidade', (req, res) => {

    res.render('static/politica-de-privacidade')

})

server.get('/folder/:id', checkIfIsLogged, returnBasics, async (req, res) => {

    const userId = req.session.userId;

    const folderID = req.params.id

    const thisFolder = await Folder.findOne({
        id: folderID
    });

    const user = req.user;

    const currentWorkspace = thisFolder.id;

    const foldersOfWorkspace = await Folder.find({
        location: currentWorkspace
    })

    const workspaceFolders = req.folders;

    const contacts = req.contacts;

    if (!userId || userId != thisFolder['owner_id']) return res.redirect('/')

    const filesOfThisFolder = await File.find({folderId: folderID}).sort({
        createdAt: -1
    })

    res.render('dynamic/folder-page', {
        thisFolder,
        user,
        currentWorkspace,
        workspaceFolders,
        contacts,
        foldersOfWorkspace,
        filesOfThisFolder
    })

})

server.get('/delete-folder/:id', async (req, res) => {

    const folderID = req.params.id;

    const folder = await Folder.findOne({
        id: folderID
    });

    const user = await User.findOne({
        id: req.session.userId
    })

    await Folder.deleteOne({
        id: folderID
    })

    if (folder.location == user.workspaceId) {
        res.redirect('/')
    } else {
        res.redirect('/folder/' + folder.location)
    }

})

server.post('/rename-folder/', async (req, res) => {

    const folderID = req.body.originalFolderId;

    const newName = req.body.newName;

    const thisFolder = await Folder.findOne({
        id: folderID
    });

    if (!thisFolder) return res.redirect('/');

    const foldersFromSameWorkspace = await Folder.find({
        location: thisFolder.location
    })

    if (foldersFromSameWorkspace.some(folder => folder.name == newName)) {
        return res.redirect('/?erro=2')
    }

    await Folder.updateOne({
        id: folderID
    }, {
        name: newName
    })

    const user = await User.findOne({
        id: req.session.userId
    });

    if (thisFolder.location === user.workspaceId) {
        res.redirect('/');
    } else {
        res.redirect('/folder/' + thisFolder.location)
    }
})

server.get('/settings', checkIfIsLogged, returnBasics, (req, res) => {
    const user = req.user;
    const workspaceFolders = req.folders;
    const contacts = req.contacts;
    res.render('dynamic/settings', {
        user, workspaceFolders, contacts
    })
})

server.get('/my-profile', checkIfIsLogged, returnBasics, (req, res) => {
    const user = req.user;
    const workspaceFolders = req.folders;
    const contacts = req.contacts;
    res.render('dynamic/profile', {
        user, workspaceFolders, contacts
    })
})

server.get('/chat/:id', returnBasics, checkIfIsLogged, async (req, res) => {
    const userId = req.session.userId;

    const user = req.user;

    const workspaceFolders = req.folders;

    const contacts = req.contacts;

    const user2Id = req.params.id

    const usersConversation = await User.findOne({
        id: user2Id
    })

    res.render('dynamic/chat', {
        user,
        usersConversation,
        workspaceFolders,
        contacts
    })
})

server.post('/update-profile', async (req, res) => {
    const name = req.body.name;
    const username = req.body.username;
    const email = req.body.email;
    const avatar = req.body.avatar;
    
    await User.updateOne(
        {id: req.session.userId},
        {$set: {
            name: name,
            username: username,
            email: email,
            avatarBGColor: avatar,
        }},
    )
    
    res.redirect('/')
})

server.listen(4040, (req, res) => {

    console.log('http://localhost:4040')

})