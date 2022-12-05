require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const {body, validationResult} = require('express-validator');
const path = require("path");
const mongoose = require('mongoose');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const multer = require("multer");
const bcrypt = require('bcrypt');
const fs = require('fs');

const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 180000}
}));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});
const upload = multer({ storage: storage });

mongoose.connect('mongodb://localhost:27017/recyclingDatabase');
// mongoose.connect("mongodb+srv://eshqin-hasanov:esqin@to-do-list.jfsv7.mongodb.net/?retryWrites=true&w=majority");

const userSchema = new mongoose.Schema({
    name: {type: String, required: true},
    surname: {type: String, required: true},
    location: {type: String, required: true},
    email: {type: String, unique: true, required: true},
    password: {type: String, required: true},
    isSeller: {type: Boolean, required: true},
});

var productSchema = new mongoose.Schema({
    owner: String,
    name: String,
    categorie: String,
    quantity: Number,
    weight: Number,
    description: String,
    price: String,
    main_img:
    {
        data: Buffer,
        contentType: String
    }
});


const productModel = mongoose.model("product", productSchema);
const User = mongoose.model('User', userSchema);


app.get('/profile', function (req, res) {
    if (req.cookies.current_user) {
        const userParams = req.cookies.current_user;
        console.log(userParams);
        res.render('profile', 
            {
                name: userParams.name, 
                surname: userParams.surname,
                location: userParams.location,
                email: userParams.email
            });
    } else {
        res.redirect('/login');
    }
})

app.get('/register', function (req, res) {
    res.render('register', 
        {
            nameError: null, 
            surnameError: null, 
            locationError: null, 
            emailError: null, 
            passwordErrors: null,
            confirm_pass_error: null,
            current_params: null
        }
    );
});


app.get('/home', function (req, res) {
    res.render('homepage');
});


app.get('/about', function (req, res) {
    res.render('about');
});

app.get('/editprofile',  function (req, res) {
    res.render("edit_profile");
})

app.get('/addproduct', function (req, res) {
    if (req.session.isAuth) {
        res.render('add_product');
    } else {
        res.redirect('/login')
    }
});

app.get("/shop",  (req, res) => {
    productModel.find({}, (err, products) => {
      if (err) {
            console.log(err);
            res.status(500).send("An error occurred", err);
      } else {
          if (req.cookies.current_user) {
                const current_user = req.cookies.current_user;
                res.render("shop_page", {products: products, name: current_user.name});
            } else {
                res.render("shop_page", {products: products, name: "undefined"});
            }
      }
    });
});


app.get('/login', function (req, res) {
    res.render('login', {emailError: null, passwordError: null, curr_email: null});
})


app.get("/products/:id", function (req, res) {
    res.render("product");
});


app.post('/addproduct', upload.single("main_image"), function (req, res) {
    if (req.session.isAuth) {
        const {product_name, product_categorie, available_quantity, product_weight, product_description, price} = req.body;
        const owner = req.cookies.current_user.email;
        const newProduct = new productModel(
            {
                owner: owner,
                name: product_name,
                categorie: product_categorie,
                quantity: available_quantity,
                weight: product_weight,
                description: product_description,
                price: price,
                main_img: {
                    data: fs.readFileSync(path.join(__dirname + "/uploads/" + req.file.filename)),
                    contentType: "image/png"
                }
            }
        );
        newProduct.save((err) => {
            err ? console.log(err) : res.redirect("/profile");
        });
    } else {
        res.redirect('/login')
    }
})





app.post('/register', 
    body('name').not().isEmpty().trim().withMessage('Name field cannot be empty'),
    body('surname').not().isEmpty().trim().withMessage('Surname field cannot be empty'),
    body('location').not().isEmpty().trim().withMessage('Location field cannot be empty'),
    body('email').isEmail().withMessage('This is not a valid email format').normalizeEmail(),
    body('pass').isLength({min: 5}).withMessage('Password length should be longer')
        .matches('[A-Z]').withMessage('Password should contain uppercase letters')
        .matches('[0-9]').withMessage('Password should contain a number')
    , async function (req, res) {
        const errors = validationResult(req);
        const {name, surname, location, email, pass, confirm_pass} = req.body;
        const current_params = [name, surname, location, email];
        if (errors.isEmpty()) {
            let nameError = null;
            let surnameError = null;
            let locationError = null;
            let emailError = null;
            let passwordErrors = [];
            User.findOne({email: email}, async function (err, result) {
                if (result) {
                    emailError = "This user has already registered";
                    res.render('register', 
                        {
                            nameError: null, 
                            surnameError: null, 
                            locationError: null, 
                            emailError: emailError, 
                            passwordErrors: null,
                            confirm_pass_error: null,
                            current_params: current_params
                        }
                    );
                } else if (pass !== confirm_pass){
                    res.render('register', 
                        {
                            nameError: null, 
                            surnameError: null, 
                            locationError: null, 
                            emailError: null, 
                            passwordErrors: null,
                            confirm_pass_error: "Confirmation password does not match",
                            current_params: current_params
                        }
                    );
                } else {
                    const passwordHash = await bcrypt.hash(pass, 12);
                    const newUser = new User({
                        name: name,
                        surname: surname, 
                        location: location,
                        email: email,
                        password: passwordHash,
                        isSeller: false
                    });
                    await newUser.save();
                    res.redirect("/login")
                }
            })
        } else {
            let nameError = null;
            let surnameError = null;
            let locationError = null;
            let emailError = null;
            let passwordErrors = [];
            const errorArray = errors.array();
            console.log(errorArray);
            errorArray.forEach(elem => {
                if (elem.param === 'name') {
                    nameError = elem.msg;
                }
                if (elem.param === 'surname') {
                    surnameError = elem.msg;
                }
                if (elem.param === 'location') {
                    locationError = elem.msg;
                }
                if (elem.param === 'email') {
                    emailError = elem.msg;
                }
                if (elem.param === 'pass') {
                    if (passwordErrors.length < 3) {
                        passwordErrors.push(elem.msg);
                    }
                }
            });
            res.render('register', 
                {
                    nameError: nameError, 
                    surnameError: surnameError, 
                    locationError: locationError, 
                    emailError: emailError, 
                    passwordErrors: passwordErrors,
                    confirm_pass_error: null,
                    current_params: current_params
                }
            );
        }
});


app.post('/login', 
    body('email').trim().not().isEmpty().withMessage('Please, fill username'),
    body('pass').not().isEmpty().withMessage('Please, fill password')
    , function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const loginErrors = errors.array();
            let emailError = null;
            let email = req.body.email;
            let passwordError = null;
            loginErrors.forEach(elem => {
                if (elem.param === 'email') {
                    emailError = elem.msg;
                }
                if (elem.param === 'pass') {
                    passwordError = elem.msg;
                }
            });
            res.render('login', {emailError: emailError, passwordError: passwordError, curr_email: email});           
        } else{ 
            const {email, pass} = req.body;
            let passwordError = null;
            let emailError = null;
            User.findOne({email: email}, async function (err, result) {
                if (err) throw err;
                if (!result) {
                    emailError = 'This user does not exist!';
                    console.log(email);
                    res.render('login', {emailError: emailError, passwordError: passwordError, curr_email: email});
                } else {
                    await bcrypt.compare(pass, result.password, function (err, matches) {
                        if(matches) {
                            res.cookie('current_user', 
                                {
                                    name: result.name, 
                                    surname: result.surname,
                                    location: result.location,
                                    email: result.email
                                }, 
                                    {maxAge: 180000}
                            );
                            req.session.isAuth = true;
                            res.redirect('/shop');
                        } else {
                            passwordError = "Password incorrect";
                            res.render('login', {emailError: emailError, passwordError: passwordError, curr_email: email})
                        }
                    })
                }
            })
        }
})

app.get('/logout', function (req, res) {
    res.clearCookie("current_user");
    req.session.isAuth = false;
    res.redirect("/shop")
})

app.listen(3000, function () {
    console.log('Server started');
});
