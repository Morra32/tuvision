var  referralPeriod = 30;
var  url = window.location.href;
var  cjEvent;
var  isCjCookiePresent =  false;
if  (url.includes('cjevent')) {
	var  start = url.indexOf('cjevent');
	var  end = url.length;
	var  query = url.substring(start, end);
	var  newEnd = query.indexOf('&');
	if  (newEnd == -1) {
		newEnd = query.length
	};
	cjEvent = query.substring(8, newEnd);
	console.log('found cjevent in URL: '  + cjEvent);
	checkForCjCookie();
}
else	{
	checkForCjCookie();
};

function  checkForCjCookie() {
	var  name =  "cj=";
	var  decodedCookie = decodeURIComponent(document.cookie);
	var  ca = decodedCookie.split(';');
	for (var  i = 0; i < ca.length; i++) {
		var  c = ca[i];
		while  (c.charAt(0) ==  ' ') {
			c = c.substring(1);
		}
		if  (c.indexOf(name) == 0) {
			var  value = (c.substring(name.length));
			if  (cjEvent != undefined) {
				console.log('Found CJ Cookie');
				isCjCookiePresent =  true;
				updateCookie();
			}
			else  if  (value != undefined) {
				console.log('Found CJ Cookie, even though nothing in URL');
				setCjCookie('cj', value, referralPeriod);
			}
			else  { // console.log(i);
			}
		}
	}
	if  (cjEvent && !isCjCookiePresent) {
		console.log('cjevent in URL but no cookie');
		setCjCookie('cj', cjEvent, referralPeriod);
	}
}

function  updateCookie() {
	if  (isCjCookiePresent) {
		console.log('Deleting cookie');
		setCjCookie('cj', "", -1);
		console.log('Adding new cookie');
		setCjCookie('cj', cjEvent, referralPeriod);
	}
}

function  setCjCookie(cname, cvalue, exdays) {
	var  d =  new  Date();
	d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
	var  expires =  "expires=" + d.toUTCString();
	document.cookie = cname +  "="  + cvalue +  ";"  + expires +  ";path=/";
	storeId(cvalue);
}

function  storeId(cjEvent) {
	console.log("storing event ID: "  + cjEvent);
	$.ajax({
		type:   "POST",
		url:   '/cart.js',
		data: {
			"attributes[pagination]": cjEvent
		},
		success:   function(d) {
			console.log("success "  + d);
		},
		dataType:   'json'
	});
};