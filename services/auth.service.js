const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const User = require("../models/user.model.js")
const Otp = require("../models/otp.model.js")
const transporter = require("../config/nodemailer.js")

const registerService = async(data)=>{
    const existingUser = await User.findOne({email:data.email})


    if(existingUser){
        return {error:"Email already exists"}
    }

    
    const hashedPassword = await bcrypt.hash(data.password,10)
    data.password = hashedPassword
    const user = await User.create(data)
    const userData = user.toObject()
    delete userData.password
    return {user:userData}
}
const loginService = async(data)=>{
    const user = await User.findOne({email:data.email})
    if(!user){
        return {error:"Invalid email or password"}
    }
    const isMatch = await bcrypt.compare(data.password,user.password)
    if(!isMatch){
        return {error:"Invalid email or password"}
    }
    const token = jwt.sign({id:user._id,email:user.email},process.env.JWT_SECRET,{expiresIn:"7d"})
    return {token}
}


const isEmailExist =async(email)=> {
    const isEmail = await User.findOne({email})
    console.log(isEmail)
}

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString()

const sendVerifyOtp = async(email)=>{
    const user = await User.findOne({email})
    if(!user){
        return {error:"User not found"}
    }

    const otp = generateOtp()
    const hashedOtp = await bcrypt.hash(otp,10)
    const otpExpiredAt = new Date(Date.now() + 60 * 1000)

    await Otp.deleteMany({userId:user._id})
    await Otp.create({userId:user._id,otp:hashedOtp,otpExpiredAt})

    await transporter.sendMail({
        from:process.env.SENDER_EMAIL,
        to:user.email,
        subject:"Verify your email",
        text:`Your OTP is ${otp}. It will expire in 5 minutes.`
    })

    return {message:"OTP sent successfully"}
}

const verifyOtp = async(email,otp)=>{
    const user = await User.findOne({email})
    if(!user){
        return {error:"User not found"}
    }

    const otpData = await Otp.findOne({userId:user._id}).sort({createdAt:-1})
    if(!otpData){
        return {error:"OTP not found or expired"}
    }

    if(otpData.otpExpiredAt < new Date()){
        await Otp.deleteOne({_id:otpData._id})
        return {error:"OTP expired"}
    }

    const isMatch = await bcrypt.compare(otp,otpData.otp)
    if(!isMatch){
        return {error:"Invalid OTP"}
    }

    await Otp.deleteOne({_id:otpData._id})
    return {message:"OTP verified successfully"}
}

module.exports = {registerService,loginService,isEmailExist,sendVerifyOtp,verifyOtp}
