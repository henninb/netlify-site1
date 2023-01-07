import fetch from 'node-fetch';

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

exports.handler = async (event, context) => {
  let response
  try {
    response = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow',
        headers: {
          "Content-Type": "application/json",
        },
  })
    // response = await fetch(API_ENDPOINT)
    data = await response.json()
    // handle response
  } catch (err) {
    return {
      statusCode: err.statusCode || 500,
      body: JSON.stringify({
        error: err.message
      })
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify(data),
  }
}
