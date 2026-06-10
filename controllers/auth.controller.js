const service = require("../services/auth.service.js")
const emailRegexTest = require("../utils/regex.js")





const register = async (req, res) => {
    const data = req.body || {}
    const { name, email, password } = data
    if (!name || !email || !password ||name ===''||password=='') {
        return res.json({ message: "name, email and password required" })
    }


    if(!emailRegexTest(email))
        return res.json({message: "Invalid Email Format" })


    // service.isEmailExist(email);
    try {
        const result = await service.registerService(data)
        if (result.error) {
            return res.json({ message: result.error })
        }
        res.json({ message: "Register successful", data: result.user })
    } catch (e) {
        res.json({ message: e.message })
    }
}




const login = async (req, res) => {
    const data = req.body || {}
    const { email, password } = data
    if (!email || !password) {
        return res.json({ message: "email and password required" })
    }
    try {
        const result = await service.loginService(data)
        if (result.error) {
            return res.json({ message: result.error })
        }
        res.json({ message: "Login successful", token: result.token })
    } catch (e) {
        res.json({ message: e.message })
    }
}

const sendVerifyOtp = async (req, res) => {
    const { email } = req.body || {}
    if (!email) {
        return res.json({ message: "email required" })
    }
    if (!emailRegexTest(email)) {
        return res.json({ message: "Invalid Email Format" })
    }

    try {
        const result = await service.sendVerifyOtp(email)
        if (result.error) {
            return res.json({ message: result.error })
        }
        res.json({ message: result.message })
    } catch (e) {
        res.json({ message: e.message })
    }
}

const verifyOtp = async (req, res) => {
    const { email, otp } = req.body || {}
    if (!email || !otp) {
        return res.json({ message: "email and otp required" })
    }
    if (!emailRegexTest(email)) {
        return res.json({ message: "Invalid Email Format" })
    }

    try {
        const result = await service.verifyOtp(email, otp)
        if (result.error) {
            return res.json({ message: result.error })
        }
        res.json({ message: result.message })
    } catch (e) {
        res.json({ message: e.message })
    }
}





module.exports = { register, login, sendVerifyOtp, verifyOtp }
