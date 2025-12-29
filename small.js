
const bycrup = require('bcrypt')
const User = require('./models/userSchema')
const product = require('./models/productModel')
const { use } = require('passport')


//                  ============================           LOGIN  =================


const login = async(req,res) => {
    try{
      
        const {name,password,email} = req.body

        if(!name || !password || !email){
            return res.send('please fill the all inputs')
        }

        const user = await User.findOne({email})

        if(!user){
            return res.send('user not found')
        }

        const hashpassword = await bycrup.hash(password,10)

        const usernew = new User({
            name,
            password:hashpassword,
            email
        })

        await usernew.save()

        return res.send('success')

    }
    catch(err){
        console.log(err)

        return res.send('not success')
    }
}







//                     ================================ UPDATE ==================


const update = async(req,res) => {
    try{

        const {name,password,email} = req.body

        if(!name || !password || !email){
            return res.send('fill the all inputs')
        }

        const user = await User.findOne({email})

        if(!user){
            return res.send("user not found")
        }

        if(name){
            user.name = name
        }

        if(password){
            const hashpassword = await bycrup.hash(password,10)
            user.password = hashpassword
        }

        await user.save()

        return res.send('update ')

    }
    catch(err){
        console.log(err)

        return res.send('not update')
    }
}


//                               ===================      REMOVE ========================



const remove = async(req,res) => {
    try{

const {email,password} = req.body

if(!email || !password){
    return res.send('fill tha input')
}

const user = await User.findOne({email})

if(!user){
    return res.send('user not found')
}

if(password){
    const hashpassword = await bycrup.hash(password,10)
    user.password = hashpassword
}

await user.save()

return res.send('sueccss')

    }
    catch(err){
        console.log(err)
        return res.send('not remove')
    }
}



// ===========================  FETCH THE DATAS



const signin = async(req,res) => {
    try{
       const {email,password } = req.body
       
       if(!email || !password){
        return res.send('fill in this inputs')
       }

       const user = await User.findOne({email})

       if(!user){
        return res.send('user not found')
       }

       const match = await bycrup.compare(password,user.password)

       if(!match){
        return res.send('password not match')
       }

       req.session.user ={
        id : user.id,
        name : user.name,
        eamil : user.email
       }

      return res.redirect('/profile')

    }
    catch(err){
        console.log(err)
        return res.send('not success')
    }
}


//                         ========================    SHOW THE DATAS IN FRONEND ================ 


const profile = async(req,res) => {
    try{

        if(!req.session.user){
            return res.redirect('/login')
        }

        const user = await User.findById(req.session.user).lean()

        res.render('/profile',{user})

    }
    catch(err){
        console.log(err)
        return res.send('page error ')
    }
}



// ======================================== SHOW IMAGE IN FRONDEND SAID ===================



const image = async(req,res) => {
    try{

        const user = await User.findById(req.session.user)

        if(!user){
            return res.send('user not found')
        }

        res.render('profile',{user})

    }
    catch(err){
        console.log(err)
        return res.send('page not found')
    }
}



//                   =============================   SUM OF ALL NUBERS IN SHEMA 


const sum = async(req,res) => {
    try{

        const order = await product.find()

        const total = order.reduce((acc,order) => acc +order.total , 0)

        res.render('/profile',{order,total})

    }
    catch(err){
        console.log(err)
        return res.send('page not found')
    }
}








module.exports = {
    login,
    update,
    remove,
    signin,
    profile,
    sum,
    image
}

