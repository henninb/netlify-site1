import fetch from 'node-fetch';

//https://scsuhuskies.com/services/scores_chris.aspx?format=json
const url = new URL('https://scsuhuskies.com/services/scores_chris.aspx')
const params = {
      format:"json",
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
