
const mongoose = require('mongoose');

const otpSchema = mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    otp:{
        type:String,
        required:true
    },
    otpExpiredAt:{
        type:Date,
        required:true,
        expires:0
    }
},{
    timestamps:true
})


module.exports = mongoose.model('otp',otpSchema);
