const service = require('../services/user.service.js')
const bcrypt = require('bcrypt')
const createUser = async (req,res) => {
    
    const {name, email, password} = req.body;
    const data = req.body;

    if(!name||!email||!password){
        return res.json({status:"failed",message:"Name,email and pass req*"})
    }

    const hashedpwd = await bcrypt.hash(password,10)
    data.password = hashedpwd;
    console.log(data)

    try{

        const result = await service.createUserService(data)
        res.json({status:"success",message:"user created",data:result})


    }catch(e){
        res.json({status:"failed",message:"unable to createuser service"})
    }


}

const getUser = async(req,res)=>{

    const userId = req.params.id;
    console.log("req.params.id is",userId)

    try{
        const user = await service.getUserService(userId)
        if(user==null){
            res.json({status:"failed",message:"User Not found in db"})
        }else{
            res.json({status:"Success",data:user})
        }
    }catch(e){
        res.json({status:"failed", message:"unable to getUser service"})
    }
}

const getAllUser = async(req,res)=>{
    try{
        const allUsers = await service.getAllUserService()
        res.json({status:"Success",data:allUsers})
    }catch(e){
        res.json({status:"failed", message:"unable to getAllUser service"})
    }
}

const updateUserById = async(req,res)=>{

    const id = req.params.id;

    try{
        const updatedUser = await service.updateUserByIdService(id,req.body)
        if(updatedUser==null){
            res.json({status:"failed",message:"User Not found in db"})
        }else{
            res.json({status:"Success",data:updatedUser})
        }
    }catch(e){
        res.json({status:"failed", message:"unable to updateUser service"})
    }
}
const deleteUserById = async(req,res)=>{

    try{
        const deletedUser = await service.deleteUserByIdService(req.params.id)
        if(deletedUser==null){
            res.json({status:"failed",message:"User Not found in db"})
        }else{
            res.json({status:"Success",data:deletedUser})
        }
    }catch(e){
        res.json({status:"failed", message:"unable to deleteUserById service"})
    }
}


const updateManyUser =async(req,res) => {
    try{
        // console.log("working")
        const updatedManyUser = await service.updatedManyUserService(req.body.filter, req.body.data)
        // console.log(updatedUser)
        if(updatedManyUser==null){
            res.json({status:"failed",message:"didn't updated data to all users"})
        }else{
            res.json({status:"success",message:"updated data to all users", updatedManyUser})
        }
    }catch(e){
        res.json({status:"failed", message:"cannot abl to update"})
    }
}

module.exports = {
createUser,getUser,
getAllUser,
updateUserById,
deleteUserById,
updateManyUser
}
