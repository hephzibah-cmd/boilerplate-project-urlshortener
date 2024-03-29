require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();

mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });

const URLSchema = mongoose.Schema({
  original_url: { type: String, required: true, unique: true },
  short_url: { type: String, required: true, unique: true }
});

const URLModel = mongoose.model("url", URLSchema);

app.use("/", bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', (req, res) => res.sendFile(`${process.cwd()}/views/index.html`));

app.get('/api/shorturl/:short_url', async (req, res) => {
  const foundURL = await URLModel.findOne({ short_url: req.params.short_url });
  foundURL ? res.redirect(foundURL.original_url) : res.json({ message: "The short url does not exist!" });
});

app.post('/api/shorturl', async (req, res) => {
  const { url } = req.body;
  try {
    const urlObj = new URL(url);
    const [err, address] = await new Promise(resolve => dns.lookup(urlObj.hostname, resolve));
    if (!address) throw new Error('invalid url');
    const original_url = urlObj.href;
    const foundURL = await URLModel.findOne({ original_url });
    let short_url = foundURL ? foundURL.short_url : 1;
    if (!foundURL) {
      const latestURL = await URLModel.find({}).sort({ short_url: "desc" }).limit(1);
      if (latestURL.length > 0) short_url = parseInt(latestURL[0].short_url) + 1;
      await URLModel.create({ original_url, short_url });
    }
    res.json({ original_url, short_url });
  } catch {
    res.json({ error: 'invalid url' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
