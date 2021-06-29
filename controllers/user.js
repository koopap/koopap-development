const axios = require('axios');

const crypt = require('../helpers/crypt');

//global.token = "1";


// Add a request interceptor
axios.interceptors.request.use(function (config) {
    // Do something before request is sent
 /*   data = JSON.parse(config.data)
    data.variables.authorization = "223";
    config.data = JSON.stringify(data);

*/
    return config;
  }, function (error) {
    // Do something with request error
    return Promise.reject(error);
  });

// Add a response interceptor
axios.interceptors.response.use(async function (response) {
    // Any status code that lie within the range of 2xx cause this function to trigger
    // Do something with response data
    if(response.data.errors){

        if (response.data.errors[0].message == "SessionTimeout") {
            const queryLogin = 
                'mutation {' +
                '  login(username:"modelsadmin", password:"Koopapteleco88!")' +
                '}';
            let requestToken = JSON.stringify({query: queryLogin});
            let responseToken = await axios({
                url: 'https://koopap.flows.ninja/graphql',
                method: 'post',
                data: requestToken
            })
            
            token = responseToken.data.data.login;

            let responseConfig = JSON.parse(response.config.data);
            responseConfig.variables = {
                authorization: token
            };
            let newRequest = JSON.stringify(responseConfig);

            let newResponse = await axios({
                url: 'https://koopap.flows.ninja/graphql',
                method: 'post',
                data: newRequest
            })
            return newResponse;
        }
    }
    
    return response;
  }, function (error) {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Do something with response error
    return Promise.reject(error);
  });



  // MW that allows actions only if the user account is local.
exports.isLocalRequired = (req, res, next) => {

    if (req.load.user.accountType == "local") {
        next();
    } else {
        console.log('Prohibited operation: The user account must be local.');
        res.send(403);
    }
};



exports.load = async (req, res, next, userId) => {

    const query = 
    '{' +
    '  user: koopap_UsersList (' +
    '    where: { id: {EQ: ' + userId + '}' +
    '    })' +
    '  {' +
    '    id' +
    '    email' +
    '    username' +
    '    name' +
    '    bio' +
    '    isAdmin' +
    '    isPrivate' +
    '    accountType' +
    '    posts: PostsListViaAuthorId {' +
    '       id' +
    '       title' +
    '     }' +
    '  }' +
    '}';

    const variables = {
        authorization: token
    };
      

    try {

        let request = JSON.stringify({query: query, variables: variables});

        let response = await axios({
            url: 'https://koopap.flows.ninja/graphql',
            method: 'post',
            data: request
          })

        if (response.status != 200) {
            throw new Error(`HTTP error! status: ${response.status}`);
        } else {

            if (response.data.data.user && response.data.data.user.length !== 0) {
                const user = response.data.data.user[0];
                req.load = {...req.load, user};
                next();
            } else {
                throw new Error('There is no user with id=' + userId);
            }
        }

    } catch (error) {
        next(error);
    }

};


// GET /users
exports.index = async (req, res, next) => {

    const query = 
    '{' +
    '  users: koopap_UsersList {' +
    '    id' +
    '    name' +
    '  }' +
    '}';

    const variables = {
        authorization: token
    };
      

    try {

        let request = JSON.stringify({query: query, variables: variables});
        let response = await axios({
            url: 'https://koopap.flows.ninja/graphql',
            method: 'post',
            data: request
          })

        if (response.status != 200) {
            throw new Error(`HTTP error! status: ${response.status}`);
        } else {
            const users = response.data.data.users;

            if (users) {
                res.render('user/index', { users: users });
            } else {
                throw new Error('There is no users');
            }
        }

    } catch (error) {
        next(error);
    }

};


// GET /users/:userId
exports.show =  (req, res, next) => {

    const {user} = req.load;

    try {
        res.render('user/show', {
            user
        });
    } catch (error) {
        next(error);
    }
};


// GET /users/new
exports.new = (req, res, next) => {

    res.render('user/new');
};


// POST /users/create
exports.create = async (req, res, next) => {

    const {email, username, password, name, bio} = req.body;

    let currentDate = new Date();
    let currentDateISO = (currentDate.toISOString()).slice(0, -8);

    //Pasword crypt
    const salt = Math.round((new Date().valueOf() * Math.random())) + '';
    const cryptPass = crypt.encryptPassword(password, salt);

    const query = 
    'mutation {' +
    '  user: koopap_UsersCreate(' +
    '    entity: {' +
    '      email: "' + email + '"' +
    '      password: "' + cryptPass + '"' +
    '      salt: "' + salt + '"' +
    '      username: "' + username + '"' +
    '      name: "' + name + '"' +
    '      bio: "' + bio + '"' +
    '      createdAt: "' + currentDateISO + '"' +
    '      updatedAt: "' + currentDateISO + '"' +
    '      accountType: "local"' +
    '      isPrivate: true' +
    '      isAdmin: false' +
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
                const user = response.data.data.user;
                res.redirect('/users/' + user.id);
            } else {
                if (response.data.errors) {
                    throw new Error('An error ocurred. Error: ' + response.data.errors[0].message);
                }
                throw new Error('An error ocurred');
            }
        }
    } catch (error) {
        next(error);
    }
};


// GET /users/:userId/edit
exports.edit = (req, res, next) => {

    const {user} = req.load;

    try {
        res.render('user/edit', {
            user
        });
    } catch (error) {
        next(error);
    }

};


// PUT /users/:userId
exports.update = async (req, res, next) => {

    const userParam = req.load.user;
    var {email, username, name, bio, isPrivate} = req.body;

    let isPrivateTF = true;
    isPrivate ? isPrivateTF = true : isPrivateTF = false;

    /*if (email.length === 0){
        email = userParam.email;
    };*/

    if (username.length === 0){
        username = userParam.username;
    }

    if (name.length === 0){
        name = userParam.name;
    }

    if (bio.length === 0){
        bio = userParam.bio;
    }

    let currentDate = new Date();
    let currentDateISO = (currentDate.toISOString()).slice(0, -8);

    let query = '';

    if (email === undefined) {
        query = 
        'mutation {' +
        '  user: koopap_UsersUpdate (' +
        '    where: { id: {EQ: ' + userParam.id + '}' +
        '    }' +
        '    entity: {' +
        '      username: "' + username + '"' +
        '      name: "' + name + '"' +
        '      bio: "' + bio + '"' +
        '      isPrivate: ' + isPrivateTF + '' +
        '      updatedAt: "' + currentDateISO + '"' +
        '    }' +
        '  ) {' +
        '    id' +
        '  }' +
        '}';
    } else {
        query = 
        'mutation {' +
        '  user: koopap_UsersUpdate (' +
        '    where: { id: {EQ: ' + userParam.id + '}' +
        '    }' +
        '    entity: {' +
        '      email: "' + email + '"' +
        '      username: "' + username + '"' +
        '      name: "' + name + '"' +
        '      bio: "' + bio + '"' +
        '      isPrivate: ' + isPrivateTF + '' +
        '      updatedAt: "' + currentDateISO + '"' +
        '    }' +
        '  ) {' +
        '    id' +
        '  }' +
        '}';
    }

    const variables = {
        authorization: token
    };

    try {

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
                const user = response.data.data.user[0];
                res.redirect('/users/' + user.id);
            } else {
                if (response.data.errors) {
                    throw new Error('An error ocurred. Error: ' + response.data.errors[0].message);
                }
                throw new Error('An error ocurred');
            }
        }
    } catch (error) {
        next(error);
    }
};


// DELETE /users/:userId
exports.destroy = async (req, res, next) => {

    const userParam = req.load.user;

    const query = 
    'mutation {' +
    '  user: koopap_UsersDelete (' +
    '    where: { id: {EQ: ' + userParam.id + '}' +
    '    })' +
    '  {' +
    '    id' +
    '  }' +
    '}';

    const variables = {
        authorization: token
    };
      

    try {

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
                const user = response.data.data.user[0];
                if (user.id === userParam.id) {
                    req.flash('success', 'Usuario eliminado correctamente');
                    res.redirect('/');
                }

            } else {
                throw new Error('There is no user');
            }
        }

    } catch (error) {
        next(error);
    }


};