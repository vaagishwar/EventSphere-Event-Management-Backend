const User = require('../models/user.model.js')

const createUserService = async(data)=>{
        
    const user = await User.create(data)
    return user

}

const getUserService = async(userId) =>{
    const user = await User.findById(userId);
    return user
}
const getAllUserService = async() =>{
    const users = await User.find();
    return users
}
const updateUserByIdService = async(userId,data) =>{
    const user = await User.findByIdAndUpdate(userId,data);
    return await User.findById({_id:userId});
}
const deleteUserByIdService = async(userId) =>{
    const user = await User.findByIdAndDelete(userId);
    return user
}
const updatedManyUserService = async(filter, data) =>{
    console.log("hi")
    const users = await User.updateMany(filter,data);
    return users
}

module.exports ={createUserService,getUserService,getAllUserService,updateUserByIdService,deleteUserByIdService,updatedManyUserService}