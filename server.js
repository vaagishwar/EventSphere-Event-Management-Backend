require('dotenv').config()
const express = require('express')
const app = express()
const cors = require("cors")
const authRouter = require('./routes/auth.routes.js')
const userRouter = require('./routes/user.routes.js')
const connectDB = require('./config/db.js')
app.use(cors())
app.use(express.json())

app.use('/',authRouter)
app.use('/users',userRouter)

connectDB()
    .then(() => {
        app.listen(process.env.PORT, ()=>{
            console.log(`Running on port ${process.env.PORT}..`);
        })
    })
