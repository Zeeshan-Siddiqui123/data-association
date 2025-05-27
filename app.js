const express = require("express")
const app = express()
const userModel = require('./models/user')
const postModel = require('./models/post')
const cookieParser = require("cookie-parser")
const bcrypt = require('bcrypt')
const jwt = require("jsonwebtoken")
const path = require("path")
const upload = require("./config/multerconfig")


app.set("view engine", 'ejs')
app.use(express.static(path.join(__dirname, "public")))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())


app.get('/', (req, res) => {
    res.render('index')
})

app.get('/login', (req, res) => {
    res.render('login')
})

app.post('/register', async (req, res) => {
    let { username, name, email, age, password } = req.body
    let user = await userModel.findOne({ email })
    if (user) {
        return res.status(500).send(`User Already Resgistered`)

    }
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let user = await userModel.create({
                name, username, email, age, password: hash
            })
            let token = jwt.sign({ email: email, userid: user._id }, 'key')
            res.cookie("token", token)
            res.send("Registered")
        })
    })
})

app.post('/login', async (req, res) => {
    let { email, password } = req.body
    let user = await userModel.findOne({ email })
    if (!user) return res.status(500).send('Something Went Wrong')
    bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
            let token = jwt.sign({ email: email, userid: user._id }, 'key')
            res.cookie("token", token)
            res.status(200).redirect("/profile")
        } else res.redirect('/login')
    })
})
app.get('/logout', (req, res) => {
    res.cookie("token", "")
    res.redirect('/login')
})

const isloggedIn = (req, res, next) => {
    if (req.cookies.token === "") {
        res.redirect('/login')
    } else {
        let data = jwt.verify(req.cookies.token, "key")
        req.user = data
        next()
    }
}

app.get('/profile', isloggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email }).populate('posts')
    res.render('profile', { user })
})

app.post('/post', isloggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email })
    let post = await postModel.create({
        user: user._id,
        content: req.body.content,
    })
    user.posts.push(post._id)
    await user.save()
    res.redirect('/profile')
})

app.get('/like/:id', isloggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id }).populate('user')
    if (post.likes.indexOf(req.user.userid) === -1) {
        post.likes.push(req.user.userid)
    } else {
        post.likes.splice(post.likes.indexOf(req.user.userid), 1)
    }
    await post.save()
    res.redirect('/profile')
})

app.post('/update/:id', isloggedIn, async (req, res) => {
    let post = await postModel.findOneAndUpdate({ _id: req.params.id }, { content: req.body.content })
    res.redirect('/profile')
})
app.get('/delete/:id', isloggedIn, async (req, res) => {
    let post = await postModel.findOneAndDelete({ _id: req.params.id })
    res.redirect('/profile')
})
app.post('/delete/:id', isloggedIn, async (req, res) => {
    try {
        await postModel.findByIdAndDelete(req.params.id);
        res.redirect('/profile');
    } catch (err) {
        res.status(500).send('Error deleting post');
    }
});

app.get('/edit/:id', isloggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id }).populate('user')
    res.render('edit', { post })
})

app.get('/profile/upload', isloggedIn, async (req, res) => {
    res.render('profileupload')
})

app.post('/upload', isloggedIn, upload.single('image'),  async(req, res) => {
       let user = await userModel.findOne({email: req.user.email})
       user.profilepic =  req.file.filename
       await user.save()
       res.redirect('/profile')
})


app.listen(3000);