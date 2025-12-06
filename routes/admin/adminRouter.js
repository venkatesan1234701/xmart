const express = require('express')
const router = express.Router()
const authController = require('../../controller/admin/adminLogin')
const productcontroller = require('../../controller/admin/productController')
const upload = require('../../config/multer')
const categories = require('../../controller/admin/category')
const adminOrder = require('../../controller/admin/adminOrder')
const couponController = require('../../controller/admin/couponController')
const productOfferController = require('../../controller/admin/productOfferController')
const categoryOfferController = require('../../controller/admin/categoryoffer')
const adminAuth = require('../../middleware/adminAuth')


router.get('/login', authController.renderSignInPage)
router.post('/login', authController.signIn)
router.get('/logout', authController.adminLogout)
router.get('/dashboard',adminAuth,authController.getDashboard)
router.get('/orders-summary',adminAuth,authController.getOrdersSummary)
const imageFields = [
  { name: "image0", maxCount: 1 },
  { name: "image1", maxCount: 1 },
  { name: "image2", maxCount: 1 }
];
router.get('/products/search', productcontroller.searchProducts)

router.get("/products",adminAuth, productcontroller.renderProductsPage)
router.get("/products/add", productcontroller.getAddProductPage)
router.post("/products/add", upload.fields(imageFields), productcontroller.addProduct)
router.get("/products/:id", productcontroller.getProductById)
router.post("/products/edit/:id", upload.fields(imageFields), productcontroller.updateProduct)
router.get("/products/delete/:id", productcontroller.deleteProduct);


// router.get('/search', productcontroller.searchProducts);
// router.js
// routes/admin.js
// routes/admin.js

router.get('/sales-report',adminAuth,authController.getSalesReport)

router.get('/customers',adminAuth,authController.renderCustomers)
// router.get('/customers/search', authController.searchCustomers);
router.get('/customers/search', authController.earchCustomers)



router.put('/users/block/:id',authController.toggleBlockUser)

router.get("/categories",adminAuth, categories.renderCategories)
router.get("/categories/json", categories.getCategories)
router.post("/categories/add", categories.addCategory)
router.patch('/category/toggle-block/:id',categories.toggleBlockCategory)
router.get("/categories/delete/:id",categories.deleteCategory)
router.get("/categories/edit/:id",categories. getEditCategory)
router.post("/categories/edit/:id",categories.postEditCategory)
router.post('/categories/toggle/:id',categories.toggleCategory)
router.get('/categories/search', categories.searchCategories)


router.get("/orders", adminOrder.getAllOrders)
router.get("/singleOrder/:id", adminOrder.getSingleOrder)


router.get('/coupons', couponController.getCoupons);
router.post('/coupons/add', couponController.addCoupon)
router.put('/coupons/edit/:id', couponController.updateCoupon);
router.get("/coupons/json/:id", couponController.getCouponById)
router.delete('/coupons/delete/:id', couponController.deleteCoupon)


router.get('/product-offer', adminAuth, productOfferController.getProductOffers);
router.post("/productOffers/addOffer",adminAuth,productOfferController.addOffer)
router.put("/productOffers/updateOffer",adminAuth, productOfferController.updateOffer);
router.delete("/productOffers/delete/:id",adminAuth, productOfferController.deleteOffer)

router.get('/category-offer',adminAuth,categoryOfferController.getCategoryOfferPage)
router.post('/category-offer/add',adminAuth,categoryOfferController.addCategoryOffer)
router.put('/category-offer/update/:id', adminAuth, categoryOfferController.updateCategoryOffer)
router.delete('/category-offer/delete/:id', adminAuth, categoryOfferController.deleteCategoryOffer);


router.post("/updateOrderStatus/:orderId", adminOrder.updateOrderStatus)
// router.put("/admin/orders/:orderId/approve-returns", adminOrder.approveAllReturns);

router.put("/orders/:orderId/approve-returns", adminOrder.approveAllReturns);


router.get('/dashboard', (req, res) => {
  if (req.session.isAdminLogged) {
    res.render('admin/dashboard')
  } else {
    res.redirect('/admin/login')
  }
})

function isAdminAuth(req, res, next) {
  if (req.session && req.session.isAdminLogged) {
    return next()
  }
  return res.redirect('/admin/login')
}

module.exports = router
