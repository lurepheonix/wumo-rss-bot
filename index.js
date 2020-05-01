const dotenv = require('dotenv').config()
const sqlite3 = require('sqlite3')
const { open } = require('sqlite')
const Telegram = require('telegraf/telegram')
const bot = new Telegram(process.env.BOT_TOKEN, [ { agent: null, webhookReply: true }]);
const Parser = require('rss-parser')
const rss_parser = new Parser()

const openDB = async () => {
    return open({
        filename: 'wumo.sqlite',
        driver: sqlite3.Database
    })
}

const checkDB = async (connection) => {
    let result = await connection.get('SELECT count(*) FROM sqlite_master WHERE type="table" AND name="posts"')
    if (result['count(*)'] === 0) {
        console.log('\nCreating table for posts...')
        await connection.exec('CREATE TABLE posts (id INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR(255), link TEXT)')
        console.log("Table created!")
    }
}

const parseRSS = async (connection, feed) => {
    for (post of feed.items) {
        let postExists = await connection.get('SELECT count(*) FROM posts WHERE link="' + post.link + '"')
        if (postExists['count(*)'] === 0) {
            await connection.exec('INSERT INTO posts (name, link) VALUES ("' + post.title + '", "' + post.link + '")')
            bot.sendPhoto(process.env.SEND_TO, post.link)
        }
    }
    console.log('All parsed.')
}

const go = async () => {
    const connection = await openDB()
    await checkDB(connection)
    const feed = await rss_parser.parseURL(process.env.URL)
    await parseRSS(connection, feed)
    await connection.close()
    console.log('My work here is done!')
}

go()