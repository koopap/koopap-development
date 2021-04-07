const axios = require('axios');



exports.load = async (req, res, next, postId) => {
    console.log("1")
    const query = 
    '{' +
    '  categories: Demo_CategoryList {' +
    '    id' +
    '    code' +
    '    name' +
    '  }' +
    '}';

    const variables = {
        authorization: token
    };
      

    try {

        let request = JSON.stringify({query: query, variables: variables});
        const response = await fetch("https://koopap.flows.ninja/graphql", {
            method: "POST",
            body: request
        })

        if (!response.ok){
            throw new Error(`HTTP error! status: ${response.status}`);
        } else {
            const post = await response.json();
            if (post) {
                req.load = {...req.load, post};
                next();
            } else {
                throw new Error('There is no post with id=' + postId);
            }
        }

    } catch (error) {
        next(error);
    }
};


// GET /posts
exports.index = async (req, res, next) => {
    console.log(token)
    
    const query = 
    '{' +
    '  categories: Demo_CategoryList {' +
    '    id' +
    '    code' +
    '    name' +
    '  }' +
    '}';

    const variables = {
        authorization: token
    };
      

    try {
/*
        let request = JSON.stringify({query: query, variables: variables});
        let response = await fetch("https://koopap.flows.ninja/graphql", {
            method: "POST",
            body: request
        })

        if (!response.ok){
            throw new Error(`HTTP error! status: ${response.status}`);
        } else {
            const post = await response.json();
            if (post) {
                res.render('index', { title: JSON.stringify(post) });
                //req.load = {...req.load, post};
                //next();
            } else {
                throw new Error('There is no post with id=' + postId);
            }
        }
*/
        let request = JSON.stringify({query: query, variables: variables});
        let response = await axios({
            url: 'https://koopap.flows.ninja/graphql',
            method: 'post',
            data: request
          })

        if (response.status != 200) {
            throw new Error(`HTTP error! status: ${response.status}`);
        } else {
            const post = response.data;
            if (post) {
                res.render('index', { title: JSON.stringify(post) });
                //req.load = {...req.load, post};
                //next();
            } else {
                throw new Error('There is no post with id=' + postId);
            }
        }

    } catch (error) {
        next(error);
    }

};


// GET /posts/:postId
exports.show =  (req, res, next) => {

    const {post} = req.load;

    try {
        res.render('posts/show', {
            post
        });
    } catch (error) {
        next(error);
    }
};


// GET /posts/new
exports.new = (req, res, next) => {

    res.render('posts/new');
};


// POST /posts/create
exports.create = async (req, res, next) => {

    const {title, text} = req.body;

    try {
        // AWAIT CODE, GRAPHQL TO AIRFLOWS
    } catch (error) {
        next(error);
    }
};


// GET /posts/:postId/edit
exports.edit = (req, res, next) => {

    const {post} = req.load;

    res.render('posts/edit', {post});
};


// PUT /posts/:postId
exports.update = async (req, res, next) => {

    const {post} = req.load;
    const {title, text} = req.body;

    post.title = title;
    post.text = text;

    try {
        // AWAIT CODE, GRAPHQL TO AIRFLOWS
    }  catch(error) {
        next(error);
    }
};


// DELETE /posts/:postId
exports.destroy = async (req, res, next) => {

    const {post} = req.load;

    try {
        // AWAIT CODE, GRAPHQL TO AIRFLOWS
    }  catch(error) {
        next(error);
    }
};