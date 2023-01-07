console.log("test");

// program to convert celsius to fahrenheit
// ask the celsius value to the user 
//const celsius = prompt("Enter a celsius value: ");

// calculate fahrenheit
//const fahrenheit = (celsius * 1.8) + 32

// display the result
//console.log(`${celsius} degree celsius is equal to ${fahrenheit} degree fahrenheit.`);


function cToF(celsius) {
  var cTemp = celsius;
  var cToFahr = cTemp * 9 / 5 + 32;
  var message = cTemp+'\xB0C is ' + cToFahr + ' \xB0F.';
    console.log(message);
}

function fToC(fahrenheit) {
  var fTemp = fahrenheit;
  var fToCel = (fTemp - 32) * 5 / 9;
  var message = fTemp+'\xB0F is ' + fToCel + '\xB0C.';
  console.log(message);
} 
cToF(60);
fToC(45);
