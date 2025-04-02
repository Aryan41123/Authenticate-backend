import userModel from "../Models/userModel.js";

export const getUser = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await userModel.findById(userId)

        console.log(user);
        if (!user) {
            return res.json({ success: true, message: 'user not found' })
        }
        res.json({
            success: true,
            userData: {
                name: user.name,
                isAccountVerified: user.isAccountVerified
            }
        })

    } catch (error) {
        res.json({ success: false, message: error })
    }
}