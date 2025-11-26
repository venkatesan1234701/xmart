const express = require('express')
const router = express.Router()
const passport = require("../../config/passport")
const authController = require('../../controller/user/authController')
const shopcontroller = require('../../controller/user/shopcontroller')
const reviewController = require('../../controller/user/Review')
const addresscontroller = require('../../controller/user/address')
const cardController = require('../../controller/user/cardcontroller')
const checkoutController = require('../../controller/user/checkout')
// const WishlistCotroller = require('../../controller/user/wishlistController')
const WishlistCotroller= require('../../controller/user/wishlistController')
const walletController = require('../../controller/user/walletController')
const mailcontroller = require('../../controller/user/mailcontroller')

// const orderController = require('../../controller/user/orderController')
const upload = require("../../config/multer");
const {Authenticated} = require('../../middleware/Userblock')
const {isAuthenticated} = require('../../middleware/userAuth')
// const Wishlist = require('../../models/Wishlist')

// router.get('/change-mail', mailcontroller.renderChangeMail);





router.get('/',authController.gethomepage)
router.get('/signin', authController.getSigninPage)
router.post("/logout", authController.logout)
router.post('/signin', authController.postSignin)
router.post('/resend-verification',isAuthenticated, authController.resendVerification)

router.get('/signup', authController.getSignupPage)
router.post('/signup', authController.postSignup)

router.get('/forgot-password', authController.getForgotPassword)
router.post('/forgot-password', authController.postForgotPassword)
router.post('/api/check-password-match', authController.checkPasswordMatch)

router.post("/resend-otp", authController.resendOtp)
router.post("/verify-otp",authController.verifyOtp)

router.get("/reset-password", authController.getResetPassword)
router.post("/reset-password", authController.postResetPassword)

router.get('/auth/google/signup', passport.authenticate('google', { scope: ['profile', 'email'] }))
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/')
})


router.post("/check-referral",authController.checkReferral)


router.get('/shop',shopcontroller.getShopPage)
router.get("/product/:id",shopcontroller.getSingleProductPage)

router.post('/reviews/add',isAuthenticated, reviewController.addReview);
router.get('/reviews/:productId',isAuthenticated, reviewController.getProductReviews);

router.post("/add",WishlistCotroller.addToWishlist)
router.get("/wishlist", WishlistCotroller.getWishlistPage)
router.delete("/wishlist/delete", WishlistCotroller.deleteWishlistItem)



router.post('/cart/add', isAuthenticated, shopcontroller.addToCart);
router.get('/cart/get', isAuthenticated, shopcontroller.getCartTotals);

router.get("/card", Authenticated, cardController.getCartPage);
router.post('/cart/update-quantity',cardController. updateCartQuantity)
router.get("/cart/check-stock",cardController.checkLatestStock);
router.get('/cart/validate-before-checkout',cardController.validateBeforeCheckout);

router.post("/move-to-cart",cardController. moveToCart)

// router.get('/remove-from-cart/:productId',cardController. removeFromCart);

router.post("/verify", checkoutController.verifyPayment)
router.get("/failed", checkoutController.paymentFailed)

router.get("/checkout",checkoutController. getCheckoutPage)
router.post("/checkout", checkoutController.checkout)
router.post("/create-repay-order", checkoutController.createRepayOrder);
router.post("/payment/verify-repay", checkoutController.verifyRepayPayment);

router.get("/wallet", walletController.getWalletPage)
router.post("/wallet/create-order", walletController.createWalletOrder);
router.post("/wallet/verify", walletController.verifyWalletPayment);


router.post('/apply-coupon',cardController.applyCoupon)



router.get("/orders", checkoutController.getUserOrders)
// router.delete("/user/orders/:id",checkoutController. cancelOrderController);
router.put("/user/orders/:id/cancel-item",checkoutController. cancelSingleItem);
router.put("/orders/:orderId/return-item",checkoutController.returnOrderItem)

// Example in Express
router.delete('/cart/remove/:productId/:selectedSize',cardController. removeFromCart);



router.get("/profile", shopcontroller.getProfilePage);
router.get("/edit-profile", shopcontroller.getEditProfile);
router.post("/edit-profile", shopcontroller.updateProfile);
router.post("/profile/upload", upload.single("profile"), shopcontroller.uploadProfileImage);

router.get("/add-address", addresscontroller.getAddAddress);
router.post("/add-address", addresscontroller.postAddAddress);
router.post('/delete-address/:id', addresscontroller.deleteAddress);
router.get("/edit-address/:id", addresscontroller.getEditAddress);
router.post("/edit-address/:id",addresscontroller. postEditAddress);

// router.get('/orders', orderController.getOrdersPage)


router.get("/change-mail", mailcontroller.renderChangeMail);
router.post("/send-otp", mailcontroller.sendOtp);
router.post("/verify-mailotp", mailcontroller.verifyOtp);

// router.post("/send-otp", mailcontroller.sendOtp);
// router.post("/verify-mailotp", mailcontroller.verifyOtp);


router.get('/search-products',shopcontroller.searchProducts)

module.exports = router
