const express = require('express')
const axios = require('axios')
const cors = require('cors');
const bodyParser = require('body-parser');

const port = process.env.PORT || 3000
const app = express()

app.use((request, response, next) => {
  console.log("set header");
  response.header("x-powered-by", "ExpressServer");
  next();
});

app.listen(port, () => { console.log(`listening on port ${port}`) });
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cors());

app.get('/api/cat-facts', async (_req, response) => {
  res = await fetch('https://catfact.ninja/fact')
  data = await res.json()
  //response.send('api cat-facts called.');
  response.send(JSON.stringify(data))
});
