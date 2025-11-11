const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,       
  secure: true,    
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false }, 
})

transporter.verify((err, success) => {
  if (err) console.error("Mailer connection error:", err)
  else console.log("Mailer ready to send emails!")
})

module.exports = transporter;




