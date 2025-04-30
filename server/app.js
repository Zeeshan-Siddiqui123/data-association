const express = require("express")
const app = express()
const userModel = require('./models/user')
const postModel = require('./models/post')

app.get('/', (req, res) => {
    res.send('Hello')
})

app.get('/create', async(req, res) => {

})

app.listen(3000)