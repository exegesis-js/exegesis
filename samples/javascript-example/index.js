const express = require('express');
const exegesisExpress = require('exegesis-express');
const http = require('http');
const path = require('path');

async function createServer() {
    // See https://github.com/exegesis-js/exegesis/blob/master/docs/Options.md
    const options = {
        controllers: path.resolve(__dirname, './controllers'),
        allowMissingControllers: false
    };

    // This creates an exegesis middleware, which can be used with express,
    // connect, or even just by itself.
    const exegesisMiddleware = await exegesisExpress.middleware(
        path.resolve(__dirname, './openapi.yaml'),
        options
    );

    const app = express();

    // If you have any body parsers, this should go before them.
    app.use(exegesisMiddleware);

    // Return a 404
    app.use((req, res) => {
        res.status(404).json({message: `Not found`});
    });

    // Handle any unexpected errors
    app.use((err, req, res, next) => {
        res.status(500).json({message: `Internal error: ${err.message}`});
    });

    const server = http.createServer(app);

    return server;
}

createServer()
.then(server => {
    server.listen(3000);
    console.log("Listening on port 3000");
    console.log("Try visiting http://localhost:3000/greet?name=Jason");
})
.catch(err => {
    console.error(err.stack);
    process.exit(1);
});
