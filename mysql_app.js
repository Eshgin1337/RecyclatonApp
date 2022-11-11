require('dotenv').config();
const express = require('express');
const session = require('express-session');
const ejs = require('ejs');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 17000}
}));

const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD,
    database: 'usersDB'
});

conn.connect((err) => {
    if (err) throw err;
});

conn.query(`create table if not exists teachers(
    id INT AUTO_INCREMENT PRIMARY KEY,
    email varchar(255) not null,
    password varchar(255)
)`);

app.get('/', function (req, res) {
    res.render('index');
});

app.get('/login', function (req, res) {
    let usernameError = null;
    let passwordError = null;
    if (req.session.isAuth) {
        res.redirect('/home');
    } else {
        res.render('login', {usernameError: usernameError, passwordError: passwordError, authError: null});
    } 
});

app.get('/register', function (req, res) {
    let errors = null;
    let usernameError = null;
    let emailError = null;
    let passwordErrors = [];
    if (req.session.isAuth) {
        res.redirect('/home');
    } else {
        res.render('register', {usernameError: usernameError, emailError: emailError, passwordErrors: passwordErrors});
    }
});

app.get('/home', function (req, res) {
    if (!req.session.isAuth) {
        res.redirect('/login')
    } else {
        userParams = req.cookies.current_user;
        res.render('home', {username: userParams.username, email: userParams.email});
    }
});

app.post('/login', function (req, res) {
    const email = req.body.email;
    const password = req.body.pass;
    const search_sql = `select * from teachers where email = "${email}"`;
    conn.query(search_sql, function (err, results) {
        const result = results[0];
        if (results.length != 0) {
            bcrypt.compare(password, result.password, function (err, same) {
                console.log(same);
                if (same) {
                    res.redirect('/');
                } else {
                    res.redirect('/login');
                }
            })
        } else {
            res.redirect('/login')
        }
    })  
});

app.post("/add_teacher", async function (req, res) {
    const email = req.body.email;
    const password = req.body.password;
    const hashed_password = await bcrypt.hash(password, 10);
    const add_sql = `insert into teachers (email, password) values ("${email}", "${hashed_password}")`;
    conn.query(add_sql, function (err) {
        if (err) throw err;
    });
    res.send("ok");
});

app.listen(3000, function () {
    console.log("Server started on port 3000");
});
