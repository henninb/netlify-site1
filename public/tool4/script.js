function getFacts(){
  fetch('../api/cat-facts')
  .then((res) => res.json())
  .then((data) => {
    let output = '<h2 class="mb-4">Cat Facts</h2>';
    //data.forEach(function(fact){
      output += `
        <div class="card card-body mb-3">
          <h3>${data.fact}</h3>
        </div>
      `;
    //});
    document.getElementById('output').innerHTML = output;
  })
}