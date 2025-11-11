
const User  = require("../../models/userSchema")
const Address  = require('../../models/address')
const mongoose = require("mongoose");


const getAddAddress = (req, res) => {
  if (!req.session.user) return res.redirect("/signin");
  res.render("user/add-address", { user: req.session.user, error: null, success: null });
};

const postAddAddress = async (req, res) => {
  if (!req.session.user) return res.redirect("/signin");

  const user = req.session.user;
  const { firstName, addressType, addressLine1, addressLine2, city, state, country, zipCode } = req.body;

  try {
    const newAddress = new Address({
      userId: user.id,
      firstName,
      addressType,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      zipCode
    });

    await newAddress.save();

   
    res.render("user/add-address", { success: "Address saved successfully!", error: null, user });
  } catch (err) {
    console.error("Address save error:", err);
    res.render("user/add-address", { error: "Failed to save address", success: null, user });
  }
};


const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;

 
    await Address.findByIdAndUpdate(addressId, { isActive: false });

    res.redirect('/profile');
  } catch (err) {
    console.error('Delete Address Error:', err);
    res.redirect('/profile'); 
  }
};


const addressCache = new Map();

const getEditAddress = async (req, res) => {
  try {
    const sessionUser = req.session.user;
    if (!sessionUser || !sessionUser.id) return res.redirect("/signin");

    const addressId = req.params.id;

   
    const cacheKey = `${sessionUser.id}:${addressId}`;
    let address = addressCache.get(cacheKey);

    if (!address) {
      console.time("DB Query");
      address = await Address.findOne(
        { _id: addressId, userId: sessionUser.id, isActive: true },
        { firstName: 1, secondName: 1, addressLine1: 1, addressLine2: 1, city: 1, state: 1, country: 1, zipCode: 1, phone: 1, addressType: 1 } // only needed fields
      ).lean();
      console.timeEnd("DB Query");

      if (!address) return res.redirect("/user/profile");

     
      addressCache.set(cacheKey, address);
      setTimeout(() => addressCache.delete(cacheKey), 60 * 1000);
    }

    res.render("user/edit-address", { address, success: null, error: null });

  } catch (err) {
    console.error("Get Edit Address Error:", err);
    res.status(500).send("Server Error");
  }
};

const postEditAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const { firstName, addressLine1, addressLine2, city, state, country, zipCode, addressType } = req.body;

    await Address.findByIdAndUpdate(addressId, {
      firstName,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      zipCode,
      addressType,
    });

    res.render("user/edit-address", { address: req.body, success: true, error: null });
  } catch (err) {
    console.error("Edit Address Error:", err);
    res.render("user/edit-address", { address: req.body, success: false, error: "Failed to update address" });
  }
};



module.exports = {
  getAddAddress,
  postAddAddress,
  deleteAddress,
  getEditAddress,
  postEditAddress
}

