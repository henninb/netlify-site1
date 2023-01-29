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
  response.send(JSON.stringify(data))
});

app.get('/api/board', async (_req, response) => {
  res = await fetch('https://www.boredapi.com/api/activity')
  data = await res.json()
  response.send(JSON.stringify(data))
});

app.get('/api/hockey', async (_req, response) => {
  res = await fetch('https://fixturedownload.com/feed/json/nhl-2022/minnesota-wild')
  data = await res.json()
  response.send(JSON.stringify(data))
});

app.get('/api/huskies', async (_req, response) => {
  const url = new URL('https://scsuhuskies.com/services/scores_chris.aspx')
  const params = {
        format:"json",
  }

  url.search = new URLSearchParams(params).toString()
  res = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow',
        headers: {
          "Content-Type": "application/json",
        },
  })
  data = await res.json()
  response.send(JSON.stringify(data))
});

app.get('/api/baseball', async (_req, response) => {
  const year =  new Date().getFullYear()
  const url = new URL('https://statsapi.mlb.com/api/v1/schedule')
  const params = {
        startDate: "1/01/" + year,
        endDate: "12/31/" + year,
        gameTypes: "R",
        sportId: "1",
        teamId: "142",
        hydrate:"decisions",
  }

  url.search = new URLSearchParams(params).toString()

  res = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow',
        headers: {
          "Content-Type": "application/json",
        },
  })
  data = await res.json()
  response.send(JSON.stringify(data))
});
