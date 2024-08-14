
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const Parser = require('rss-parser');
const cron = require('node-cron');
const express = require('express');
const crypto = require('crypto');

// Set to track sent news and URLs
const sentNewsHashes = new Set();
const sentCoinGapeURLs = new Set();

const parser = new Parser();
const bot = new Telegraf('6990325763:AAEaa5SKpb5GtHj-kzlylkp0V0ZDRgFdkrs');

// Replace with your group1 chat ID and group2 chat ID
const groupChatId = -1002197584757;
const group2ChatId = -1002220633118;

// Footers to add to each message
const group2Footer = "\n\nJoin our Group here: https://t.me/+Xfa6dD4coghhNjJk";

// Function to remove unwanted links
function removeUnwantedLinks(text) {
    const urlRegex = /(?:you can read more here:\s*)?(https?:\/\/[^\s]+)/gi;
    return text.replace(urlRegex, (match, url) => {
        return url.includes('https://t.me/+UJRqbACZUAZiNDc8') ? match : '';
    }).trim();
}

// Categorize messages
let newsMessages = [];
let analysisMessages = [];

function categorizeMessage(message, header) {
    if (header.includes("NEWS")) {
        if (message.text) {
            newsMessages.push(message.text);
        } else if (message.caption) {
            newsMessages.push(message.caption);
        }
    } else if (header.includes("ANALYSIS")) {
        if (message.text) {
            analysisMessages.push(message.text);
        } else if (message.caption) {
            analysisMessages.push(message.caption);
        }
    }
}

// Generate invite link
async function generateInviteLink() {
    try {
        return await bot.telegram.exportChatInviteLink(groupChatId);
    } catch (error) {
        console.error('Error generating invite link:', error);
        return 'Invite link unavailable';
    }
}

// Main menu creation
async function createMainMenu() {
    const inviteLink = await generateInviteLink();
    return Markup.inlineKeyboard([
        [Markup.button.callback('Filter by Topics', 'SHOW_TOPICS')],
        [Markup.button.callback('Market Insights', 'MARKET_INSIGHTS')],
        [Markup.button.url('Learn with our YouTube channel', 'http://www.youtube.com/@TRADEwithnoAID')],
        [Markup.button.url('Trade Now with Bybit', 'https://www.bybit.com/invite?ref=XNG3NP')],
        [Markup.button.url('Join Our Premium Channel', 'https://t.me/+9c7f-l2aRLMzZDI8')],
        [Markup.button.url('Invite Friends', inviteLink)]
    ]);
}

// Function to display the main menu
async function sendMainMenu(ctx) {
    const menuMarkup = await createMainMenu();
    return ctx.replyWithHTML('<b>Main Menu</b>', menuMarkup);
}

// Function to display the Topics menu
function createFilterbyTopicsMenu() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('News', 'FILTER_NEWS')],
        [Markup.button.callback('Analysis', 'FILTER_ANALYSIS')],
        [Markup.button.callback('Back to Main Menu', 'SHOW_MAIN_MENU')]
    ]);
}

// Handle the inline button actions
bot.action('SHOW_MAIN_MENU', sendMainMenu);

bot.action('SHOW_TOPICS', async (ctx) => {
    const topicsMarkup = createFilterbyTopicsMenu();
    await ctx.reply('Topics:', topicsMarkup);
});

// Filter News and Analysis messages
bot.action('FILTER_NEWS', async (ctx) => {
    if (newsMessages.length > 0) {
        for (const news of newsMessages) {
            await ctx.reply(news);
        }
    } else {
        await ctx.reply('No news messages found.');
    }
});

bot.action('FILTER_ANALYSIS', async (ctx) => {
    if (analysisMessages.length > 0) {
        for (const analysis of analysisMessages) {
            await ctx.reply(analysis);
        }
    } else {
        await ctx.reply('No analysis messages found.');
    }
});

// Handle Market Insights submenu
function sendMarketInsightsMenu(ctx) {
    ctx.reply('Market Insights:', Markup.inlineKeyboard([
        [Markup.button.callback('News Update', 'NEWS_UPDATE')],
        [Markup.button.callback('Fear & Greed Index', 'FEAR_GREED')],
        [Markup.button.callback('Coin Price Overview', 'COIN_LIST')]
    ]));
}

bot.action('MARKET_INSIGHTS', sendMarketInsightsMenu);

// Fetch and send CoinGape news updates
async function sendCoinGapeUpdates() {
    try {
        const feed = await parser.parseURL('https://coingape.com/feed/');
        
        if (feed.items.length > 0) {
            for (const item of feed.items) {
                // Check if this news item has already been sent
                if (!sentCoinGapeURLs.has(item.link)) {
                    const messageContent = `📰 NEWS\n\n${item.title}\n${item.link}`;
                    
                    try {
                        await bot.telegram.sendMessage(groupChatId, messageContent);
                        sentCoinGapeURLs.add(item.link);

                        // Introduce a delay between messages to avoid hitting rate limits
                        await new Promise(resolve => setTimeout(resolve, 1000));  // 1 second delay
                    } catch (error) {
                        if (error.response && error.response.error_code === 429) {
                            const retryAfter = error.response.parameters.retry_after;
                            console.warn(`Rate limited by Telegram. Retrying after ${retryAfter} seconds...`);
                            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                            // Retry the failed request
                            await bot.telegram.sendMessage(groupChatId, messageContent);
                        } else {
                            console.error('Error sending message:', error);
                        }
                    }
                }
            }
        } else {
            console.log('No news items found in the CoinGape feed.');
        }
    } catch (error) {
        console.error('Error fetching CoinGape news:', error);
    }
}

// Schedule CoinGape news updates
cron.schedule('0 * * * *', sendCoinGapeUpdates);

// Handle incoming messages and forward them
bot.on('message', async (ctx) => {
    if (ctx.chat.id === groupChatId) {
        const message = ctx.message;

        let header = '📈 Message from Trade with No Aid:';
        if (message.text && message.text.toLowerCase().includes("news")) {
            header = '📈 NEWS from Trade with No Aid:';
        } else if (message.text && message.text.toLowerCase().includes("analysis")) {
            header = '📈 ANALYSIS from Trade with No Aid:';
        }

        categorizeMessage(message, header);

        let messageText = message.text 
            ? `${header}\n\n${removeUnwantedLinks(message.text)}${group2Footer}` 
            : `${header}\n\n${group2Footer}`;

        try {
            if (message.text) {
                await bot.telegram.sendMessage(group2ChatId, messageText);
            } else if (message.photo) {
                const photo = message.photo[message.photo.length - 1].file_id;
                const caption = removeUnwantedLinks(message.caption || '');
                await bot.telegram.sendPhoto(group2ChatId, photo, { caption: `${header}\n\n${caption}${group2Footer}` });
            } else if (message.video) {
                const video = message.video.file_id;
                const caption = removeUnwantedLinks(message.caption || '');
                await bot.telegram.sendVideo(group2ChatId, video, { caption: `${header}\n\n${caption}${group2Footer}` });
            } else if (message.audio) {
                const audio = message.audio.file_id;
                const caption = removeUnwantedLinks(message.caption || '');
                await bot.telegram.sendAudio(group2ChatId, audio, { caption: `${header}\n\n${caption}${group2Footer}` });
            } else if (message.document) {
                const document = message.document.file_id;
                const caption = removeUnwantedLinks(message.caption || '');
                await bot.telegram.sendDocument(group2ChatId, document, { caption: `${header}\n\n${caption}${group2Footer}` });
            } else if (message.voice) {
                const voice = message.voice.file_id;
                await bot.telegram.sendVoice(group2ChatId, voice, { caption: `${header}\n\n${group2Footer}` });
            } else if (message.sticker) {
                const sticker = message.sticker.file_id;
                await bot.telegram.sendSticker(group2ChatId, sticker);
            }
        } catch (error) {
            console.error('Error forwarding message:', error);
        }
    }
});

// Schedule to run every 6 hours for news updates
cron.schedule('0 */6 * * *', () => {
    sendNewsUpdates({ reply: (msg) => bot.telegram.sendMessage(group2ChatId, msg) });
});

// Server to handle incoming webhooks
const app = express();
app.use(express.json());

// CORS & Security Middlewares (optional)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.post('/process-data', (req, res) => {
	console.log("Request received: ", req);
	
    const data = req.body;
    res.json({ message: 'Data received and processed', data });
});

app.listen(49771, () => {
    console.log(`Node.js bot running on port 49771`);
});

bot.start((ctx) => {
    ctx.reply('Welcome! Click the button below to open the Mini App.', {
        reply_markup: {
            keyboard: [
                [{ text: 'Open Mini App', web_app: { url: 'https://your-server.com/miniapp.html' } }]
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    });
});

bot.command('menu', (ctx) => {
    ctx.reply('Open Mini App', {
        reply_markup: {
            keyboard: [
                [{ text: 'Open Mini App', web_app: { url: `http://http://localhost:49771/` } }] // Dynamic URL
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    });
});

bot.launch().then(() => {
    console.log('Bot is running...');
    postAndPinMenu();
}).catch(error => console.error('Failed to launch the bot:', error));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));