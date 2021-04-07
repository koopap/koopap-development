const axios = require('axios');
const crypt = require('../helpers/crypt');

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

// This variable contains the maximum inactivity time allowed without
// making requests.
// If the logged user does not make any new request during this time,
// then the user's session will be closed.
// The value is in milliseconds.
// 30 minutes.
const maxIdleTime = 30*60*1000;


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

            const user = response.data.data.user[0];

            if (user) {
                done(null, user);
            } else {
                throw new Error('There is no user with id=' + userId);
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


// POST /login   -- Create the session if the user authenticates successfully
exports.create = passport.authenticate(
    'local',
    {
        failureRedirect: '/login',
        successFlash: 'Bienvenido',
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

    res.render('session/new'/*, {
        loginWithGitHub: !!GitHubStrategy,
        loginWithTwitter: !!TwitterStrategy,
        loginWithGoogle: !!GoogleStrategy,
        loginWithLinkedin: !!LinkedinStrategy
    }*/);
};


// DELETE /login   --  Close the session
exports.destroy = (req, res, next) => {

    delete req.session.loginExpires;
    req.logout();  // Passport logout
    res.redirect("/goback");
};