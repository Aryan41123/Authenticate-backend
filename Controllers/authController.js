import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import userModel from "../Models/userModel.js"
import transporter from "../config/nodeMailer.js"


export const register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.json({ success: false, message: "Missing details" });
    }

    try {
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new userModel({ name, email, password: hashedPassword });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: 'Welcome to Arimu',
            text: `Welcome to Lex Corp. Your account has been created with email: ${email}`
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: "User created and email sent." });

    } catch (error) {
        console.error("Register error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};


export const login = async (req, res) => {
    const { email, password } = req.body;  // Destructure email and password from the request body


    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Please provide both email and password" });
    }

    try {

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Step 3: Compare the provided password with the hashed password stored in the database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: "Invalid credentials" });
        }

        // Step 4: Generate a JWT token with the user id
        const token = jwt.sign(
            { id: user._id },                       // Payload: user ID
            process.env.JWT_SECRET,                  // Secret key (should be stored in .env)
            { expiresIn: '7d' }                      // Token expiration: 7 days
        );

        // Step 5: Send the token in a cookie to the client
        res.cookie('token', token, {
            httpOnly: true,                         // Prevent JavaScript access
            secure: process.env.NODE_ENV === 'production',  // Set to true in production (HTTPS)
            samesite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', // CSRF protection
            maxAge: 7 * 24 * 60 * 60 * 1000         // Token expires in 7 days
        });

        // Step 6: Respond to the client with success
        return res.status(200).json({ success: true, message: "Login successful" });

    } catch (error) {
       
        return res.status(500).json({ success: false, message: "Server error" });
    }
};


export const logout = (req, res) => {
    try {
        // Step 1: Clear the cookie by setting its value to an empty string and maxAge to 0
        res.clearCookie('token', {
            httpOnly: true,                       // Ensure the cookie is not accessible via JavaScript
            secure: process.env.NODE_ENV === 'production',  // Set to true in production (HTTPS)
            samesite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',  // CSRF protection
            maxAge: 0                             // Set maxAge to 0 to delete the cookie immediately
        });

        // Step 2: Send a success response
        return res.status(200).json({ success: true, message: "Logged out successfully" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};


export const sendVerifyOtp = async (req, res) => {
    const { userId } = req.body;
    const user = await userModel.findById(userId)
    if (user.isAccountVerified) {
        return res.json({ success: false, message: 'account aleready verified' })
    }
    const otp = Math.floor(100000 + Math.random() * 900000);


    user.verifyOtp = otp;
    user.verifyOtpExpireAt = Date.now() + 30 * 60 * 1000; // OTP expires in 30 minutes
    await user.save()


    const mailOptions = {
        from: process.env.SENDER_EMAIL,  // Your sender email
        to: user.email,  // The user's email address
        subject: 'Your OTP for Account Verification',
        text: `Your OTP is: ${otp}. It will expire in 10 minutes.`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent');
        return res.status(200).json({ success: true, message: "Successfully created and email sent." });
    } catch (error) {
        console.log('Error sending email:', error);
        return res.status(500).json({ success: false, message: 'Failed to send welcome email' });
    }
};

export const verifyEmail = async (req, res) => {
    const { userId, otp } = req.body;
   
    if (!userId || !otp) {
        return res.status(500).json({ success: false, message: 'missing details' });
    }
    console.log("hello");
    try {
        const user = await userModel.findById(userId)
        if (!user) {
            return res.status(500).json({ success: false, message: 'user not found' });
        }
        if (user.verifyOtp !== otp) {
            return res.status(500).json({ success: false, message: 'invalid otp' });
        }
        if (user.verifyOtpExpireAt < Date.now()) {
            return res.status(500).json({ success: false, message: 'otp expired' });
        }
        user.isAccountVerified = true;
        user.verifyOtp = '';
        user.verifyOtpExpireAt = 0;

        await user.save()
        return res.json({ success: true, message: 'email verified' })
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to send welcome email' });

    }

}
export const verifyResetOtp = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.restOtp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        if (user.resetOtpExpireAt < Date.now()) {
            return res.status(400).json({ success: false, message: "OTP has expired" });
        }

        return res.status(200).json({ success: true, message: "OTP verified" });

    } catch (error) {
        console.error("OTP verification error:", error);
        return res.status(500).json({ success: false, message: "Server error during OTP verification" });
    }
};


export const isAuthenticated = async (req, res) => {
    try {
        return res.json({ success: true })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export const sentresetOtp = async (req, res) => {
    const { email } = req.body
    if (!email) {
        return res.status(400).json({ success: false, message: " Email is Required" });
    }
    try {
        const user = await userModel.findOne({ email })
        if (!user) return res.json({ success: false, message: 'User not found' })
        const otp = Math.floor(100000 + Math.random() * 900000);
        user.restOtp = otp;
        user.resetOtpExpireAt = Date.now() + 30 * 60 * 1000;
        await user.save()


        const mailOptions = {
            from: process.env.SENDER_EMAIL,  // Your sender email
            to: user.email,  // The user's email address
            subject: 'Your OTP for Password Reset',
            text: `Your OTP is: ${otp}. It will expire in 10 minutes.`
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Email sent');
            return res.status(200).json({ success: true, message: "Otp sent to your email." });
        } catch (error) {
            console.log('Error sending email:', error);
            return res.status(500).json({ success: false, message: 'Failed to send RestOtp email' });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

export const resetPassword = async (req, res) => {
    const { email, newpass, otp } = req.body;

console.log(newpass);
    if (!email || !newpass || !otp) {
        return res.status(400).json({ success: false, message: "Please provide email, new password, and OTP" });
    }

    try {
        // Step 1: Find the user by email
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        console.log('hello');

        // Step 2: Check if the OTP matches and if it's not expired
        if (user.restOtp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        if (user.resetOtpExpireAt < Date.now()) {
            return res.status(400).json({ success: false, message: "OTP has expired" });
        }

        // Step 3: Hash the new password
        const hashedPassword = await bcrypt.hash(newpass, 10);

        // Step 4: Update the user's password and clear OTP details
        user.password = hashedPassword;
        user.restOtp = '';  // Clear the OTP
        user.resetOtpExpireAt = 0;  // Clear the OTP expiration time

        await user.save();

        // Step 5: Respond with success message
        return res.status(200).json({ success: true, message: "Password has been reset successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};


// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import userModel from "../Models/userModel.js";
// import transporter from "../config/nodeMailer.js";

// // ---------------------- REGISTER ----------------------
// export const register = async (req, res) => {
//     const { name, email, password } = req.body;

//     if (!name || !email || !password) {
//         return res.json({ success: false, message: "Missing details" });
//     }

//     try {
//         const existingUser = await userModel.findOne({ email });
//         if (existingUser) {
//             return res.json({ success: false, message: "User already exists" });
//         }

//         const hashedPassword = await bcrypt.hash(password, 10);
//         const user = new userModel({ name, email, password: hashedPassword });
//         await user.save();

//         const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

//         res.cookie('token', token, {
//             httpOnly: true,
//             secure: process.env.NODE_ENV === 'production',
//             sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
//             maxAge: 7 * 24 * 60 * 60 * 1000
//         });

//         const mailOptions = {
//             from: process.env.SENDER_EMAIL,
//             to: email,
//             subject: 'Welcome to Arimu',
//             text: `Welcome to Lex Corp. Your account has been created with email: ${email}`
//         };

//         await transporter.sendMail(mailOptions);
//         return res.status(200).json({ success: true, message: "User created and email sent." });

//     } catch (error) {
//         console.error("Register error:", error);
//         return res.status(500).json({ success: false, message: error.message });
//     }
// };


// // ---------------------- LOGIN ----------------------
// export const login = async (req, res) => {
//     const { email, password } = req.body;

//     if (!email || !password) {
//         return res.status(400).json({ success: false, message: "Please provide both email and password" });
//     }

//     try {
//         const user = await userModel.findOne({ email });
//         if (!user) return res.status(404).json({ success: false, message: "User not found" });

//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) return res.json({ success: false, message: "Invalid credentials" });

//         const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

//         res.cookie('token', token, {
//             httpOnly: true,
//             secure: process.env.NODE_ENV === 'production',
//             sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
//             maxAge: 7 * 24 * 60 * 60 * 1000
//         });

//         return res.status(200).json({ success: true, message: "Login successful" });

//     } catch (error) {
//         return res.status(500).json({ success: false, message: "Server error" });
//     }
// };
