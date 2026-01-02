const express = require('express')
const router = express.Router()
const passport = require("../../config/passport")
const authController = require('../../controller/user/authController')
const shopcontroller = require('../../controller/user/shopcontroller')
const reviewController = require('../../controller/user/Review')
const addresscontroller = require('../../controller/user/address')
const cardController = require('../../controller/user/cardcontroller')
const checkoutController = require('../../controller/user/checkout')
const WishlistCotroller= require('../../controller/user/wishlistController')
const walletController = require('../../controller/user/walletController')
const mailcontroller = require('../../controller/user/mailcontroller')
const AuthPagesForLoggedInUsers = require('../../middleware/auth')

const upload = require("../../config/multer");
const {Authenticated} = require('../../middleware/Userblock')
const {isAuthenticated} = require('../../middleware/userAuth')






router.get('/',authController.gethomepage)
router.get('/signin',AuthPagesForLoggedInUsers, authController.getSigninPage)
router.post("/logout", authController.logout)
router.post('/signin', authController.postSignin)
router.post('/resend-verification',isAuthenticated, authController.resendVerification)

router.get('/signup',AuthPagesForLoggedInUsers, authController.getSignupPage)
router.post('/signup',AuthPagesForLoggedInUsers, authController.postSignup)

router.get('/forgot-password',AuthPagesForLoggedInUsers,authController.getForgotPassword)
router.post('/forgot-password',AuthPagesForLoggedInUsers, authController.postForgotPassword)
router.post('/api/check-password-match', authController.checkPasswordMatch)

router.post("/resend-otp",AuthPagesForLoggedInUsers, authController.resendOtp)
router.post("/verify-otp",AuthPagesForLoggedInUsers,authController.verifyOtp)

router.get("/reset-password",AuthPagesForLoggedInUsers, authController.getResetPassword)
router.post("/reset-password",AuthPagesForLoggedInUsers,authController.postResetPassword)


router.get("/auth/google",AuthPagesForLoggedInUsers, authController.authenticateGoogle);
router.get("/auth/google/callback",AuthPagesForLoggedInUsers, authController.googleCallBack);



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
router.post('/cancel-coupon',cardController.cancelCoupon);



router.get("/orders", checkoutController.getUserOrders)
router.put("/user/orders/:id/cancel-item",checkoutController. cancelSingleItem);
router.put("/orders/:orderId/return-item", checkoutController.returnOrderItem);




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


router.get('/changepassword',WishlistCotroller.changepassword)
router.post("/changepassword",WishlistCotroller.postchangepass);
router.post("/validate-checkout",cardController.validateBeforeCheckout)
router.get("/change-mail", mailcontroller.renderChangeMail);
router.post("/send-otp", mailcontroller.sendOtp);
router.post("/verify-mailotp", mailcontroller.verifyOtp);



router.get('/search-products',shopcontroller.searchProducts)
router.get("/blocked", (req, res) => {
  res.render("user/blocked");
});


module.exports = router
