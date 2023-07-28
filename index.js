require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

mongoose.connect("mongodb+srv://devDB:dev@cluster0.lkqf3uh.mongodb.net/")

const ETUSER = mongoose.model('ETUSER', {username: {type: String, required: true, unique: [true, "This email has already registered"]}})
const ETEXCERCISE = mongoose.model('ETEXCERCISE', {
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date, required: true},
  username: {type: String, required: true},
})

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }))

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async function(req, res) {
  const data = {username: req?.body?.username}
  try {
    const user = await ETUSER.create(data)
    res.json({username: user?.username, _id: user?._id})
  } catch (error) {
    res.json({error: !req?.body?.username ? "Username is required" : "Error saving username"})
  }
})

app.get('/api/users', async function(req, res) {
  const users = await ETUSER.find({}, {__v: 0})
  res.json(users)
})

app.post('/api/users/:_id/exercises', async function(req, res) {
  const body = req?.body
  const date = body?.date ? new Date(body?.date) : new Date()
  const description = body?.description
  const duration = /^\d+$/.test(body?.duration) ? parseInt(body?.duration) : body?.duration
  const id = req.params?._id
  try {
    const user = await ETUSER.findOne({_id: id}, {__v: 0})
    if(user && date && description && typeof(duration) === 'number') {
      const excercise = await ETEXCERCISE.create({date, description, duration, username: user.username})
      res.json({
        date: new Date(excercise.date).toDateString(), 
        description: excercise.description, 
        duration: excercise.duration, 
        username: user.username,
        _id: user._id
      })
    } else {
      res.json({error: "invalid data"})
    }
  } catch (error) {
    res.json({error: error?.message || "error validating excercise"})
  }
})

app.get('/api/users/:_id/logs', async function(req, res) {
  const id = req.params?._id
  const q = req.query
  const limit = q?.limit || 10000
  const from = new Date(q?.from)?.getMonth() + 1 ? new Date(q?.from) : new Date(2020, 1, 1)
  const to = new Date(q?.to)?.getMonth() + 1 ? new Date(q?.to) : new Date()
  to.setDate(to.getDate() + 1)

  try {
    const user = await ETUSER.findOne({_id: id}, {__v: 0})
    if(user) {
      const excercise = await ETEXCERCISE.find({
        username: user.username, 
        date: {
          $gte: new Date(from.toISOString()),
          $lte: new Date(to.toISOString())
        }
      }, {username: 0, __v: 0, _id: 0}).limit(limit)
      const log = excercise.map(ex => ({
        description: ex.description,
        duration: ex.duration, 
        date: new Date(ex.date).toDateString()
      }))
      res.json({
        _id: user?._id,
        username: user?.username,
        count: excercise.length,
        log
      })
    } else {
      res.json({error: "invalid user"})
    }
  } catch (error) {
    res.json({error: "error fetching data"})
  }
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
