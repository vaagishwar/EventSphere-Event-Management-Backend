const express = require('express')
const userRouter = express.Router()
const controller = require('../controller/user.controller.js')




userRouter.post('/',controller.createUser)
userRouter.get('/',controller.getAllUser)
userRouter.get('/:id',controller.getUser)
userRouter.put("/:id", controller.updateUserById);
userRouter.delete("/:id", controller.deleteUserById);

userRouter.patch("/update-many", controller.updateManyUser);



module.exports = userRouter;
