const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name:{
        type:String, 
        required:true,
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    
    password:{
        type:String,
        required:true
    },
    age:{
        type:Number,
    },

    address:{
        type: String
    },
    isActive:{
        type:Boolean,
        default:true
    },
},
{
    timestamps:true
})


module.exports = mongoose.model("User", userSchema)