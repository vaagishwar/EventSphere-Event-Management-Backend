
const emailRegexTest = (email) => {

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (emailRegex.test(email))
        return true
    else
        return false
}

module.exports = emailRegexTest;