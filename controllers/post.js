const axios = require('axios');

const paginate = require('../helpers/paginate').paginate;


exports.load = async (req, res, next, postId) => {

    const query = 
    '{' +
    '  post: koopap_PostsList (' +
    '    where: { id: {EQ: ' + postId + '}' +
    '    })' +
    '  {' +
    '    id' +
    '    title' +
    '    content' +
    '    score' +
    '    visualizations' +
    '    impact' +
    '    createdAt' +
    '    updatedAt' +
    '    categoryId' +
    '    length' +
    '    readingTime' +
    '    authorId: UsersViaAuthorId {' +
    '       id' +
    '       name' +
    '    }' +
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

            if (response.data.data.post && response.data.data.post.length !== 0) {
                const post = response.data.data.post[0];
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



// MW that allows actions only if the user logged in is admin or is the author of the post.
exports.adminOrAuthorRequired = (req, res, next) => {

    const isAdmin = !!req.loginUser.isAdmin;
    const isAuthor = req.load.post.authorId === req.loginUser.id;

    if (isAdmin || isAuthor) {
        next();
    } else {
        console.log('Prohibited operation: The logged in user is not the author of the post, nor an administrator.');
        res.send(403);
    }
};


// GET /posts
exports.index = async (req, res, next) => {

    let numberPosts = null;
    
    let queryNumberPosts = 
    '{' +
    '  posts: koopap_PostsList {' +
    '    numberPosts: id_count' +
    '  }' +
    '}';

    // Search:
    const search = req.query.search || ''; //When there is not search, or the search is blank (no spaces)
    let searchOptions = "%";

    if (search) {
        searchOptions = "%" + search.replace(/ +/g, "%") + "%"; //Replaces spaces with %

        queryNumberPosts = 
            '{' +
            '  posts: koopap_PostsList (' +
            '   where: {' +
            '      OR: [' +
            '       {title: {ILIKE: "'+ searchOptions +'"}}' +
            '       {content: {ILIKE: "'+ searchOptions +'"}}' +
            '      ]' +
            '   }' +
            '  ) {' +
            '    numberPosts: id_count' +
            '  }' +
            '}';
    }

    const variables = {
        authorization: token
    };

    try {

        let request = JSON.stringify({query: queryNumberPosts, variables: variables});
        let response = await axios({
            url: 'https://koopap.flows.ninja/graphql',
            method: 'post',
            data: request
          })

        if (response.status != 200) {
            throw new Error(`HTTP error! status: ${response.status}`);
        } else {

            if (response.data.data.posts) {
                numberPosts = response.data.data.posts[0].numberPosts;
            } else {
                throw new Error('Error in counting posts');
            }
        }

    } catch (error) {
        next(error);
    }

    if (numberPosts !== null) {
        // Pagination:

        const items_per_page = 2;

        // The page to show is given in the query
        const pageno = parseInt(req.query.pageno) || 1;

        // Create a String with the HTMl used to render the pagination buttons.
        // This String is added to a local variable of res, which is used into the application layout file.
        res.locals.paginate_control = paginate(numberPosts, items_per_page, pageno, req.url);


        const offset = items_per_page * (pageno - 1);
        const limit = items_per_page;


        let query = 
        '{' +
        '  posts: koopap_PostsList (' +
        '    limit: ' + limit +
        '    offset: ' + offset +
        '  ){' +
        '    id' +
        '    title' +
        '    authorId: UsersViaAuthorId {' +
        '       id' +
        '       name' +
        '    }' +
        '  }' +
        '}';

        if (search) {
            query = 
            '{' +
            '  posts: koopap_PostsList (' +
            '    limit: ' + limit +
            '    offset: ' + offset +
            '   where: {' +
            '      OR: [' +
            '       {title: {ILIKE: "'+ searchOptions +'"}}' +
            '       {content: {ILIKE: "'+ searchOptions +'"}}' +
            '      ]' +
            '   }' +
            '  ){' +
            '    id' +
            '    title' +
            '    authorId: UsersViaAuthorId {' +
            '       id' +
            '       name' +
            '    }' +
            '  }' +
            '}';
        }
        

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
                const posts = response.data.data.posts;

                if (posts) {
                    res.render('post/index', { posts: posts, search: search });
                } else {
                    throw new Error('There is no posts');
                }
            }

        } catch (error) {
            next(error);
        }
    }
    

};


// GET /posts/:postId
exports.show =  (req, res, next) => {

    const {post} = req.load;

    try {
        res.render('post/show', {
            post
        });
    } catch (error) {
        next(error);
    }
};


// GET /posts/new
exports.new = (req, res, next) => {

    res.render('post/new');
};


// POST /posts/create
exports.create = async (req, res, next) => {

    const {title, content} = req.body;

    let currentDate = new Date();
    let currentDateISO = (currentDate.toISOString()).slice(0, -8);

    const authorId = req.loginUser.id;

    const query = 
    'mutation {' +
    '  post: koopap_PostsCreate(' +
    '    entity: {' +
    '      title: "' + title + '"' +
    '      content: "' + content + '"' +
    '      authorId: ' + authorId +
    '      createdAt: "' + currentDateISO + '"' +
    '      updatedAt: "' + currentDateISO + '"' +
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

            if (response.data.data.post) {
                const post = response.data.data.post;
                res.redirect('/posts/' + post.id);
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


// GET /posts/:postId/edit
exports.edit = (req, res, next) => {

    const {post} = req.load;

    try {
        res.render('post/edit', {
            post
        });
    } catch (error) {
        next(error);
    }

};


// PUT /posts/:postId
exports.update = async (req, res, next) => {

    const postParam = req.load.post;
    var {title, content} = req.body;

    if (title.length === 0){
        title = postParam.title;
    };

    if (content.length === 0){
        content = postParam.content;
    };


    let currentDate = new Date();
    let currentDateISO = (currentDate.toISOString()).slice(0, -8);

    const query = 
    'mutation {' +
    '  post: koopap_PostsUpdate (' +
    '    where: { id: {EQ: ' + postParam.id + '}' +
    '    }' +
    '    entity: {' +
    '      title: "' + title + '"' +
    '      content: "' + content + '"' +
    '      updatedAt: "' + currentDateISO + '"' +
    '    }' +
    '  ) {' +
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

            if (response.data.data.post) {
                const post = response.data.data.post[0];
                res.redirect('/posts/' + post.id);
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


// DELETE /posts/:postId
exports.destroy = async (req, res, next) => {

    const postParam = req.load.post;

    const query = 
    'mutation {' +
    '  post: koopap_PostsDelete (' +
    '    where: { id: {EQ: ' + postParam.id + '}' +
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

            if (response.data.data.post) {
                const post = response.data.data.post[0];
                if (post.id === postParam.id) {
                    req.flash('success', 'Post eliminado correctamente');
                    res.redirect('/goback');
                }

            } else {
                throw new Error('There is no post');
            }
        }

    } catch (error) {
        next(error);
    }


};