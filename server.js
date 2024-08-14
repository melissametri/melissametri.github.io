49771
const express = require('express');
const { Telegraf } = require('telegraf');

const app = express();
const bot = new Telegraf('6990325763:AAEaa5SKpb5GtHj-kzlylkp0V0ZDRgFdkrs');

// Serve static files from the "public" directory
app.use(express.static('public'));


// Serve the index.html file on the root URL
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Start the server
const PORT = process.env.PORT || 49771;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
