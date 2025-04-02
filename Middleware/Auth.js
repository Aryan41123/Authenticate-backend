import jwt from "jsonwebtoken";


const Auth = async (req, res, next) => {
    try {
        const { token } = req.cookies;
        console.log(token);
        if (!token) {
            return res.json({ success: false, msg: "No authorized" });
        }
        const decode = jwt.verify(token, process.env.JWT_SECRET)
        if (decode.id) {
            req.body.userId = decode.id
        }
        next()

    } catch (error) {
        res.json({ success: false, msg: error.message });
    }

}


export default Auth; 