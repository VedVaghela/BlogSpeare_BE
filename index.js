const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const User = require('./models/User')
const BlogPost = require('./models/BlogPost')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const multer = require('multer')
const uploadMiddleware = multer({dest: 'uploads/'})
const fs = require('fs')

const app = express();

const salt = bcrypt.genSaltSync(10);
const secret = 'nvciwnev09r3nvwe43fvf'

app.use(cors({
    credentials:true,
    origin:'http://localhost:3000'
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads',express.static(__dirname+'/uploads'))

mongoose.connect(process.env.MONGO_URL)

app.get('/test', (req,res) => {
    res.json('test ok')
});

app.post('/register', async (req,res)=>{
    const {username,password} = req.body;
    try{
        const userData = await User.create({
            username,
            password:bcrypt.hashSync(password,salt)
        })
        res.json(userData);
    }
    catch(e){
        res.status(400).json(e);
    }
})

app.post('/login', async (req,res) => {
    const {username, password} = req.body;
    const userData = await User.findOne({username});
    const passOK = bcrypt.compareSync(password, userData.password);
    if(passOK){
        jwt.sign({username,id:userData._id}, secret, {}, (err, token)=> {
            if(err) throw err;
            res.cookie('token', token).json({
                id: userData._id,
                username
            });
        });
    }else{
        res.status(400).json('wrong credentials');
    }
})

app.get('/profile', (req,res) => {
    const {token} = req.cookies;
    jwt.verify(token, secret, {} , (err, info) => {
        if (err) throw err;
        res.json(info);
    });
});

app.post('/postblog', uploadMiddleware.single('file') , async (req,res) => {
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path+'.'+ext
    fs.renameSync(path, newPath);

    const {token} = req.cookies;
    jwt.verify(token, secret, {} , async (err, info) => {
        if (err) throw err;
        const {title,summary,content} = req.body;    
        const BlogPostDoc = await BlogPost.create({
            title,
            summary,
            content,
            cover:newPath,
            author: info.id
        })
        res.json(BlogPostDoc);
    });
    // res.json({files:req.file})
})

app.get('/postblog', async (req, res) => {
    res.json(
        await BlogPost.find()
        .populate('author',['username'])
        .sort({createdAt: -1})
        .limit(20)
    )
})

app.get('/postblog/:id', async (req,res) => {
   const {id} = req.params;
   const postData = await BlogPost.findById(id).populate('author', ['username']);
   res.json(postData);
})

app.put('/postblog', uploadMiddleware.single('file'), async (req,res) => {
    let newPath = null;
    if(req.file){
        const {originalname,path} = req.file;
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        newPath = path+'.'+ext
        fs.renameSync(path, newPath);
    }

    const {token} = req.cookies;
    jwt.verify(token, secret, {} , async (err, info) => {
        if (err) throw err;
        const {title,summary,content, id} = req.body; 
        const BlogPostDoc = await BlogPost.findById(id);
        const isAuthor = JSON.stringify(BlogPostDoc.author) === JSON.stringify(info.id);
        if(!isAuthor) {
            res.status(400).json('Invalid Author');
        } 
        
        await BlogPostDoc.updateOne({
            title,
            summary,
            content,
            cover: newPath ? newPath : BlogPostDoc.cover
        })
        res.json(BlogPostDoc);
    });

})

app.post('/logout', (req,res) => {
    res.cookie('token', '').json('logged out');
})

app.listen(4000);
