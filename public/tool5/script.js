function getGames() {
  fetch('../api/hockey')
  .then((res) => res.json())
  .then((data) => {
    let output = '<h2 class="mb-4">Games</h2>';
    data.forEach(function(games){
      output += `
        <div class="card card-body mb-3">
          <p>${games.DateUtc}</p>
          <h3>${games.HomeTeam}</h3>
          <p>${games.AwayTeam}</p>
        </div>
      `;
    });
    document.getElementById('output').innerHTML = output;
  })
}

window.onload = function() {
  console.log("onload called");
  document.getElementById('getGames').addEventListener('click', getGames);
}