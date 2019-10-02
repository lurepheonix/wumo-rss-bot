const dotenv = require('dotenv').config();
const Parser = require('rss-parser');
const rss_parser = new Parser();
const mysql = require('mysql2/promise');
const Telegram = require('telegraf/telegram');
const telegram = new Telegram(process.env.BOT_TOKEN, [ { agent: null, webhookReply: true }]);

// create connection to database
async function createConnection() {
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        database: process.env.MYSQL_DB,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWD,
    })
    return connection;
}

// check whether table with posts exists, if no, add table
const checkTable = async (connection) => {
    var [results] = await connection.execute('SHOW TABLES LIKE "posts"');
    if (results.length == 0) {
        console.log('Table with posts does not exist.');
        console.log('Creating table...');
        let addPostsTable = "CREATE TABLE posts (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), link TEXT)";
        await connection.execute(addPostsTable);
        console.log('Table for posts created.');
    } else {
        console.log('Table with posts exists')
    }
}

// parse RSS, write to table and send
const parseRSS = async (connection, feed) => {
    for (item in feed.items) {
        let title = feed.items[item].title;
        let url = feed.items[item].content;
        let x = url.indexOf('src=') + 5;
        url = url.substring(x);
        x = url.indexOf('" alt');
        url = url.slice(0, x);
        let searchForPost = "SELECT * FROM posts WHERE name='"+title+"'";
        let [result] = await connection.execute(searchForPost);
        if (result == "") {
            let addPostToTable = "INSERT INTO posts (name, link) VALUES ('"+title+"', '"+url+"')";
            await connection.execute(addPostToTable);
            telegram.sendPhoto(process.env.SEND_TO, url);
        }
        item += item;
    }
    console.log('RSS parsed, posts added.')
}

// run all
const run = async () => {
    let connection = await createConnection();
    await checkTable(connection);
    let feed = await rss_parser.parseURL(process.env.URL);
    await parseRSS(connection, feed);
    await connection.end()
}
run()