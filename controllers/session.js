const axios = require('axios');
const crypt = require('../helpers/crypt');

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

// Google Authentication values are provided using environment variables.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Base URL of the Callback URL
const CALLBACK_BASE_URL = process.env.CALLBACK_BASE_URL || "http://localhost:5000";

const GoogleStrategy = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && require('passport-google-oauth20').Strategy;


// This variable contains the maximum inactivity time allowed without
// making requests.
// If the logged user does not make any new request during this time,
// then the user's session will be closed.
// The value is in milliseconds.
// 30 minutes.
const maxIdleTime = 30*60*1000;


// Middleware: Login required.
//
// If the user is logged in previously then there will exists
// the req.loginUser object, so I continue with the others
// middlewares or routes.
// If req.loginUser does not exist, then nobody is logged,
// so I redirect to the login screen.
//
exports.loginRequired = function (req, res, next) {
    if (req.loginUser) {
        next();
    } else {
        req.flash("info", "Login required: log in and retry.");
        res.redirect('/login');
    }
};


// MW that allows to pass only if the logged useer in is admin.
exports.adminRequired = (req, res, next) => {

    const isAdmin = !!req.loginUser.isAdmin;

    if (isAdmin) {
        next();
    } else {
        console.log('Prohibited route: the logged in user is not an administrator.');
        res.send(403);
    }
};

// MW that allows to pass only if the logged in user is:
// - admin
// - or is the user to be managed.
exports.adminOrMyselfRequired = (req, res, next) => {

    const isAdmin = !!req.loginUser.isAdmin;
    const isMyself = req.load.user.id === req.loginUser.id;

    if (isAdmin || isMyself) {
        next();
    } else {
        console.log('Prohibited route: it is not the logged in user, nor an administrator.');
        res.send(403);
    }
};



// Middleware used to check the inactivity time.
// If the inactivity time has been exceeded, then the user session is destroyed.
exports.checkLoginExpires = (req, res, next) => {

    if (req.session.loginExpires) { // There exist a user session
        if (req.session.loginExpires < Date.now()) { // Expired

            delete req.session.loginExpires;

            req.logout(); // Passport logout

            // Delete req.loginUser from the views
            delete res.locals.loginUser;

        } else { // Not expired. Reset value.
            req.session.loginExpires = Date.now() + maxIdleTime;
        }
    }
    // Continue with the request
    next();
};


/*
 * Serialize user to be saved into req.session.passport.
 * It only saves the id of the user.
 */
passport.serializeUser((user, done) => {
    done(null, user.id);
});


/*
 * Deserialize req.session.passport to create the user.
 * Find the user with the serialized id.
 */
passport.deserializeUser(async (id, done) => {
    console.log("DESSS")
    const query = 
    '{' +
    '  user: koopap_UsersList (' +
    '    where: { id: {EQ: ' + id + '}' +
    '    })' +
    '  {' +
    '    id' +
    '    email' +
    '    password' +
    '    username' +
    '    name' +
    '    bio' +
    '    isAdmin' +
    '    isPrivate' +
    '  }' +
    '}';

    const variables = {
        authorization: token
    };


    try {
        
        // AIRFLOWS GRAPHQL, FIND USER BY ID
        let request = JSON.stringify({query: query, variables: variables});

        let response = await axios({
            url: 'https://koopap.flows.ninja/graphql',
            method: 'post',
            data: request
          })

        if (response.status != 200) {
            throw new Error(`HTTP error! status: ${response.status}`);
        } else {

            if (response.data.data.user) {
                if (response.data.data.user.length != 0) {
                    const user = response.data.data.user[0];
                    done(null, user);
                } else {
                    const user = null;
                    done(null, user);
                }

            } else {
                throw new Error('There is no user with id=' + id);
            }
        }


    } catch (error) {
        done(error);
    }
});




/*
 * Verify Password
 *
 * Crypt the entered password with salt, and check if it is the same as the stored one
 *
 * Return true if password is correct
 * Return false is password is incorrect
 */
function verifyPassword(passwordEntered, passwordUser, salt) {
    return crypt.encryptPassword(passwordEntered, salt) === passwordUser;
}



/*
 * Configure Passport: local strategy.
 *
 * Searches a user with the given username, and checks that the password is correct.
 *
 * If the authentication is correct, then it invokes done(null, user).
 * If the authentication is not correct, then it invokes done(null, false).
 * If there is an error, then it invokes done(error).
 */
passport.use(new LocalStrategy(
    async (username, password, done) => {
    
        const query = 
        '{' +
        '  user: koopap_UsersList (' +
        '    where: { email: {EQ: "' + username + '"}' +
        '    })' +
        '  {' +
        '    id' +
        '    email' +
        '    password' +
        '    salt' +
        '  }' +
        '}';

        const variables = {
            authorization: token
        };

        try {

            // AIRFLOWS GRAPHQL, FIND USER BY USERNAME AND PASSWORD
            let request = JSON.stringify({query: query, variables: variables});

            let response = await axios({
                url: 'https://koopap.flows.ninja/graphql',
                method: 'post',
                data: request
            })

            if (response.status != 200) {
                throw new Error(`HTTP error! status: ${response.status}`);
            } else {

                const user = response.data.data.user[0];

                if (user && verifyPassword(password, user.password, user.salt)) {
                    console.log(user)
                    done(null, user);
                } else {
                    done(null, false);
                }

            }

        } catch (error) {
            done(error);
        }
    }
));



//   Use the GoogleStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and GitHub
//   profile), and invoke a callback with a user object.
GoogleStrategy && passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: `${CALLBACK_BASE_URL}/auth/google/callback`
},
async (accessToken, refreshToken, profile, done) => {

    console.log("PROFILE: ", profile)
    const queryFind = 
    '{' +
    '  user: koopap_UsersList (' +
    '    where: {' +
    '      AND: [' +
    '        {accountType: {EQ: "google"}}' +
    '        { profileId: {EQ: "' + profile.id + '"}}' +
    '      ]' +
    '    })' +
    '  {' +
    '    id' +
    '    email' +
    '    password' +
    '    salt' +
    '  }' +
    '}';

    let currentDate = new Date();
    let currentDateISO = (currentDate.toISOString()).slice(0, -8);

    const queryCreate = 
    'mutation {' +
    '  user: koopap_UsersCreate(' +
    '    entity: {' +
    '      email: "' + profile.emails[0].value + '"' +
    '      name: "' + profile.displayName + '"' +
    '      createdAt: "' + currentDateISO + '"' +
    '      updatedAt: "' + currentDateISO + '"' +
    '      isPrivate: true' +
    '      isAdmin: false' +
    '      accountType: "google"' +
    '      profileId: "' + profile.id + '"' +
    '    }' +
    '  )' +
    '  {' +
    '    id' +
    '  }' +
    '}';
    

    const variables = {
        authorization: token
    };


    try {
        // The returned Google profile represent the logged-in user.
        // I must associate the Google account with a user record in the database,
        // and return that user.
        let requestFind = JSON.stringify({query: queryFind, variables: variables});

        let response = await axios({
            url: 'https://koopap.flows.ninja/graphql',
            method: 'post',
            data: requestFind
          })

        if (response.status != 200) {
            throw new Error(`HTTP error! status: ${response.status}`);
        } else {
            //if (response.data.data.user) {
            console.log("RR", response.data)

            if (response.data.data.user.length != 0) {
                const user = response.data.data.user[0];
                done(null, user);
            } else {
                let requestCreate = JSON.stringify({query: queryCreate, variables: variables});
                console.log("REQU", requestCreate)
                let response = await axios({
                    url: 'https://koopap.flows.ninja/graphql',
                    method: 'post',
                    data: requestCreate
                })
                console.log(response.data)
                console.log("RES", response.data.data)
                if (response.data.data.user) {
                    const user = response.data.data.user;
                    console.log("USER: ", user)
                    done(null, user);
                } else {
                    done(error, null);
                }
            }
        }

    } catch(error) {
        done(error, null);
    }
}
));



// POST /login   -- Create the session if the user authenticates successfully
exports.create = passport.authenticate(
    'local',
    {
        failureRedirect: '/login',
        successFlash: 'Bienvenido',
        failureFlash: 'Authentication has failed. Retry it again.'
    }
);


// GET /auth/google   -- authenticate at Google
exports.authGoogle = GoogleStrategy && passport.authenticate('google', {scope: ['profile', 'email']});

// GET /auth/google/callback
exports.authGoogleCB = GoogleStrategy && passport.authenticate(
    'google',
    {
        failureRedirect: '/users',
        successFlash: 'Welcome!',
        failureFlash: 'Authentication has failed. Retry it again.'
    }
);



// Middleware to create req.session.loginExpires, which is the current inactivity time
// for the user session.
exports.createLoginExpires = (req, res, next) => {

    req.session.loginExpires = Date.now() + maxIdleTime;

    res.redirect("/goback");
};


// GET /login   -- Login form
exports.new = (req, res, next) => {

    res.render('session/new', {
        loginWithGoogle: !!GoogleStrategy
    });
};


// DELETE /login   --  Close the session
exports.destroy = (req, res, next) => {

    delete req.session.loginExpires;
    req.logout();  // Passport logout
    res.redirect("/goback");
};