//Import librarys used
import * as express from 'express';
import * as exegesisExpress from 'exegesis-express';
import * as path from 'path';

//You may choose HTTP or HTTPS, if HTTPS you need a SSL Cert
import * as http from 'http';
import * as https from 'https';

const PORT = 3000;



async function createServer() {
    // See https://github.com/exegesis-js/exegesis/blob/master/docs/Options.md
    const options = {
        controllers: path.resolve(__dirname, './controllers'),
        controllersPattern: "**/*.@(ts|js)"
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
    //Used to create a HTTP Server
    const server = http.createServer(app);

    /**
     * If you want to run a HTTPS server instead you must:
     * + Get a SSL Cert and Key to use
     * + Change the server type from http to https as shown below
     *

    const httpsOptions = {
        key: fs.readFileSync('./config/key.pem'),
        cert: fs.readFileSync('./config/cert.pem')
    }
    const server = https.createServer(httpsOptions,app);

    */
    return server;
}
//Run our createServer function
createServer()
.then(server => {
    server.listen(PORT);
    console.log("Listening on port 3000");
    console.log("Try visiting http://localhost:3000/greet?name=Jason");
})
.catch(err => {
    console.error(err.stack);
    process.exit(1);
});
