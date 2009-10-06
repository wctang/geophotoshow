(function() {

var unsafewin = (typeof unsafeWindow != 'undefined') ? unsafeWindow : window;

function __fgs_launch_(lnk) {
	if (lnk.target)
		lnk = lnk.target;

	var opt = {link:lnk, photo_id:lnk.getAttribute('photo_id'), user_id:lnk.getAttribute('user_id'), group_id:lnk.getAttribute('group_id'), photoset_id:lnk.getAttribute('photoset_id')};
	if (!lnk.$win) {
		opt.link.$win = true; // loading

		var win = document.createElement('div');
		win.innerHTML = 
'<div class="fgs" style="position:absolute; z-index:99999; display:none;">'+
	'<a      class="closebtn" style="position:absolute; right:12px; top:6px;" title="Close"></a>'+ // close btn
	'<a      class="maxbtn"   style="position:absolute;right:32px;top:6px;" title="Max"></a>'+ // max btn
	'<div    class="title"    style="position:absolute; top:0; line-height:2em; left:.5em; right:55px; text-align:left;"></div>'+ // title
//	'<div    class="map"      style="position:absolute; top:2em; bottom:2em; width:100%; "></div>'+
	'<iframe class="content"  style="position:absolute; top:2em; bottom:2em; width:100%;" frameborder="0"></iframe>'+
	'<div    class="status"   style="position:absolute; bottom:0; line-height:2em; left:.5em; text-align:left;"></div>'+ // title
	'<div    class="latlng"   style="position:absolute; bottom:0; line-height:2em; right:.5em; text-align:right; font-size:small; font-style:italic; color:gray;"></div>'+ // title
'</div>';
		win = win.firstChild;

		document.body.insertBefore(win, document.body.firstChild);
		
		win.style.width = '516px';
		win.style.height = '313px';
		win.style.display = 'block';
		
		win.getElementsByClassName('content')[0].setAttribute('src', "http://localhost:8080/fembed");
	}
}

function initialize() {
/*
	var re_photo_map_link =    /^http:\/\/(?:www.*\.)?flickr\.com\/photos\/([a-zA-Z0-9\-\_@]+)\/(\d+)\/map(?:\/.*)?$/;
	var re_set_map_link =      /^http:\/\/(?:www.*\.)?flickr\.com\/photos\/([a-zA-Z0-9\-\_@]+)\/sets\/(\d+)\/map(?:\/.*)?$/;
	var re_user_map_link =     /^http:\/\/(?:www.*\.)?flickr\.com\/photos\/([a-zA-Z0-9\-\_@]+)\/map(?:\/.*)?$/;
	var re_organize_map_link = /^http:\/\/(?:www.*\.)?flickr\.com\/photos\/organize\/\?start_tab=map(?:\/.*)?$/;
	var re_group_map_link =    /^http:\/\/(?:www.*\.)?flickr\.com\/groups\/([a-zA-Z0-9\-\_@]+)\/map(?:\/.*)?$/;
	var re_world_map_link =    /^http:\/\/(?:www.*\.)?flickr\.com\/map(?:\/.*)?$/;

	function parseLink(p, exp) {
		if(!p) { return; }
		var lnks = p.getElementsByTagName('a');
		for(var ln in lnks) {
			var maplnk = lnks[ln];
			if(maplnk.href && exp.exec(maplnk.href)) {
				maplnk.setAttribute('onclick','return false;');
				maplnk.addEventListener('click',launch,false);
				return maplnk;
			}
		}
	}
	function parsePhotoMap(p) {
		var maplnk = parseLink(p, re_photo_map_link);
		if(maplnk) { maplnk.setAttribute('photo_id',RegExp.$2); }
	}
	function parseUserMap(p,user_id) {
		var maplnk = parseLink(p, re_user_map_link);
		if(maplnk) { maplnk.setAttribute('user_id',user_id); }
	}
	function parseWorldMap(p) {
		parseLink(p, re_world_map_link);
	}
	function parseGroupMap(p) {
		var maplnk = parseLink(p, re_group_map_link);
		if(maplnk) { maplnk.setAttribute('group_id',unsafewin.f.w.value); }
	}
	function parsePhotosetMap(p) {
		var maplnk = parseLink(p, re_set_map_link);
		if(maplnk) { maplnk.setAttribute('photoset_id',RegExp.$2); }
	}
	function parseOrganizeMap(p) {
		var maplnk = parseLink(p, re_organize_map_link);
		if(maplnk) { maplnk.setAttribute('organize_user_id',unsafewin.global_nsid); }
	}
*/

	if(       /^http:\/\/(?:www.*\.)?flickr\.com\/photos\/([a-zA-Z0-9\-\_@]+)\/(\d+)(?:\/.*)?$/.exec(location.href)) {
		var pp = document.getElementById('div_taken_in_links');
		if(pp) {
			pp = pp.getElementsByTagName('a');
			if (pp.length == 2) {
				pp[0].setAttribute('photo_id',RegExp.$2);
				pp[0].setAttribute('onclick','return false;');
				pp[0].addEventListener('click',__fgs_launch_,false);

				pp[1].setAttribute('photo_id',RegExp.$2);
				pp[1].setAttribute('onclick','return false;');
				pp[1].addEventListener('click',__fgs_launch_,false);
			}
		}
	} else if(/^http:\/\/(?:www.*\.)?flickr\.com\/photos\/([a-zA-Z0-9\-\_@]+)\/sets\/(\d+)(?:\/.*)?$/.exec(location.href)) {
/*
		paras = document.getElementsByTagName('p');
		for(pp in paras) {
			paras[pp].className == 'Do' && parsePhotoMap(paras[pp]);
			paras[pp].className == 'Links' && parsePhotosetMap(paras[pp]);
		}
*/
	} else if(/^http:\/\/(?:www.*\.)?flickr\.com\/photos\/([a-zA-Z0-9\-\_@]+)(?:\/.*)?$/.exec(location.href)) {
/*
		paras = document.getElementsByTagName('p');
		for(pp in paras) {
			paras[pp].className == 'Do' && parsePhotoMap(paras[pp]);
			paras[pp].className == 'Links' && parseUserMap(paras[pp],unsafewin.f.w.value);
		}
*/
	} else if(/^http:\/\/(?:www.*\.)?flickr\.com\/explore(?:\/.*)?$/.exec(location.href)) {
//		parseWorldMap(document.getElementById('Main'));
	} else if(/^http:\/\/(?:www.*\.)?flickr\.com\/groups\/([a-zA-Z0-9\-\_@]+)(?:\/.*)?$/.exec(location.href)) {
//		paras = document.getElementsByTagName('p');
//		for(pp in paras) {
//			paras[pp].className == 'Links' && parseGroupMap(paras[pp]);
//		}
	}

//	parseUserMap(document.getElementById('candy_nav_menu_you'), unsafewin.global_nsid);
//	parseOrganizeMap(document.getElementById('candy_nav_menu_organize'));
//	parseWorldMap(document.getElementById('candy_nav_menu_explore'));
}

initialize();

})();
