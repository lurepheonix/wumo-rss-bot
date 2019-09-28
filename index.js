const dotenv = require('dotenv').config();
const Parser = require('rss-parser');
const rss_parser = new Parser();
const mysql = require('mysql2/promise');
const Telegram = require('telegraf/telegram');

// create connection to database
const connection = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    database: process.env.MYSQL_DB,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWD,
})

// check whether table with posts exists, if no, add table
const checkTable = async () => {
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
const parseRSS = async (feed) => {
    feed.items.forEach(item => {
        let title = item.title;
        let url = item.content;
        let x = url.indexOf('src=') + 5;
        url = url.substring(x);
        x = url.indexOf('" alt');
        url = url.slice(0, x);
        let searchForPost = "SELECT * FROM posts WHERE name='"+title+"'";
        connection.execute(searchForPost, function(err, result) {
            if (err) throw err;
            if (result == "") {
                let addPostToTable = "INSERT INTO posts (name, link) VALUES ('"+title+"', '"+url+"')";
                connection.execute(addPostToTable, function(err, result) {
                    if (err) throw err;
                });
                //const telegram = new Telegram(process.env.BOT_TOKEN, [ { agent: null, webhookReply: true }]);
                //telegram.sendPhoto(SEND_TO, url);
            }
        });
    });
}

// run all
const run = async () => {
    let connect = await connection;
    await checkTable();
    let feed = await rss_parser.parseURL('http://wumo.com/wumo?view=rss');
    await parseRSS(feed);
}
run()