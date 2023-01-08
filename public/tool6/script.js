function getPosts() {
  fetch('../api/board')
  .then((res) => res.json())
  .then((data) => {
    let output = '<h2 class="mb-4">Action</h2>';
    //data.forEach(function(post){
      output += `
        <div class="card card-body mb-3">
          <h3>${data.activity}</h3>
        </div>
      `;
    //});
    document.getElementById('output').innerHTML = output;
  })
}

window.onload = function() {
  console.log("onload called");
  document.getElementById('getPosts').addEventListener('click', getPosts);
}