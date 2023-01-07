window.dataLayer = window.dataLayer || [];

function getCookie(name) {
    var re = new RegExp(name + "=([^;]+)");
    var value = re.exec(document.cookie);
    if (value != null) {
        const obj = JSON.parse(unescape(value[1]));

        return (obj.id != null) ? (obj.id) : null;
    }
    return (null);
}

function getParameter(paramName) {
  var searchString = window.location.search.substring(1),
      i, val, params = searchString.split("&");

  for (i=0;i<params.length;i++) {
    val = params[i].split("=");
    if (val[0] == paramName) {
      return val[1];
    }
  }
  return null;
}

function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

function setValue(id,newvalue) {
  var s = document.getElementById(id);
  s.value = newvalue;
}
//
// window.onload=function() {
//   setValue("guid", uuidv4());
// }
