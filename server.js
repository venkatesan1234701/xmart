require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("./config/passport");
const cron = require('node-cron'); 
const ProductOffer = require('./models/productOfferModel')
// const passport = require("passport");
const authRouter = require("./routes/users/authRouter");
const adminRouter = require("./routes/admin/adminRouter");
const authMiddlewar = require('./middleware/adminAuth')
const checkblock = require('./middleware/checkBlockedUser')
const app = express();




// Cache prevent
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "-1");
  next();
});

// Admin session
app.use('/admin', session({
  name: 'admin.sid',
  secret: 'yourAdminSecret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));


// User session
app.use('/', session({
  name: 'user.sid',
  secret: 'yourUserSecret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));


app.use(session({
  name: 'user.sid',
  secret: 'yourStrongSecretKey',  // replace with a secure secret
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));


app.use(passport.initialize())
app.use(passport.session())

mongoose
  .connect("mongodb://127.0.0.1:27017/xmart")
  .then(() => console.log("MongoDB (xmart) connected successfully"))
  .catch((err) => console.error("Connection error:", err))

app.use(express.static(path.join(__dirname, "public")))
// app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
// app.use("/uploads", express.static(path.join(__dirname, "uploads")))
app.use(express.static('public'));
app.set("view engine", "ejs")
app.set('views', path.join(__dirname, 'views'));

app.use("/uploads", express.static("uploads"));
app.use("/images", express.static("public/images"));


// app.use(express.static('public'));
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use("/admin/orders", adminRouter)

// app.use(checkblock)
// app.use("/wishlist", authRouter)
// app.use("/payment", authRouter)
// app.use("/user", authRouter);
// app.use("/", authRouter)
// app.use("/admin", adminRouter)

app.use("/", authRouter);               
app.use("/user", authRouter);           
app.use("/wishlist", authRouter);           
app.use("/payment", authRouter);             
app.use("/admin", adminRouter);              
app.use(checkblock); 


app.use((req, res, next) => {
  res.status(404).render("user/error")
})

app.use((req, res, next) => {
  res.status(404).render("admin/Adminerror")
})


cron.schedule('0 0 * * *', async () => {
  const now = new Date();
  await ProductOffer.updateMany(
    { endDate: { $lt: now }, isListed: true },
    { $set: { isListed: false } }
  );
  console.log('🕛 Auto-unlisted expired product offers');
});


app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack)
  res.status(500).send("Something went wrong on our side! ")
})


app.get("/dashboard", (req, res) => {
  if (!req.user) return res.redirect("/signin")
  res.send(`Welcome ${req.user.firstName}! You are logged in.`)
})

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
})


