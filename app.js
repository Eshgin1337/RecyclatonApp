require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const {body, validationResult} = require('express-validator');
const mongoose = require('mongoose');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');

const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 30000}
}));

// mongoose.connect('mongodb://localhost:27017/recyclingDatabase');
mongoose.connect("mongodb+srv://eshqin-hasanov:esqin@to-do-list.jfsv7.mongodb.net/?retryWrites=true&w=majority");

const userSchema = new mongoose.Schema({
    name: {type: String, required: true},
    surname: {type: String, required: true},
    location: {type: String, required: true},
    email: {type: String, unique: true, required: true},
    password: {type: String, required: true},
    isSeller: {type: Boolean, required: true},
});

const User = mongoose.model('User', userSchema);

app.get('/profile', function (req, res) {
    res.render('profile');
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


app.get('/login', function (req, res) {
    res.render('login', {emailError: null, passwordError: null, curr_email: null});
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
                    res.redirect("/home")
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
            console.log("------------------");
            console.log(passwordErrors);
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
                            res.redirect('/home');
                        } else {
                            passwordError = "Password incorrect";
                            res.render('login', {emailError: emailError, passwordError: passwordError, curr_email: email})
                        }
                    })
                }
            })
        }
})


app.post('/login', function (req, res) {
    res.send(req.body);
})

app.listen(3000, function () {
    console.log('Server started');
});
