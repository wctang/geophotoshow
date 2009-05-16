(function() {

//
// Global object: gmap, sett
//

//if (typeof loadFirebugConsole !== 'undefined') loadFirebugConsole();
//if (typeof console === 'undefined') {
//  var console = { log: function(){} };
//}

var undefined;

function FlickrPhoto(p) {
	this.id = p.id;
	this.sec = p.secret;
	this.t = p.title;
	this.lat = parseFloat(p.latitude);
	this.lng = parseFloat(p.longitude);
	this.acc = parseInt(p.accuracy,10);
	this.du = parseInt(p.dateupload,10);
	this.dt = p.datetaken;
	this.oi = p.owner;
	this.on = p.ownername;
	this.h = parseInt(p.o_height,10);
	this.w = parseInt(p.o_width,10);
	this.frm = p.farm;
	this.srv = p.server;
	this.inf = p.iconfarm;
	this.ins = p.iconserver;
	if (p.media === 'video') {
		this.med = 1;
	} else {
		this.med = 0;
	}
}
FlickrPhoto.prototype = {
	isVideo: function() { return this.med === 1; },
	hasGeo: function() { return this.acc !== 0; },
	getTitle: function() { return this.t; },
	getIconUrl: function() { return 'http://farm'+this.frm+'.static.flickr.com/'+this.srv+'/'+this.id+'_'+this.sec+'_s.jpg'; }, //75x75
	getThumbUrl: function() { return 'http://farm'+this.frm+'.static.flickr.com/'+this.srv+'/'+this.id+'_'+this.sec+'_t.jpg'; }, //max100
	getSmallUrl: function() { return 'http://farm'+this.frm+'.static.flickr.com/'+this.srv+'/'+this.id+'_'+this.sec+'_m.jpg'; }, //max240
	getMediumUrl: function() { return 'http://farm'+this.frm+'.static.flickr.com/'+this.srv+'/'+this.id+'_'+this.sec+'.jpg'; }, //max500
	getLargeUrl: function() { return 'http://farm'+this.frm+'.static.flickr.com/'+this.srv+'/'+this.id+'_'+this.sec+'_b.jpg'; }, //max1024
	getFitUrl: function(w, h) {
		if ((w > 1024 && h > 1024) || (this.w >= this.h && w > 1024 && (w*this.h/this.w) < h) || (this.w < this.h && h > 1024 && (h*this.w/this.h) < w)) {
			return this.getLargeUrl();
		} else if ((w > 500 && h > 500) || (this.w >= this.h && w > 500 && (w*this.h/this.w) < h) || (this.w < this.h && h > 500 && (h*this.w/this.h) < w)) {
			return this.getMediumUrl();
		} else if ((w > 240 && h > 240) || (this.w >= this.h && w > 240 && (w*this.h/this.w) < h) || (this.w < this.h && h > 240 && (h*this.w/this.h) < w)) {
			return this.getSmallUrl();
		} else {
			return this.getThumbUrl();
		}
	},
	getVideoUrl: function() { return 'photo_secret='+this.sec+'&photo_id='+this.id; },
	getPageUrl: function() { return 'http://www.flickr.com/photo.gne?id='+this.id; },
	getOwnerName: function() { return this.on; },
	getOwnerUrl: function() { return 'http://www.flickr.com/photos/'+this.oi+'/'; },
	getBuddyiconUrl: function() { return ( (this.ins == 0 && this.inf == 0) ? 'http://www.flickr.com/images/buddyicon.jpg' : 'http://farm'+this.inf+'.static.flickr.com/'+this.ins+'/buddyicons/'+this.oi+'.jpg' ); },
	getUploadDate: function() { return new Date(this.du*1000); },
	getUploadDateStr: function() { return this.getUploadDate().toLocaleDateString(); },
	getUploadDateUrl: function() {
		var d = this.getUploadDate();
		return 'http://www.flickr.com/photos/'+this.oi+'/archives/date-posted/'+d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate()+'/';
	},
	getTakenDate: function() {
		if (!this.dt || !/^(\d+)\-(\d+)\-(\d+) (\d+)\:(\d+)\:(\d+)$/.exec(this.dt))
			return this.getUploadDate();
		return new Date(RegExp.$1,RegExp.$2-1,RegExp.$3,RegExp.$4,RegExp.$5,RegExp.$6);
	},
	getTakenDateStr: function() { return this.getTakenDate().toLocaleDateString(); },
	getTakenDateUrl: function() {
		var d = this.getTakenDate();
		return 'http://www.flickr.com/photos/'+this.oi+'/archives/date-taken/'+d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate()+'/';
	}
};


var flickr = {
	extras: 'geo,date_upload,date_taken,owner_name,icon_server,o_dims,media',
	_api_key: API_KEY,

  //// GM Script
  //_callApi: function(methodname, opts, obj) {
  //    if(typeof(obj) === 'function') {
  //      var tmp={};
  //      tmp[methodname.replace(/\./g,'_')+'_onLoad']=obj;
  //      obj=tmp;
  //    }
  //    unsafewin.F.API.callMethod(methodname, opts, obj);
  //}.
	_callcount: 0,

	_callApi: function(methodname, opts, cb, issig) {
		var head = document.getElementsByTagName("head")[0];
		var script = document.createElement('script');
		script.type = 'text/javascript';

		var cb_id = 'flickrcb'+(+new Date)+(flickr._callcount++);
		opts.method = methodname;
		opts.format = 'json';
		opts.jsoncallback = cb_id;

		window[cb_id] = function(rsp) {
			if (!rsp || rsp.stat !== 'ok') {
				cb(null, opts, flickr);
				rsp.message = rsp.message || 'Unknown error!';
				ui_ctl.on_error(rsp.message);
			} else {
				rsp.photos = rsp.photos || rsp.photoset; // set photoset to photos
				cb(rsp, opts, flickr);
			}
			window[cb_id] = undefined;
			try { delete window[cb_id]; } catch (e) {}
			if (head) {
				head.removeChild(script);
			}
		};

		var req = [];
		if (issig) {
			$.each(opts, function(k,v) {
				if (k.charAt(0)==='_' || !opts.hasOwnProperty(k)) return;
				req.push('"'+k+'":"'+v+'"');
			});

			$.ajax( {type:'POST', url:'signcall', data:'{'+req.join(',')+'}', success:function(signedurl) {
				if (!/^http\:\/\//.exec(signedurl)) {
					document.location.reload();
					return;
				}

				script.src = signedurl;
				if (head)
					head.appendChild(script);
			}});
		} else {
			opts.api_key = flickr._api_key;
			//$.ajax({dataType:'jsonp', jsonp:'jsoncallback', url:'http://flickr.com/services/rest', data:opts, success:callback});
			$.each(opts, function(k,v) {
				if (k.charAt(0)==='_' || !opts.hasOwnProperty(k)) return;
				req.push(encodeURIComponent(k)+'='+encodeURIComponent(v));
			});

			script.src = 'http://flickr.com/services/rest?'+req.join('&');
			if (head) {
				head.appendChild(script);
			}
		}
	},

	getPage: function(rsp) { return parseInt(rsp.photos.page,10); },
	getPages: function(rsp) { return parseInt(rsp.photos.pages,10); },
	parsePhotos: function(photos, rsp, have_geo) {
		$.each(rsp.photos.photo, function(i,p) {
			var acc = parseInt(p.accuracy,10);
			if (have_geo && !acc) return;

			photos.push(new FlickrPhoto(p));
		});
	},
	getPlaceUrl: function(placeid) { return 'http://www.flickr.com/places/'+placeid; },

	// API
	groups: {
		pools: {
			getPhotos: function(opts, cb, issig) {
				opts.extras = flickr.extras;
				return flickr._callApi('flickr.groups.pools.getPhotos', opts, cb, issig);
			}
		}
	},
	panda: {
		getPhotos: function(opts, cb) {
			opts.extras = flickr.extras;
			return flickr._callApi('flickr.panda.getPhotos', opts, cb);
		}
	},
	people: {
		getPublicGroups: function(opts, cb) {
			return flickr._callApi('flickr.people.getPublicGroups', opts, cb);
		}
	},
	contacts: {
		getList: function(opts, cb) {
			return flickr._callApi('flickr.contacts.getList', opts, cb, true);
		}
	},
	photos: {
		geo: {
			setLocation: function(opts, cb) {
				return flickr._callApi('flickr.photos.geo.setLocation', opts, cb, true);
			},
			removeLocation: function(opts, cb) {
				return flickr._callApi('flickr.photos.geo.removeLocation', opts, cb, true);
			}
		},
		getNotInSet: function(opts, cb) {
			opts.extras = flickr.extras;
			return flickr._callApi('flickr.photos.getNotInSet', opts, cb, true);
		},
		getUntagged: function(opts, cb) {
			opts.extras = flickr.extras;
			return flickr._callApi('flickr.photos.getUntagged', opts, cb, true);
		},
		getWithGeoData: function(opts, cb) {
			opts.extras = flickr.extras;
			return flickr._callApi('flickr.photos.getWithGeoData', opts, cb, true);
		},
		getWithoutGeoData: function(opts, cb) {
			opts.extras = flickr.extras;
			return flickr._callApi('flickr.photos.getWithoutGeoData', opts, cb, true);
		},
		recentlyUpdated: function(opts, cb) {
			opts.extras = flickr.extras;
			return flickr._callApi('flickr.photos.recentlyUpdated', opts, cb, true);
		},
		search: function(opts, cb, issig) {
			opts.extras = flickr.extras;
			return flickr._callApi('flickr.photos.search', opts, cb, issig);
		}
	},
	photosets: {
		getInfo: function(opts, cb) {
			return flickr._callApi('flickr.photosets.getInfo', opts, cb);
		},
		getList: function(opts, cb) {
			return flickr._callApi('flickr.photosets.getList', opts, cb);
		},
		getPhotos: function(opts, cb, issig) {
			opts.extras = flickr.extras;
			return flickr._callApi('flickr.photosets.getPhotos', opts, cb, issig);
		}
	},
	places: {
		findByLatLon: function(opts, cb) {
			return flickr._callApi('flickr.places.findByLatLon', opts, cb);
		},
		getInfo: function(opts, cb) {
			return flickr._callApi('flickr.places.getInfo', opts, cb);
		},
		resolvePlaceId: function(opts, cb) {
			return flickr._callApi('flickr.places.resolvePlaceId', opts, cb);
		},
		resolvePlaceURL: function(opts, cb) {
			return flickr._callApi('flickr.places.resolvePlaceURL', opts, cb);
		},
		tagsForPlace: function(opts, cb) {
			return flickr._callApi('flickr.places.tagsForPlace', opts, cb);
		}
	},
	tags: {
		getListUserPopular: function(opts, cb) {
			return flickr._callApi('flickr.tags.getListUserPopular', opts, cb);
		}
	}
};


settings_ctl = {
	mode: 'browse',
	refresh: 'auto',
	browse_perpage: '25',
	browse_viewas: 'icons',
	browse_sortby: 'interestingness',
	geotag_perpage: '25',
	geotag_viewas: 'icons',
	phoset_viewas: 'icons',

	_init: function() {
		var sett = {};
		try {
			var str = $.cookie('settings');
			if (str)
				sett = eval('('+str+')');
		} catch (e) {}
		$.each(sett, function(k,v) {
			settings_ctl[k] = v;
		});

		if (/^#ll=([\-\d\,\.]+)&z=(\d+)(.*)$/.exec(location.hash)) {
			var params = RegExp.$3;
			if (/mod=([a-z]+)/.exec(params))  settings_ctl.mode = RegExp.$1;
			if (/sort=([a-z]+)/.exec(params)) settings_ctl.browse_sortby = RegExp.$1;
			if (/perpage=(\d+)/.exec(params)) settings_ctl.browse_perpage = RegExp.$1;
		}
	},

	_save: function() {
		if (user) { // don't change mode setting when not sign in.
			this.mode = mod_ctl.getCurrentMod();
		}

		var ss = [];
		$.each(this, function(k,v) {
			if (k.charAt(0) !== '_')
				ss.push(k+':"'+v+'"');
		});
		$.cookie('settings', '{'+ss.join(',')+'}', {expires:365});
	}
};

//
// a show module plugin
// xxx = {
// init: function() {},
// showPhoto: function(p) {}
// }
// and set to mod_ctl.showmode
//
var showpanel_ctl = {
	streetviewClient: new GStreetviewClient(),
	photo_gmap: null,

	init: function() {
		var $p = $(
		'<div id="showpanel" style="position:absolute; top:0; bottom:0; left:0; right:0; z-index:1; display:none;">'+
			'<div id="showpanel_bg" style="position:absolute; left:0; right:0; top:0; bottom:0; background-color:black;"></div>'+
			'<div id="showpanel_content" style="position:absolute; top:0px; bottom:0; right:0; left:0; overflow:auto;">'+
				'<div style="margin:auto; width:500px; padding:10px; background-color:white;">'+
					'<div class="bar" style="background-color:#D5DDF3;">'+
						'<img class="close" src="/images/transparent.png" style="float:right; margin:5px 10px;"/>'+
						'<span id="showpanel_switch" style="float:right;">'+
							'<a id="showpanel_switch_photo" href="javascript:void(0)">Photo</a>'+
							'<a id="showpanel_switch_video" href="javascript:void(0)">Video</a>'+
							'<a id="showpanel_switch_map" href="javascript:void(0)">Map</a>'+
							'<a id="showpanel_switch_streetview" href="javascript:void(0)">Street View</a>'+
						'</span>'+
					'</div>'+
					'<div style="padding:5px 0px;">'+
						'<a class="title" target="_blank"></a>'+
					'</div>'+
					'<div style="margin-top:.5m;">'+
						'<a class="buddyurl" target="_blank"><img class="buddy" style="width:48px; height:48px; background:transparent url(/images/loading.gif);"></img></a>'+
						'<span>From <a class="owner" target="_blank"></a></span><br/>'+
						'<span>Posted on <a class="uploaddate" target="_blank"></a>, Taken on <a class="takendate" target="_blank"></a></span>'+
					'</div>'+
					'<div style="margin-top:1.5em; position:relative;">'+
						'<div id="showpanel_tab_bg" style="position:absolute; width:500px; height:300px; padding:10px; left:-10px; top:-10px; background-color:white;">'+
						'</div>'+
						'<div id="showpanel_tab_photo" class="showpanel_tab" style="position:absolute; width:500px; height:300px; background:transparent url(/images/loading.gif) no-repeat center;">'+
							'<img class="photo"/>'+
						'</div>'+
						'<div id="showpanel_tab_video" class="showpanel_tab" style="position:absolute; width:500px; height:300px; background:transparent url(/images/loading.gif) no-repeat center;">'+
						'</div>'+
						'<div id="showpanel_tab_map" class="showpanel_tab" style="position:absolute;">'+
							'<div id="photomap"></div>'+
						'</div>'+
						'<div id="showpanel_tab_streetview" class="showpanel_tab" style="position:absolute;">'+
							'<div id="panorama_ctnr"></div>'+
						'</div>'+
					'</div>'+
				'</div>'+
			'</div>'+
		'</div>');

		$p.find('img.close').click(function() { showpanel_ctl.hide(); });
		$p.find('#showpanel_content').click(function(e) {
			if ($(e.target).attr('id') === 'showpanel_content') {
				showpanel_ctl.hide();
			}
		});
		$p.find('#showpanel_bg').css('opacity', .8);

		$p.find('#showpanel_switch a').click(function() {
			var tab = $(this).attr('id').replace(/showpanel_switch_/,'');
			showpanel_ctl.showpanelSwitchTo(tab);
		});
		gmap.getContainer().appendChild($p.get(0));
	},
	showPhoto: function(p) {
		var $sp = $('#showpanel');
		$sp.find('.title').attr('href',p.getPageUrl()).text(p.getTitle()).end()
			.find('.buddyurl').attr('href',p.getOwnerUrl()).end()
			.find('.buddy').attr('src','/images/transparent.png').end()
			.find('.owner').attr('href',p.getOwnerUrl()).text(p.getOwnerName()).end()
			.find('.uploaddate').attr('href',p.getUploadDateUrl()).text(p.getUploadDateStr()).end()
			.find('.takendate').attr('href',p.getTakenDateUrl()).text(p.getTakenDateStr());

		$('#showpanel .buddy').get(0).url = p.getBuddyiconUrl();
		var buddyicon = new Image();
		buddyicon.onload = function() {
			var $sp = $('#showpanel .buddy');
			if (this.src === $sp.get(0).url) {
				$sp.attr('src',this.src);
			}
		};
		buddyicon.src = p.getBuddyiconUrl();

		if (p.isVideo()) {
			$('#showpanel_switch_photo').hide();
			$('#showpanel_switch_video').show();
			showpanel_ctl.showpanelSwitchTo('video');

			$('#showpanel_tab_video').empty().append(
			'<object type="application/x-shockwave-flash" width="500" height="350" data="http://www.flickr.com/apps/video/stewart.swf?v=71377" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000">'+
				'<param name="flashvars" value="'+p.getVideoUrl()+'"></param>'+
				'<param name="movie" value="http://www.flickr.com/apps/video/stewart.swf?v=71377"></param>'+
				'<param name="bgcolor" value="#000000"></param>'+
				'<param name="allowFullScreen" value="true"></param>'+
				'<embed type="application/x-shockwave-flash" src="http://www.flickr.com/apps/video/stewart.swf?v=71377" bgcolor="#000000" allowfullscreen="true" flashvars="'+p.getVideoUrl()+'" width="500" height="350">'+
				'</embed>'+
			'</object>');
			$('#showpanel_tab_bg').animate({height:350});
		} else {
			$('#showpanel_switch_photo').show();
			$('#showpanel_switch_video').hide();
			showpanel_ctl.showpanelSwitchTo('photo');
			$sp.find('.photo').fadeOut('fast');

			$('#showpanel .photo').get(0).url = p.getMediumUrl();
			var mainphoto = new Image();
			mainphoto.onload = function() {
				var $sp = $('#showpanel .photo');
				if (this.src === $sp.get(0).url) {
					$('#showpanel_tab_bg').animate({height:this.height});
					$('#showpanel_tab_photo').css({left:(500-this.width)/2, width:this.width, height:this.height});
					$sp.attr('src',this.src).stop(true, true).fadeIn('fast');
				}
			};
			mainphoto.src = p.getMediumUrl();
		}

		$('#showpanel_content').get(0).scrollTop = 0;


		$('#showpanel_switch_streetview').hide();

		if (!p.hasGeo()) {
			$('#showpanel_switch_map').hide();
		} else {
			$('#showpanel_switch_map').show().get(0).p = p;

			if (p.acc >= 14) {
				showpanel_ctl.streetviewClient.getNearestPanorama(new GLatLng(p.lat,p.lng), function(response) {
					if (response.code != 200) return;

					$('#showpanel_switch_streetview').show().get(0).location = response.location;
				});
			}
		}

		$sp.fadeIn('fast');
		gmap.disableScrollWheelZoom();
	},
	hide: function() {
		$('#showpanel').fadeOut('fast').find('.photo').hide();
		gmap.enableScrollWheelZoom();
	},
	showpanelSwitchTo: function(tab) {
		$('#showpanel_switch a').removeClass('sel');
		$('#showpanel_switch_'+tab).addClass('sel');
		$('.showpanel_tab').css({'top':-1000});
		$('#showpanel_tab_'+tab).css({'top':0});

		var ww = 500, hh = 350;
		switch (tab) {
		case 'photo':
			var ph = $('#showpanel_tab_photo').height();
			if (ph !== 0) {
				$('#showpanel_tab_bg').animate({height:ph});
			}
			break;
		case 'video':
			$('#showpanel_tab_bg').animate({height:hh});
			break;
		case 'map': {
			$('#showpanel_tab_bg').animate({height:hh});
			var p = $('#showpanel_switch_map').get(0).p;
			if (!p) return;

			$('#photomap').css({width:ww, height:hh});

			if (!this.photo_gmap) {
				this.photo_gmap = new GMap2($('#photomap').get(0));
				this.photo_gmap.setUIToDefault();
				this.photo_gmap.disableDoubleClickZoom();
				this.photo_gmap.addControl(new GOverviewMapControl());
			}

			this.photo_gmap.checkResize();
			var platlng = new GLatLng(p.lat,p.lng);
			this.photo_gmap.setCenter(platlng, p.acc);
			this.photo_gmap.clearOverlays();
			this.photo_gmap.addOverlay(new GMarker(platlng));
			$('#showpanel_switch_map').get(0).p = null;
			break;
		}
		case 'streetview': {
			$('#showpanel_tab_bg').animate({height:hh});
			var loc = $('#showpanel_switch_streetview').get(0).location;
			if (!loc) return;

			$('#panorama_ctnr').empty();
			var $ctnr = $('<div id="panorama_show"></div>');
			$ctnr.css({width:ww, height:hh}).appendTo('#panorama_ctnr');
			new GStreetviewPanorama($ctnr.get(0), {latlng: loc.latlng, pov: loc.pov});
			$('#showpanel_switch_streetview').get(0).location = null;
			break;
		}
		}
	}
};

var embedpanel_ctl = {
	streetviewClient: new GStreetviewClient(),
	photo_gmap: null,

	init: function() {
		var $p = $(
		'<div id="showpanel" style="position:absolute; top:0; bottom:0; left:0; right:0; background-color:white; z-index:1; display:none;">'+
			'<div class="bar" style="background-color:#D5DDF3;">'+
				'<h1><a class="title" target="_blank"></a></h1>'+
				'<img class="close" src="/images/transparent.png" style="float:right; margin:5px 20px;"/>'+
			'</div>'+
			'<div id="showpanel_content" style="position:absolute; top:1.7em; bottom:0; right:0; left:0; overflow:auto; margin:3px;">'+
				'<div style="margin:auto; padding:3px 0 10px 0;">'+
					'<div style="margin-top:1em; display:none;">'+
						'<a class="buddyurl" target="_blank"><img class="buddy"></img></a>'+
						'<span>From <a class="owner" target="_blank"></a></span><br/>'+
						'<span>Posted on <a class="uploaddate" target="_blank"></a>, Taken on <a class="takendate" target="_blank"></a></span>'+
					'</div>'+
					'<div style="position:absolute; font-size:8pt;">'+
						'<div class="bar">'+
							'<span id="showpanel_switch">'+
								'<a id="showpanel_switch_photo" href="javascript:void(0)">Photo</a>'+
								'| <a id="showpanel_switch_map" href="javascript:void(0)">Map</a>'+
								'| <a id="showpanel_switch_streetview" href="javascript:void(0)">Street View</a>'+
							'</span>'+
						'</div>'+
						'<div id="showpanel_tab_photo" class="showpanel_tab" style="position:absolute;">'+
							'<img class="photo"/>'+
						'</div>'+
						'<div id="showpanel_tab_map" class="showpanel_tab" style="position:absolute;">'+
							'<div id="photomap"></div>'+
						'</div>'+
						'<div id="showpanel_tab_streetview" class="showpanel_tab" style="position:absolute;">'+
							'<div id="panorama_ctnr"></div>'+
						'</div>'+
					'</div>'+
				'</div>'+
			'</div>'+
		'</div>');

		$p.find('img.close').click(function() { embedpanel_ctl.hide(); });

		$p.find('#showpanel_switch a').click(function() {
			var tab = $(this).attr('id').replace(/showpanel_switch_/,'');
			embedpanel_ctl.showpanelSwitchTo(tab);
		});
		gmap.getContainer().appendChild($p.get(0));
	},
	showPhoto: function(p) {
		embedpanel_ctl.showpanelSwitchTo('photo');
		var $sp = $('#showpanel');
		$sp.find('.photo').attr('src','/images/transparent.png').end()
			.find('.title').attr('href',p.getPageUrl()).text(p.getTitle()).end()
			.find('.buddyurl').attr('href',p.getOwnerUrl()).end()
			.find('.buddy').attr('src',p.getBuddyiconUrl()).end()
			.find('.owner').attr('href',p.getOwnerUrl()).text(p.getOwnerName()).end()
			.find('.uploaddate').attr('href',p.getUploadDateUrl()).text(p.getUploadDateStr()).end()
			.find('.takendate').attr('href',p.getTakenDateUrl()).text(p.getTakenDateStr());

		$('#showpanel_content').get(0).scrollTop = 0;

		$sp.fadeIn('fast');
		gmap.disableScrollWheelZoom();

		var $s = $('#showpanel_content');
		var w = $s.width();
		var h = $s.height();
		if (w > 500 && h > 500) {
			$sp.find('.photo').attr('src',p.getMediumUrl());
		} else {
			$sp.find('.photo').attr('src',p.getFitUrl(w, h));
		}

		$('#showpanel_switch_streetview').hide();

		if (!p.hasGeo()) {
			$('#showpanel_switch_map').hide();
		} else {
			$('#showpanel_switch_map').show().get(0).p = p;

			if (p.acc >= 14) {
				embedpanel_ctl.streetviewClient.getNearestPanorama(new GLatLng(p.lat,p.lng), function(response) {
					if (response.code != 200) return;

					$('#showpanel_switch_streetview').show().get(0).location = response.location;
				});
			}
		}
	},
	hide: function() {
		$('#showpanel').fadeOut('fast');
		gmap.enableScrollWheelZoom();
	},
	showpanelSwitchTo: function(tab) {
		$('#showpanel_switch a').removeClass('sel');
		$('#showpanel_switch_'+tab).addClass('sel');

		$('.showpanel_tab').css( {'left':-1000});
		$('#showpanel_tab_'+tab).css( {'left':0});

		var ww = 500, hh = 350;
		var $s = $('#showpanel_content');
		var w = $s.width();
		var h = $s.height();
		if (w-10 < ww) ww = w-10;
		if (h-20 < hh) hh = h-20;

		switch (tab) {
		case 'photo':
			break;
		case 'map': {
			var p = $('#showpanel_switch_map').get(0).p;
			if (!p) return;

			var $s = $('#showpanel_content');
			var w = $s.width();
			var h = $s.height();

			$('#photomap').css({width:ww, height:hh});

			if (!this.photo_gmap) {
				this.photo_gmap = new GMap2($('#photomap').get(0));
				this.photo_gmap.setUIToDefault();
				this.photo_gmap.disableDoubleClickZoom();
				this.photo_gmap.addControl(new GOverviewMapControl());
			}

			this.photo_gmap.checkResize();
			var platlng = new GLatLng(p.lat,p.lng);
			this.photo_gmap.setCenter(platlng, p.acc);
			this.photo_gmap.clearOverlays();
			this.photo_gmap.addOverlay(new GMarker(platlng));
			$('#showpanel_switch_map').get(0).p = null;
			break;
		}
		case 'streetview': {
			var loc = $('#showpanel_switch_streetview').get(0).location;
			if (!loc) return;

			$('#panorama_ctnr').empty();
			var $ctnr = $('<div id="panorama_show"></div>');
			$ctnr.css({width:ww, height:hh}).appendTo('#panorama_ctnr');
			new GStreetviewPanorama($ctnr.get(0), {latlng: loc.latlng, pov: loc.pov});
			$('#showpanel_switch_streetview').get(0).location = null;
			break;
		}
		}
	}
};





var common_ctl = {
	deltas: [
		0,
		0,
		6.0471013966887784,
		3.0235506983443892,
		1.5117753491721946,
		0.7558876745860973,
		0.4381797339583715,
		0.2166893459120705,
		0.1054534198706207,
		0.0517575120441158,
		0.0256017451528869,
		0.012732042885645,
		0.00634837196261628,
		0.003169749786363714,
		0.001583755663266591,
		0.0007915970919446143,
		0.0003957279865313504,
		0.0001978462849822430,
		0.0000989186817588934,
		0.0000494593408794467,
		0.0000247296704397233],

	create: function() {
		if (!gmap) return;
		GEvent.addListener(gmap, "dragend", common_ctl.onMapDragend);
		GEvent.addListener(gmap, "zoomend", common_ctl.onMapZoomend);

		var mt = gmap.getMapTypes();
		for (var i=0; i<mt.length; i++) {
			mt[i].getMinimumResolution = function() { return 2; };
		}
	},
	getRefreshRange: function() {
		var $lt = $('#range_lt');
		var $rb = $('#range_rb');
		var nw = gmap.fromContainerPixelToLatLng(new GPoint(parseInt($lt.css('left'),10)+10, parseInt($lt.css('top'),10)+10));
		var se = gmap.fromContainerPixelToLatLng(new GPoint(parseInt($rb.css('left'),10)-10, parseInt($rb.css('top'),10)-10));
		var w = nw.lng();
		var e = se.lng();
		var n = nw.lat();
		var s = se.lat();

//    var bound = gmap.getBounds();
//    var sw = bound.getSouthWest();
//    var ne = bound.getNorthEast();
//    var w = sw.lng();
//    var e = ne.lng();
//    var n = ne.lat();
//    var s = sw.lat();

		if (w > 180) w-=360;
		if (e <= -180) e+=360;
		if (e < w) {
			if ((180+e) > (180-w)) { w=-180;
			} else { e=180; }
		}

		return w+','+s+','+e+','+n;
	},
	caculatePhotoGroups: function(photos) {
		var zoom = gmap.getZoom();
		var delta = this.deltas[zoom];

//	var pgrps=[]
//	for (var i=0,len=photos.length; i<len; ++i) {
//		var p = photos[i];
//		if(!p.pos) continue;
//
//		var merged = false;
//		for (var j=0,len2=pgrps.length; j<len2; ++j) {
//			var b = pgrps[j];
//			var bp = b.pos;
//			var pp = p.pos;
//			if (bp[0]+90+delta>pp[0]+90 && bp[0]+90-delta<pp[0]+90 && bp[1]+180+delta>pp[1]+180 && bp[1]+180-delta<pp[1]+180) {
//				merged = true;
//				b.photos.push(p);
//				break;
//			}
//		}
//
//		if(!merged) {
//			bb = {pos:p.pos}
//			bb.photos=[p]
//			pgrps.push(bb)
//		}
//	}
//
//	for (var i=0,len=pgrps.length; i<len; ++i) {
//		var pg = pgrps[i];
//		if(pg.photos.length === 0) { continue; }
//
//		var marker = marker_ctl.new_group_marker(pg);
//		gmap.addOverlay(marker);
//	}

		var pgrps=[]
		$.each(photos, function(i,p) {
			if (!p.hasGeo()) return;

			var merged = false;
			for (var j=0,len2=pgrps.length; j<len2; ++j) {
				var b = pgrps[j];
				var bp = b.sq;
				if (bp[0]+90+delta>p.lat+90 && bp[1]+90-delta<p.lat+90 && bp[2]+180+delta>p.lng+180 && bp[3]+180-delta<p.lng+180) {
					if (bp[0]<p.lat) bp[0]=p.lat;
					if (bp[1]>p.lat) bp[1]=p.lat;
					if (bp[2]<p.lng) bp[2]=p.lng;
					if (bp[3]>p.lng) bp[3]=p.lng;
					merged = true;
					b.photos.push(p);
					break;
				}
			}
			if (!merged) {
				pgrps.push({sq:[p.lat,p.lat,p.lng,p.lng], photos:[p]});
			}
		});

		$.each(pgrps, function(i,pg) {
			pg.lat = (pg.sq[0]+pg.sq[1])/2;
			pg.lng = (pg.sq[2]+pg.sq[3])/2;
			if (pg.lng>180)
				pg.lng-=360;
			else if (pg.lng<=-180)
				pg.lng+=360;
		});
		return pgrps;
	},
	createGroupMarker: function(photo_group) {
		var icon = new GIcon(), siz;
		icon.transparent= "/images/transparent.png";
		icon.label = {url:photo_group.photos[0].getIconUrl()};
		icon.label.anchor = new GPoint(4,4);
		if (photo_group.photos.length < 5) {
			siz = 22;
		} else if (photo_group.photos.length < 20) {
			siz = 32;
		} else {
			siz = 42;
		}
		icon.image = "/images/mbg"+siz+"x"+siz+".png";
		icon.iconSize = new GSize(siz, siz);
		icon.iconAnchor = new GPoint(siz/2, siz/2);
		icon.label.size = new GSize(siz-8,siz-8);

		var maker = new GMarker(new GLatLng(photo_group.lat, photo_group.lng), {icon:icon});
		maker.photos = photo_group.photos;
		return maker;
	},
	makePager: function($p, page, pages) {
		$p.empty();
		if ( pages <= 0) return;
		console.log(page, pages);

		var s = [0, 1, 2, page-2, page-1, page, page+1, page+2];
		if (page < 6) {
			s.push(2); s.push(3); s.push(4); s.push(5); s.push(6);
		}
		s.sort(function(a,b) { return a-b; });

		$p.append('<span class="pager_prev">prev</span>');
		for (var i=1; i<s.length; ++i) {
			if (s[i] < 1 || s[i] > pages || s[i] === s[i-1]) continue;

			if (s[i] !== s[i-1]+1) {
				$p.append('<span class="pager_dots">...</span>');
			}
			if (s[i] === page) {
				$p.append('<span class="pager_curr">'+s[i]+'</span>');
			} else {
				$p.append('<span class="pager_num">'+s[i]+'</span>');
			}
		}
		if (s[s.length-1] < pages) {
			$p.append('<span class="pager_dots">...'+pages+'</span>');
		}
		$p.append('<span class="pager_next">next</span>');
	},
	formatPhotoList: function( photos, show_type, has_owner, have_geo, have_checkbox, selected) {
		var $d = $('<div class="panel"></div>');

		$.each(photos, function(i, p) {
			var ps = '';
			var s = '';

			if (have_checkbox) {
				if ( $.inArray(p.id, selected) >= 0) {
					ps += '<input class="geotag_sel" type="checkbox" checked="true"></input>'
				} else {
					ps += '<input class="geotag_sel" type="checkbox"></input>'
				}
			}

			if (have_geo && p.hasGeo()) {
				ps += '<div class="havpos"><img class="pos" src="/images/transparent.png"/></div>';
			}

			if (show_type === 'detail') { // detail
				s += '<div class="item_detail">';
				s += ps;
				s += '<div class="thumb"><a target="_blank" href="'+p.getPageUrl()+'"><img class="f_thumb" src="'+p.getThumbUrl()+'" title="'+p.getTitle()+'"/>';
				if (p.isVideo()) {
					s += '<img src="/images/video.png" style="position:absolute; left:3px; top:3px;"></img>';
				}
				s += '</a></div>';
				s += '<div class="desc">';
				s += '<span class="title">'+p.getTitle()+'</span><br/>';
				if (has_owner) {
					s += '<a href="'+p.getOwnerUrl()+'" target="_blank"><img class="buddy" src="'+p.getBuddyiconUrl()+'"></img></a>'
					s += '<span class="owner">From <a href="'+p.getOwnerUrl()+'" target="_blank">'+p.getOwnerName()+'</a></span><br/>';
				}
				//s += '<span>Posted on <a href="'+p.getUploadDateUrl()+'" target="_blank">'+p.getUploadDateStr()+'</a><br/>Taken on <a href="'+p.getTakenDateUrl()+'" target="_blank">'+p.getTakenDateStr()+'</a></span>';
				s += '<span>Posted on <a href="'+p.getUploadDateUrl()+'" target="_blank">'+p.getUploadDateStr()+'</a></span>';
				s += '</div><div style="clear:both;"></div>';
				s += '</div>';
			} else if (show_type === 'thumb') { // thumb
				s += '<div class="item_thumb">';
				s += ps;
				s += '<div class="thumb"><a target="_blank" href="'+p.getPageUrl()+'"><img class="f_thumb" src="'+p.getThumbUrl()+'" title="'+p.getTitle()+'"/>';
				if (p.isVideo()) {
					s += '<img src="/images/video.png" style="position:absolute; left:3px; top:3px;"></img>';
				}
				s += '</a></div>';
				s += '</div>';
			} else { // icon
				s += '<div class="item_icon">';
				s += ps;
				s += '<div class="icon"><a target="_blank" href="'+p.getPageUrl()+'"><img class="f_icon" src="'+p.getIconUrl()+'" title="'+p.getTitle()+'"/>';
				if (p.isVideo()) {
					s += '<img src="/images/video.png" style="position:absolute; left:3px; top:3px;"></img>';
				}
				s += '</a></div>';
				s += '</div>';
			}

			$(s).appendTo($d).get(0).photo = p;
		});
		return $d.get(0);
	},

	parseGPX: function(gpx, ctnr) {
		var bound = new GLatLngBounds();

    //for(var i_wpt=0,n_wpt=gpx.wpt.length; i_wpt<n_wpt; ++i_wpt) {
    //  var wpt = gpx.wpt[i_wpt];
    //  var pt = new GLatLng(parseFloat(wpt.lat), parseFloat(wpt.lon));
    //  bound.extend(pt);
    //  geotag_ctl.curr_gpx.push(new GMarker(pt));
    //}

		$.each(gpx.rte, function(i,rte) {
			var color = null;
			//if (trk.color) { color = '#'+trk.color; }

			var polyllinept = [];
			$.each(rte.rtept, function(i,rtept) {
				var pt = new GLatLng(parseFloat(rtept.lat), parseFloat(rtept.lon));
				polyllinept.push(pt);
				bound.extend(pt);
			});
			polyllinept.push(polyllinept[0]);
			ctnr.push(new GPolyline(polyllinept, color, 3));
		});

		$.each(gpx.trk, function(i,trk) {
			var color = null;
			//if (trk.color) { color = '#'+trk.color; }

			$.each(trk.trkseg, function(i,trkseg) {
				var polyllinept = [];
				$.each(trkseg.trkpt, function(i,trkpt) {
					var pt = new GLatLng(parseFloat(trkpt.lat), parseFloat(trkpt.lon));
					polyllinept.push(pt);
					bound.extend(pt);
				});
				ctnr.push(new GPolyline(polyllinept, color, 3));
			});
		});

		return bound;
	},

	onMapDragend: function() {
		if (!gmap) return;

		var mod = mod_ctl.getCurrentModCtl();
		if (!mod) return;
		if (!mod.onMapDragend) return;

		return mod.onMapDragend();
	},
	onMapZoomend: function() {
		if (!gmap) return;

		var mod = mod_ctl.getCurrentModCtl();
		if (!mod) return;
		if (!mod.onMapZoomend) return;

		return mod.onMapZoomend();
	}
};


//
//var module_ctl = {
//	create: function() {},
//	init: function() {},
//	onActive: function() {},
//	onDeActive: function() {}
//};
//
var browse_ctl = {
	page: 1,
	pages: 0,
	user_id: null,
	auto_refresh: true,
	curr_photo_list: null,
	__markers: [],
	__timestamp: null,
	_center: null,

	create: function() {
		$('<a id="browse_switch" href="javascript:void(0)">Browse</a>').appendTo('.switch');

		var ss =
		'<div id="browse_tab" class="tab">'+
			'<div class="tabrow" style="height:2em;">'+
				'<select id="browse_type">'+
					'<option value="all" title="Search all photos.">All Photos</option>'+
					'<option value="video" title="Search all videos.">Only Video</option>';
		if (user) {
			ss +=
					'<option value="user" title="Only Search your photos.">Your Photos</option>'+
					'<optgroup label="Your contacts" id="contact_optgroup"></optgroup>';
		}
			ss +=
			          '</select>'+
			'</div>'+
			'<div class="tabrow" style="height:2em;">'+
				'<form id="browse_query" style="margin:0; padding:0;">'+
					'<input type="text" style="width:350px;"/>'+
					'<input type="submit" value="Search"/>'+
				'</form>'+
			'</div>'+
			'<div class="tabrow" style="height:10em;">'+
				'<div><span id="plac"></span><span class="taglist_clear" style="float:right;">Clear</span></div>'+
				'<div id="browse_taglist" class="taglist" style="height:7.5em;"></div>'+
			'</div>'+
			'<div class="tabrow" style="height:2em;">'+
				'<span id="browse_perpage" style="float:right;">'+
					'<span id="browse_perpage_25" class="perpage_num">25</span>'+
					'<span id="browse_perpage_50" class="perpage_num">50</span>'+
					'<span id="browse_perpage_100" class="perpage_num">100</span>'+
					'<span id="browse_perpage_200" class="perpage_num">200</span>'+
				'</span>'+
				'<span id="browse_pager"></span>'+
			'</div>'+
			'<div class="tabrow" style="height:2em;">'+
				'<span id="browse_viewas" style="float:right;">'+
					'<span id="browse_viewas_icons" class="viewas_type" type="icons">Icons</span>'+
					'<span id="browse_viewas_thumb" class="viewas_type" type="thumb">Thumbnail</span>'+
					'<span id="browse_viewas_detail" class="viewas_type" type="detail">Detail</span>'+
				'</span>'+
				'<span id="browse_sortby">'+
					'<span id="browse_sortby_posted" class="sortby_type" type="posted">Date</span>'+
					'<span id="browse_sortby_interestingness" class="sortby_type" type="interestingness">Rank</span>'+
				'</span>'+
			'</div>'+
			'<div id="browse_photolist" class="photolist" style="top:18.5em;"></div>'+
		'</div>';
		$(ss).appendTo('#tabs');

		if (navigator.geolocation || (google.loader && google.loader.ClientLocation)) {
			$('<a id="links_findmylocation" href="javascript:void(0)" style="display:none;">Find my location</a>')
				.appendTo('span.links')
				.click(function() { try {
					function jumpto(lat, lng, acc) {
						if (!acc) acc = 10;
						gmap.setCenter(new GLatLng(lat, lng), acc);
					}
					if (navigator.geolocation) {
						var that = this;
						if (that.loc) {
							jumpto(that.loc[0], that.loc[1], that.loc[2]);
						} else {
							navigator.geolocation.getCurrentPosition(function (position) {
								that.loc = [parseFloat(position.coords.latitude), parseFloat(position.coords.longitude), 8];
								// TODO should check position.coords.accuracy
								jumpto(that.loc[0], that.loc[1], that.loc[2]);
							});
						}
					} else if (google.loader && google.loader.ClientLocation) {
						jumpto(parseFloat(google.loader.ClientLocation.latitude), parseFloat(google.loader.ClientLocation.longitude), 8);
					}
				} finally { return false; }});
		}

		$('<a id="links_currentmap" target="_blank" style="display:none;"><img class="link" src="/images/transparent.png"/>Link to this map</a>')
			.appendTo('span.links')
			.click(function() { try {
				$('#links_currentmap_url').val(this.href);
				$('#links_currentmap_panel').show();
			} finally { return false; }});
		$('<div id="links_currentmap_panel" class="popup_panel" style="position:absolute; top:27px; right:10px; z-index:7; padding:5px 5px 10px 10px; display:none;">'+
			'<img class="close" src="/images/transparent.png" style="float:right;"/>'+
			'<div>Copy and paste the URL below:<br/>'+
			'<input id="links_currentmap_url" type="text" tabindex="400" style="width:29em;"/></div>'+
		'</div>').appendTo('#mainbar');
		$('#links_currentmap_panel .close').click(function(){ $(this.parentNode).hide(); });
		$('#links_currentmap_panel input').click(function(){ this.select(); });

		// load setting
		$('#browse_perpage').find('span').attr('class', 'perpage_num');
		$('#browse_perpage_'+settings_ctl.browse_perpage).attr('class', 'perpage_curr');
		$('#browse_viewas').find('span').attr('class', 'viewas_type');
		$('#browse_viewas_'+settings_ctl.browse_viewas).attr('class', 'viewas_curr');
		$('#browse_sortby').find('span').attr('class', 'sortby_type');
		$('#browse_sortby_'+settings_ctl.browse_sortby).attr('class', 'sortby_curr');
	},

	init: function() {
		function refresh() {
			try {
				browse_ctl.refreshPhotoGroup({page:1, no_delay:true});
			} finally {
				return false;
			}
		}

		$('#browse_type').change(refresh);
		$('#browse_query').submit(refresh);

		$('#browse_tab').click(function(e) {
			var clickon = e.target.tagName+':'+e.target.className;

			switch (clickon) {
			case 'SPAN:pager_prev': {
				if (browse_ctl.page - 1 > 0) {
					browse_ctl.refreshPhotoGroup({page:browse_ctl.page-1, no_delay:true});
				}
				break;
			}
			case 'SPAN:pager_num': {
				var page = parseInt($(e.target).text(),10);
				if (page === browse_ctl.page) break;
				browse_ctl.refreshPhotoGroup({page:page, no_delay:true});
				break;
			}
			case 'SPAN:pager_next': {
				if (browse_ctl.page + 1 <= browse_ctl.pages) {
					browse_ctl.refreshPhotoGroup({page:browse_ctl.page+1, no_delay:true});
				}
				break;
			}
			case 'SPAN:perpage_num': {
				$('#browse_perpage').find('span').attr('class', 'perpage_num');
				settings_ctl.browse_perpage = $(e.target).attr('class', 'perpage_curr').attr('id').replace(/browse_perpage_/, '');
				settings_ctl._save();
				browse_ctl.refreshPhotoGroup({page:1, no_delay:true});
				break;
			}
			case 'SPAN:sortby_type': {
				$('#browse_sortby').find('span').attr('class', 'sortby_type');
				settings_ctl.browse_sortby = $(e.target).attr('class', 'sortby_curr').attr('type');
				settings_ctl._save();
				browse_ctl.refreshPhotoGroup({page:1, no_delay:true});
				break;
			}
			case 'SPAN:viewas_type': {
				$('#browse_viewas').find('span').attr('class', 'viewas_type');
				settings_ctl.browse_viewas = $(e.target).attr('class', 'viewas_curr').attr('type');
				settings_ctl._save();
				if (!browse_ctl.curr_photo_list) return;
				browse_ctl.fillPhotoList();
				break;
			}
			case 'SPAN:tag': {
				$('#browse_taglist').find('span').attr('class', 'tag');
				e.target.className = 'tag_curr';
				browse_ctl.refreshPhotoGroup({page:1, no_delay:true});
				browse_ctl.refreshLinks();
				break;
			}
			case 'SPAN:taglist_clear': {
				$('#browse_taglist').find('span').attr('class', 'tag');
				browse_ctl.refreshPhotoGroup({page:1, no_delay:true});
				browse_ctl.refreshLinks();
				break;
			}

			case 'IMG:f_icon':
			case 'IMG:f_thumb':
			case 'DIV:imgtitle': {
				var p = e.target.parentNode.parentNode.parentNode.photo;
				if (!p) return;

				mod_ctl.showmode.showPhoto(p);
				return false;
			}
			}
		});

		if (!user) return;

		flickr.contacts.getList({user_id:user.nsid}, function(rsp, params, api) {
			if (!rsp) return;

			var $sel = $('#contact_optgroup');
			$sel.empty();
			if (!rsp.contacts || !rsp.contacts.contact) return;

			$.each(rsp.contacts.contact, function(i,ct) {
				$sel.append('<option value="'+ct.nsid+'" title="'+ct.realname+'">'+ct.username+'</option>');
			});
		});
	},
	isNeedRefresh: function(pos) {
		var bound=gmap.getBounds();
		if (!pos)
			pos=bound.getCenter();
		var span=bound.toSpan();

		if (!browse_ctl._center) return true;

		var dx = Math.abs(pos.lng() - this._center.lng());
		var dy = Math.abs(pos.lat() - this._center.lat());
		if ((dx < 0.15*span.lng()) && (dy < 0.15*span.lat())) return false;

		return true;
	},
	fillPhotoList: function() {
		var innerpanel = common_ctl.formatPhotoList(browse_ctl.curr_photo_list, settings_ctl.browse_viewas, true);
		$("#browse_photolist").empty().append(innerpanel).get(0).scrollTop = 0;
	},
	onGroupMarkerClick: function() {
		$.each(browse_ctl.__markers, function(i,m) {
			m.setImage(m.getIcon().image);
		});
		this.setImage(this.getIcon().image.replace('.png', 's.png'));

		browse_ctl.curr_photo_list = this.photos;
		browse_ctl.fillPhotoList();
		ui_ctl.expendPanel();
	},
	clearGroupMarker: function() {
		$.each(this.__markers, function(i,ov) { gmap.removeOverlay(ov); });
		this.__markers = [];
	},
	refreshPhotoGroupCallback: function(rsp, params, api) {
		if (browse_ctl.__timestamp !== params.__timestamp || mod_ctl.getCurrentMod() !== 'browse') {
			return;
		}

		try {
			if (!rsp) return;

			browse_ctl.page = api.getPage(rsp);
			browse_ctl.pages = api.getPages(rsp);
			common_ctl.makePager($('#browse_pager'), browse_ctl.page, browse_ctl.pages);

			var photos = [];
			api.parsePhotos(photos,rsp,true);

			browse_ctl.clearGroupMarker();

			$.each(common_ctl.caculatePhotoGroups(photos), function(i,pg) {
				var marker = common_ctl.createGroupMarker(pg);
				GEvent.addListener(marker, "click", browse_ctl.onGroupMarkerClick);
				browse_ctl.__markers.push(marker);
				gmap.addOverlay(marker);
			});

			browse_ctl.curr_photo_list = photos;
			browse_ctl.fillPhotoList();
		} finally {
			$('.popup_panel').hide();
			browse_ctl.refreshLinks();
			ui_ctl.endLoading();
		}
	},
	refreshPhotoGroup: function(actopt, timestamp) {
		if (!browse_ctl.auto_refresh && !actopt.no_delay) return;
		if (!timestamp) timestamp = browse_ctl.__timestamp = +new Date;
		if (browse_ctl.__timestamp !== timestamp) return;

		mod_ctl.showmode.hide();

		if (!actopt.no_delay) {
			actopt.no_delay = true;
			setTimeout( function() { browse_ctl.refreshPhotoGroup(actopt, timestamp); }, 2000);
			return;
		}

		if (actopt.page) {
			browse_ctl.page = actopt.page;
		}

		var pos = gmap.getCenter();
		browse_ctl._center = pos;

		var acc = gmap.getZoom() - 3; // include larger accuracy
		if (acc < 1) acc = 1;
		if (acc > 16) acc = 16;

		if (actopt.updatepos) {
			$('#plac').empty();
			$('#browse_taglist').empty();

			flickr.places.findByLatLon({lat:pos.lat(), lon:pos.lng(), accuracy:acc}, function(rsp, params, api) {
				if (!rsp || !rsp.places || !rsp.places.place || rsp.places.place.length == 0) return;
				$('<a target="_blank" href="http://www.flickr.com/places'+rsp.places.place[0].place_url+'">'+rsp.places.place[0].name+'</a>').appendTo('#plac');

				flickr.places.tagsForPlace({place_id:rsp.places.place[0].place_id}, function(rsp, params, api) {
					if (!rsp || !rsp.tags || !rsp.tags.tag) return;

					var ccc = '<div>';
					$.each(rsp.tags.tag, function(k, v) {
						ccc += '<span class="tag">'+v._content+'</span> ';
					});
					ccc += '</div>';
					$('#browse_taglist').append(ccc);
				});
			});
		}


		var bbox = common_ctl.getRefreshRange();
		var opts = {min_taken_date:'1800-01-01', bbox:bbox, accuracy:acc, page:browse_ctl.page, __timestamp:browse_ctl.__timestamp};

		var query = $.trim($('#browse_query').children(':text').val());
		if (query !== '') {
			opts.text = query;
		}

		var $tag_curr = $('#browse_taglist').find('.tag_curr');
		if ($tag_curr.size() > 0) {
			opts.tags = $tag_curr.text();
		}

		opts.per_page = settings_ctl.browse_perpage;

		if (settings_ctl.browse_sortby === 'posted') {
			opts.sort = 'date-posted-desc';
		} else if (settings_ctl.browse_sortby === 'interestingness') {
			opts.sort = 'interestingness-desc';
		}

		var browse_type = $('#browse_type').val();
		if (browse_type === 'user' && user) {
			opts.user_id = user.nsid;
		} else if (browse_type === 'video') {
			opts.media = 'videos';
		} else if (/^\d+@N\d+$/.exec(browse_type)) {
			opts.user_id = browse_type;
		}

		ui_ctl.beginLoading();
		flickr.photos.search(opts, this.refreshPhotoGroupCallback, !!user);
	},

	onRefreshClick: function() {
		browse_ctl.refreshPhotoGroup({page:1, no_delay:true, updatepos:true});
	},
	refreshLinks:function() {
		var c = gmap.getCenter().toUrlValue();
		var z = gmap.getZoom();
		var $tag_curr = $('#browse_taglist').find('.tag_curr');
		if ($tag_curr.size() > 0) {
			$('#links_currentmap').attr('href', '/flickr/#ll='+c+'&z='+z+'&mod=browse&tag='+encodeURIComponent($tag_curr.text())+'&sort='+settings_ctl.browse_sortby+'&perpage='+settings_ctl.browse_perpage+'&page='+browse_ctl.page);
		} else {
			$('#links_currentmap').attr('href', '/flickr/#ll='+c+'&z='+z+'&mod=browse&sort='+settings_ctl.browse_sortby+'&perpage='+settings_ctl.browse_perpage+'&page='+browse_ctl.page);
		}
	},
	onMapDragend: function() {
		ui_ctl.savePosition();

		browse_ctl.refreshLinks();
		if (!browse_ctl.isNeedRefresh()) return;
		if (settings_ctl.refresh !== 'auto') return;

		browse_ctl.refreshPhotoGroup({page:1, updatepos:true});
	},
	onMapZoomend: function() {
		ui_ctl.savePosition();

		browse_ctl.refreshLinks();
		if (settings_ctl.refresh !== 'auto') return;

		browse_ctl.refreshPhotoGroup({page:1, updatepos:true});
	},
	onActive: function() {
		this._center = this.__timestamp = null;
		ui_ctl._showFocus();
		ui_ctl._showRange();
		ui_ctl._showRefreshControl();
		$('#links_findmylocation').show();
		$('#links_currentmap').show();
		browse_ctl.refreshLinks();

		this.refreshPhotoGroup({no_delay:true, updatepos:true});
	},
	onDeActive: function() {
		ui_ctl._hideFocus();
		ui_ctl._hideRange();
		ui_ctl._hideRefreshControl();
		$('#links_findmylocation').hide();
		$('#links_currentmap').hide();
		this.clearGroupMarker();
		ui_ctl.endLoading();
	}
};


var recent_ctl = {
	__markers: [],
	create: function() {
		$('<a id="recent_switch" href="javascript:void(0)">Recent</a>').appendTo('.switch');
	},
	init: function() {
	},
	onActive: function() {
		flickr.panda.getPhotos({panda_name:'wang wang'}, function(rsp) {
			var photos = [];
			flickr.parsePhotos(photos,rsp,true);

			var n=-90,s=90,e=-180,w=180;
			$.each(photos, function(i,p) {
				if (!p.hasGeo()) return;

				if (n < p.lat) n = p.lat;
				if (s > p.lat) s = p.lat;
				if (e < p.lng) e = p.lng;
				if (w > p.lng) w = p.lng;
			});

			var dh = (n-s)/10;
			var bounds = new GLatLngBounds(new GLatLng(s,w), new GLatLng(n+dh,e-dh));
			var zoom = gmap.getBoundsZoomLevel(bounds);

			gmap.setCenter(bounds.getCenter(), zoom);

			var pgrps = common_ctl.caculatePhotoGroups(photos);

			$.each(pgrps, function(i,pg) {
				if (pg.photos.length === 0) return;

				var marker = common_ctl.createGroupMarker(pg);
//				GEvent.addListener(marker, "click", phoset_ctl.onGroupMarkerClick);
				recent_ctl.__markers.push(marker);
				gmap.addOverlay(marker);
			});
		});
	},
	onDeActive: function() {
		$.each(this.__markers, function(i,ov) { gmap.removeOverlay(ov); });
		this.__markers = [];
	}
};


var geotag_ctl = {
	page: 1,
	pages: 0,
	selected: [],
	curr_photo_list: null,
	curr_gpx: [],
	curr_marker: null,

	create: function() {
		if (!user) return;

		$('<a id="geotag_switch" href="javascript:void(0)">GeoTagging</a>').appendTo('.switch');

		$(
		'<div id="geotag_tab" class="tab">'+
			'<div class="tabrow" style="height:2em;">'+
				'<select id="geotag_filter">'+
					'<option value="0" title="Select">Select filter...</option>'+
					'<option value="all" title="All your content">All your content</option>'+
					'<option value="uploaded">Your recent uploaded content</option>'+
					'<option value="updated">Your recent updated content</option>'+
					'<option value="notag">Your non-tagged content</option>'+
					'<option value="noset">Your content not in a set</option>'+
					'<option value="geotag">Your geotagged content</option>'+
					'<option value="nogeotag">Your non-geotagged content</option>'+
					'<option value="inrange">Your content in this range</option>'+
					'<optgroup label="Your sets" id="photoset_optgroup"></optgroup>'+
					'<optgroup label="Popular Tags" id="populartags_optgroup"></optgroup>'+
					'<optgroup label="Your groups" id="publicgroups_optgroup"></optgroup>'+
				'</select>'+
			'</div>'+
			'<div class="tabrow" style="height:2em;">'+
				'<span>Load GPX file:'+
					'<form id="geotag_upload_file_form" action="/gpxupload/preview" target="geotag_upload_file_iframe" enctype="multipart/form-data" method="post" style="display:inline;">'+
						'<input name="upload_file_input" type="file"/> <input id="geotag_upload_file_preview" type="submit" value="Show"/> <input id="geotag_upload_file_clear" type="submit" value="Clear"/>'+
					'</form>'+
					'<iframe name="geotag_upload_file_iframe" style="border:0 none; padding:0; height:0; width:0; position:absolute;"></iframe>'+
				'</span>'+
			'</div>'+
			'<div class="tabrow" style="height:2em;">'+
				'<span id="geotag_perpage" style="float:right;">'+
					'<span id="geotag_perpage_25" class="perpage_num">25</span><span id="geotag_perpage_50" class="perpage_num">50</span><span id="geotag_perpage_100" class="perpage_num">100</span><span id="geotag_perpage_200" class="perpage_num">200</span>'+
				'</span>'+
				'<span id="geotag_pager"></span>'+
			'</div>'+
			'<div class="tabrow" style="height:2em;">'+
				'<span id="geotag_viewas" style="float:right;">'+
					'<span id="geotag_viewas_icons" class="viewas_type" type="icons">Icons</span><span id="geotag_viewas_thumb" class="viewas_type" type="thumb">Thumbnail</span><span id="geotag_viewas_detail" class="viewas_type" type="detail">Detail</span>'+
				'</span>'+
				'<span id="geotag_operation" style="display:none;">'+
					'<a id="geotag_set_location" href="javascript:void(0)">Set Location</a> <a id="geotag_clear_location" href="javascript:void(0)">Clear Location</a>'+
				'</span>'+
			'</div>'+
			'<div id="geotag_photolist" class="photolist" style="top:8em;"></div>'+
		'</div>').appendTo('#tabs');

		// load setting
		$('#geotag_perpage').find('span').attr('class', 'perpage_num');
		$('#geotag_perpage_'+settings_ctl.geotag_perpage).attr('class', 'perpage_curr');
		$('#geotag_viewas').find('span').attr('class', 'viewas_type');
		$('#geotag_viewas_'+settings_ctl.geotag_viewas).attr('class', 'viewas_curr');
	},

	init: function() {
		if (!user) return;

		flickr.photosets.getList( {user_id:user.nsid}, function(rsp, params, api) {
			if (!rsp || !rsp.photosets || !rsp.photosets.photoset) return;

			var $sel = $('#photoset_optgroup').empty();
			$.each(rsp.photosets.photoset, function(i,ps) { $sel.append('<option value="set-'+ps.id+'" title="'+ps.description._content+'">'+ps.title._content+' ('+ps.photos+')</option>'); });
		});
		flickr.people.getPublicGroups( {user_id:user.nsid}, function(rsp, params, api) {
			if (!rsp || !rsp.groups || !rsp.groups.group) return;

			var $sel = $('#publicgroups_optgroup').empty();
			$.each(rsp.groups.group, function(i,gp) { $sel.append('<option value="grp-'+gp.nsid+'">'+gp.name+'</option>'); });
		});
		flickr.tags.getListUserPopular( {user_id:user.nsid}, function(rsp, params, api) {
			if (!rsp || !rsp.who || !rsp.who.tags || !rsp.who.tags.tag) return;

			var $sel = $('#populartags_optgroup').empty();
			$.each(rsp.who.tags.tag, function(i,t) { $sel.append('<option value="tag-'+t._content+'">'+t._content+'</option>'); });
		});

		$('#geotag_filter').change(function() {
			geotag_ctl.selected = [];
			$('#geotag_operation').hide();
			geotag_ctl.refreshPhotoList({page:1});
		});

		$('#geotag_set_location').click(function() {
			if (!confirm("Save Location?")) return;

			var $focus = $('#focus');
			var ll = parseInt($focus.css('left'),10);
			var tt = parseInt($focus.css('top'),10);

			var latlng = gmap.fromContainerPixelToLatLng(new GPoint(ll+21, tt+21));
			var zoom = gmap.getZoom();
			if (zoom < 1) zoom = 1;
			if (zoom > 16) zoom = 16;

			//ui_ctl.beginLoading();
			var total = geotag_ctl.selected.length;
			ui_ctl.showSaving('Saving 1 / ' + total);

			var opts = { photo_id:geotag_ctl.selected[0], lat:latlng.lat(), lon:latlng.lng(), accuracy:zoom, _photo_ids:geotag_ctl.selected.concat(), _failed:[] };
			flickr.photos.geo.setLocation( opts, function(rsp, params, api) {
				if (!rsp)
				params._failed.push(params.photo_id);

				params._photo_ids.shift();

				if (params._photo_ids.length > 0) {
					params.photo_id = params._photo_ids[0];
					ui_ctl.showSaving('Saving '+ (total - params._photo_ids.length + 1) +' / ' + total);
					flickr.photos.geo.setLocation( params, arguments.callee);
					return;
				}

				ui_ctl.hideSaving();

				geotag_ctl.selected = [];
				$('#geotag_operation').hide();
				geotag_ctl.refreshPhotoList({});

				if (params._failed.length > 0) {
					ui_ctl.on_message('Saved. ' + params._failed + ' failed.');
				} else {
					ui_ctl.on_message('Save Success.');
				}

				geotag_ctl.hideCurrMarker();
			});
		});

		$('#geotag_clear_location').click(function() {
			if (!confirm("Remove Location?")) return;

			//ui_ctl.beginLoading();
			var total = geotag_ctl.selected.length;
			ui_ctl.showSaving('Removing 1 / ' + total);

			var opts = {photo_id:geotag_ctl.selected[0], _photo_ids:geotag_ctl.selected.concat(), _failed:[]};
			flickr.photos.geo.removeLocation( opts, function(rsp, params, api) {
				if (!rsp)
				params._failed.push(params.photo_id);

				params._photo_ids.shift();

				if (params._photo_ids.length > 0) {
					params.photo_id = params._photo_ids[0];
					ui_ctl.showSaving('Removing '+ (total - params._photo_ids.length + 1) +' / ' + total);
					flickr.photos.geo.removeLocation(params, arguments.callee);
					return;
				}

				ui_ctl.hideSaving();

				geotag_ctl.selected = [];
				$('#geotag_operation').hide();
				geotag_ctl.refreshPhotoList({});

				if (params._failed.length > 0) {
					ui_ctl.on_message('Remove Location. ' + params._failed + ' failed.');
				} else {
					ui_ctl.on_message('Remove Location Success.');
				}

				geotag_ctl.hideCurrMarker();
			});
		});

		$('#geotag_tab').click(function(e) {
			var clickon = e.target.tagName+':'+e.target.className;

			switch (clickon) {
			case 'SPAN:pager_prev': {
				if (geotag_ctl.page - 1 > 0) {
					geotag_ctl.refreshPhotoList({page:geotag_ctl.page-1});
				}
				break;
			}
			case 'SPAN:pager_num': {
				var page = parseInt($(e.target).text(),10);
				if (page === geotag_ctl.page) break;

				geotag_ctl.refreshPhotoList({page:page});
				break;
			}
			case 'SPAN:pager_next': {
				if (geotag_ctl.page + 1 <= geotag_ctl.pages) {
					geotag_ctl.refreshPhotoList({page:geotag_ctl.page-1});
				}
				break;
			}
			case 'SPAN:perpage_num': {
				$('#geotag_perpage').find('span').attr('class', 'perpage_num');
				settings_ctl.geotag_perpage = $(e.target).attr('class', 'perpage_curr').attr('id').replace(/geotag_perpage_/, '');
				settings_ctl._save();
				geotag_ctl.refreshPhotoList({page:1});
				break;
			}
			case 'SPAN:viewas_type': {
				$('#geotag_viewas').find('span').attr('class', 'viewas_type');
				settings_ctl.geotag_viewas = $(e.target).attr('class', 'viewas_curr').attr('type');
				settings_ctl._save();
				if (!geotag_ctl.curr_photo_list) return;

				geotag_ctl.fillPhotoList();
				break;
			}
			case 'INPUT:geotag_sel': {
				var photo = e.target.parentNode.photo;
				if (e.target.checked) {
					geotag_ctl.selected.push(photo.id);
				} else {
					var idx = geotag_ctl.selected.indexOf(photo.id);
					if ( idx >= 0)
					geotag_ctl.selected.splice(idx, 1);
				}

				if (geotag_ctl.selected.length > 0) {
					$('#geotag_operation').show();
				} else {
					$('#geotag_operation').hide();
				}
				break;
			}
			case 'IMG:pos': {
				var photo = e.target.parentNode.parentNode.photo;
				if (!photo) return;
				if (!photo.hasGeo()) return;

				geotag_ctl.showCurrMarker(geotag_ctl.createMarker(photo));
				gmap.setCenter(new GLatLng(photo.lat,photo.lng), photo.acc);

				break;
			}
			}
		});

		$('#geotag_upload_file_clear').click(function() {
			geotag_ctl.hideGPX(true);
			return false;
		});
		$('#geotag_upload_file_preview').click(function() {
			ui_ctl.beginLoading();
			$('#geotag_upload_file_form').attr('action','/gpxupload/preview?cb=window.parent.geotag_parse_upload_gpx').submit();
			return false;
		});
		window.geotag_parse_upload_gpx = function(rsp) {
			try {
				if (!mod_ctl) return;

				if (rsp.stat !== 'ok') {
					ui_ctl.on_error(rsp.message);
				} else {
					geotag_ctl.showGPX(rsp.gpx);
				}
			} finally {
				ui_ctl.endLoading();
			}
		};

//	$('#phoset_upload_file_clear').click(function() {
//		mod_ctl.getModCtl('phoset').hideGPX(true);
//		return false;
//	});
//	$('#phoset_upload_file_preview').click(function() {
//		ui_ctl.beginLoading();
//		$('#phoset_upload_file_form').attr('action','/gpxupload/preview?cb=window.parent.phoset_gpx_preview').submit();
//		return false;
//	});
//	window.phoset_gpx_preview = function(rsp) {
//		try {
//			if (!mod_ctl) return;
//
//			if (rsp.stat !== 'ok') {
//				ui_ctl.on_error(rsp.message);
//			} else {
//				mod_ctl.getModCtl('phoset').showGPX(rsp.gpx);
//			}
//		} finally {
//			ui_ctl.endLoading();
//		}
//	};
//
//	$('#phoset_upload_file_save').click(function() {
//		ui_ctl.beginLoading();
//		$('#phoset_upload_file_form').attr('action','/gpxupload/save?cb=window.parent.phoset_gpx_save').submit();
//		return false;
//	});
//	window.phoset_gpx_save = function(rsp) {
//		try {
//		} finally {
//			ui_ctl.endLoading();
//		}
//	};

	},
	hideCurrMarker: function(is_clear) {
		if (geotag_ctl.curr_marker)
		gmap.removeOverlay(geotag_ctl.curr_marker);
		if (is_clear)
		geotag_ctl.curr_marker = null;
	},
	showCurrMarker: function(marker) {
		if (marker) {
			geotag_ctl.hideCurrMarker(true);
			geotag_ctl.curr_marker = marker;
		}
		if (geotag_ctl.curr_marker)
		gmap.addOverlay(geotag_ctl.curr_marker);
	},

	hideGPX: function(is_clear) {
		$.each(geotag_ctl.curr_gpx, function(i,ov) { gmap.removeOverlay(ov); });
		if (is_clear)
		geotag_ctl.curr_gpx = [];
	},
	showGPX: function(gpx) {
		if (gpx) {
			geotag_ctl.hideGPX(true);

			var bound = common_ctl.parseGPX(gpx, geotag_ctl.curr_gpx);

			var zoom = gmap.getBoundsZoomLevel(bound);
			gmap.setCenter(bound.getCenter(), zoom);
		}

		$.each(geotag_ctl.curr_gpx, function(i,ov) { gmap.addOverlay(ov); });
	},

	createMarker: function(photo) {
		var icon = new GIcon();
		icon.image = 'http://flickr-gmap-show.googlecode.com/svn/trunk/pics/marker_image.png';
		icon.shadow = 'http://flickr-gmap-show.googlecode.com/svn/trunk/pics/marker_shadow.png';
		icon.iconSize = new GSize(79, 89);
		icon.shadowSize = new GSize(109, 89);
		icon.iconAnchor = new GPoint(40, 89);
		icon.infoWindowAnchor = new GPoint(79, 50);
		icon.imageMap=[0,0,78,0,78,78,49,78,39,88,39,78,0,78];
		icon.transparent='http://flickr-gmap-show.googlecode.com/svn/trunk/pics/marker_transparent.png';
		icon.label = {url:photo.getIconUrl(), anchor:new GLatLng(2,2), size:new GSize(75,75)};
		return new GMarker(new GLatLng(photo.lat, photo.lng), {icon:icon});
	},
	fillPhotoList: function() {
		var innerpanel = common_ctl.formatPhotoList(geotag_ctl.curr_photo_list, settings_ctl.geotag_viewas, false, true, true, geotag_ctl.selected);
		$("#geotag_photolist").empty().append(innerpanel).get(0).scrollTop = 0;
	},
	onRefreshPhotoList: function(rsp, params, api) {
		try {
			if (!rsp) return;

			geotag_ctl.page = api.getPage(rsp);
			geotag_ctl.pages = api.getPages(rsp);
			common_ctl.makePager($('#geotag_pager'), geotag_ctl.page, geotag_ctl.pages);

			var photos = [];
			api.parsePhotos(photos,rsp);

			geotag_ctl.curr_photo_list = photos;
			geotag_ctl.fillPhotoList();
		} finally {
			ui_ctl.endLoading();
		}
	},
	refreshPhotoList: function(actopt) {
		if (!user) return;

		if (actopt.page) {
			geotag_ctl.page = actopt.page;
		}

		var opts = {page:geotag_ctl.page};
		opts.per_page = settings_ctl.geotag_perpage;

		var filter = $("#geotag_filter").val();
		if (filter === 'all') {
			opts.user_id = user.nsid;
			opts.sort = 'date-posted-desc';
			ui_ctl.beginLoading();
			flickr.photos.search(opts, geotag_ctl.onRefreshPhotoList, true);
		} else if (filter === 'uploaded') {
			opts.user_id = user.nsid;
			opts.min_upload_date = parseInt((+new Date)/1000-30*24*60*60,10);
			opts.sort = 'date-posted-desc';
			ui_ctl.beginLoading();
			flickr.photos.search(opts, geotag_ctl.onRefreshPhotoList, true);
		} else if (filter === 'updated') {
			opts.min_date = parseInt((+new Date)/1000-30*24*60*60,10);
			ui_ctl.beginLoading();
			flickr.photos.recentlyUpdated(opts, geotag_ctl.onRefreshPhotoList);
		} else if (filter === 'notag') {
			ui_ctl.beginLoading();
			flickr.photos.getUntagged(opts, geotag_ctl.onRefreshPhotoList);
		} else if (filter === 'noset') {
			ui_ctl.beginLoading();
			flickr.photos.getNotInSet(opts, geotag_ctl.onRefreshPhotoList);
		} else if (filter === 'geotag') {
			ui_ctl.beginLoading();
			flickr.photos.getWithGeoData(opts, geotag_ctl.onRefreshPhotoList);
		} else if (filter === 'nogeotag') {
			ui_ctl.beginLoading();
			flickr.photos.getWithoutGeoData(opts, geotag_ctl.onRefreshPhotoList);
		} else if (filter === 'inrange') {
			opts.user_id = user.nsid;
			opts.bbox = common_ctl.getRefreshRange();
			opts.sort = 'date-posted-desc';
			ui_ctl.beginLoading();
			flickr.photos.search(opts, geotag_ctl.onRefreshPhotoList, true);
		} else if (/^set\-(\d+)$/.exec(filter)) {
			opts.photoset_id = RegExp.$1;
			ui_ctl.beginLoading();
			flickr.photosets.getPhotos(opts, geotag_ctl.onRefreshPhotoList, true);
		} else if (/^tag\-(.+)$/.exec(filter)) {
			opts.user_id = user.nsid;
			opts.tags = RegExp.$1;
			opts.sort = 'date-posted-desc';
			ui_ctl.beginLoading();
			flickr.photos.search(opts, geotag_ctl.onRefreshPhotoList, true);
		} else if (/^grp\-([a-zA-Z0-9\-\_@]+)$/.exec(filter)) {
			opts.user_id = user.nsid;
			opts.group_id = RegExp.$1;
			ui_ctl.beginLoading();
			flickr.groups.pools.getPhotos(opts, geotag_ctl.onRefreshPhotoList, true);
		} else {
			return;
		}
	},
	onMapDragend: function() {
		ui_ctl.savePosition();
	},
	onMapZoomend: function() {
		ui_ctl.savePosition();
	},
	onActive: function() {
		geotag_ctl.showCurrMarker();
		geotag_ctl.showGPX();
		ui_ctl._showFocus();
	},
	onDeActive: function() {
		geotag_ctl.hideCurrMarker();
		geotag_ctl.hideGPX();
		ui_ctl._hideFocus();
	}
};


var phoset_ctl = {
	photos: [],
	curr_photo_list: null,
	curr_gpx: [],
	__markers: [],

	create: function() {
		if (!user) return;

		$('<a id="phoset_switch" href="javascript:void(0)">Photoset</a>').appendTo('.switch');

		$(
		'<div id="phoset_tab" class="tab">'+
			'<div class="tabrow" style="height:2em;">'+
				'<select id="phoset_photoset_list">'+
					'<option value="0" title="Select">Select photoset...</option>'+
				'</select>'+
			'</div>'+
//			'<div class="tabrow">'+
//				'<span>Load GPX file:'+
//					'<form id="phoset_upload_file_form" action="/gpxupload/preview" target="phoset_upload_file_iframe" enctype="multipart/form-data" method="post" style="display:inline;">'+
//						'<input name="upload_file_input" type="file"/> <input id="phoset_upload_file_preview" type="submit" value="Show"/> <input id="phoset_upload_file_clear" type="submit" value="Clear"/> <input id="phoset_upload_file_save" type="submit" value="Save"/>'+
//					'</form>'+
//					'<iframe name="phoset_upload_file_iframe" style="border:0 none; padding:0; height:0; width:0; position:absolute;"></iframe>'+
//				'</span>'+
//			'</div>'+
			'<div class="tabrow" style="height:2em;">'+
				'<span id="phoset_viewas" style="float:right;">'+
					'<span id="phoset_viewas_icons" class="viewas_type" type="icons">Icons</span><span id="phoset_viewas_thumb" class="viewas_type" type="thumb">Thumbnail</span><span id="phoset_viewas_detail" class="viewas_type" type="detail">Detail</span>'+
				'</span>'+
			'</div>'+
			'<div id="phoset_photolist" class="photolist" style="top:4em;"></div>'+
		'</div>').appendTo('#tabs');

		$('<a id="links_photoset" style="display:none;"><img class="link" src="/images/transparent.png"/>Link</a>').appendTo('span.links');
		$('<div id="links_photoset_panel" class="popup_panel" style="position:absolute; top:27px; right:10px; z-index:7; padding:5px 5px 10px 10px; display:none;">'+
			'<img class="close" src="/images/transparent.png" style="float:right;"/>'+
			'<div>Paste link in <b>email</b> or <b>IM</b><br/>'+
			'<input id="links_photoset_url" type="text" tabindex="400" style="width:29em;"/></div>'+
			'<div>Paste HTML to embed in website<br/>'+
			'<input id="links_photoset_html" type="text" tabindex="401" style="width:29em;"/></div>'+
		'</div>').appendTo('#mainbar');
		$('#links_photoset_panel .close').click(function(){ $(this.parentNode).hide(); });
		$('#links_photoset_panel input').click(function(){ this.select(); });

		// load setting
		$('#phoset_viewas').find('span').attr('class', 'viewas_type');
		$('#phoset_viewas_'+settings_ctl.phoset_viewas).attr('class', 'viewas_curr');
	},

	init: function() {
		if (!user) return;

		flickr.photosets.getList( {user_id:user.nsid}, function(rsp, params, api) {
			if (!rsp || !rsp.photosets || !rsp.photosets.photoset) return;

			var $sel = $('#phoset_photoset_list');
			$.each(rsp.photosets.photoset, function(i, ps) { $sel.append('<option value="set-'+ps.id+'" title="'+ps.description._content+'">'+ps.title._content+' ('+ps.photos+')</option>'); });
		});

		$('#phoset_photoset_list').change(function() {
			if (! /^set\-(\d+)$/.exec($(this).val())) return;

			var photoset_id = RegExp.$1;
			phoset_ctl.onActive();
			phoset_ctl.loadPhotoSet(photoset_id);
		});

		$('#links_photoset').click(function() {
			try {
				$('#links_photoset_url').val(this.href);
				$('#links_photoset_html').val('<iframe width="425" height="350" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="'+this.href+'"></iframe>');
				$('#links_photoset_panel').show();
			} finally { return false; }
		});

		$('#phoset_tab').click(function(e) {
			var clickon = e.target.tagName+':'+e.target.className;

			switch (clickon) {
			case 'SPAN:viewas_type': {
				$('#phoset_viewas').find('span').attr('class', 'viewas_type');
				settings_ctl.phoset_viewas = $(e.target).attr('class', 'viewas_curr').attr('type');
				settings_ctl._save();
				if (!phoset_ctl.curr_photo_list) return;

				phoset_ctl.fillPhotoList();
				break;
			}

			case 'IMG:f_icon':
			case 'IMG:f_thumb':
			case 'DIV:imgtitle': {
				var p = e.target.parentNode.parentNode.parentNode.photo;
				if (!p) return;

				mod_ctl.showmode.showPhoto(p);
				return false;
			}
			}
		});
	},
	loadPhotoSet: function(photoset_id) {
		ui_ctl.beginLoading();
		phoset_ctl.photos = [];

		var issign = (user) ? true : false;
		flickr.photosets.getPhotos( {photoset_id:photoset_id, page:1, per_page:200}, function(rsp, params, api) {
			if (mod_ctl.getCurrentMod() !== 'phoset') {
				return;
			}

			var isfinal = false;
			try {

				if (!rsp) return;

				var page = api.getPage(rsp);
				var pages = api.getPages(rsp);

				$.each(rsp.photoset.photo, function(i,p) { p.owner = rsp.photoset.owner; });
				api.parsePhotos(phoset_ctl.photos,rsp,true);

				phoset_ctl.regroupPhotos(true);

				if ( page < pages) {
					params.page = page + 1;
					flickr.photosets.getPhotos(params, arguments.callee, issign);
					return;
				}

				isfinal = true;

				if (phoset_ctl.photos.length === 0) {
					ui_ctl.on_error('This set have no geotagged photo.');
				}
			} finally {
				if (isfinal) {
					ui_ctl.endLoading();
				}
			}
		}, issign);
	},

	clearGroupMarker: function() { $.each(this.__markers, function(i,m) { gmap.removeOverlay(m); }); },
	loadGroupMarker: function() { $.each(this.__markers, function(i,m) { gmap.addOverlay(m); }); },

	regroupPhotos: function(fit_view) {
		if (this.photos.length == 0) return;

		if (fit_view) {
			var n=-90,s=90,e=-180,w=180;
			$.each(this.photos, function(i,p) {
				if (!p.hasGeo()) return;

				if (n < p.lat) n = p.lat;
				if (s > p.lat) s = p.lat;
				if (e < p.lng) e = p.lng;
				if (w > p.lng) w = p.lng;
			});

			var dh = (n-s)/10;
			var bounds = new GLatLngBounds(new GLatLng(s,w), new GLatLng(n+dh,e-dh));
			var zoom = gmap.getBoundsZoomLevel(bounds);

			gmap.setCenter(bounds.getCenter(), zoom);
		}

		var pgrps = common_ctl.caculatePhotoGroups(this.photos);

		phoset_ctl.clearGroupMarker();
		this.__markers = [];

		$.each(pgrps, function(i,pg) {
			if (pg.photos.length === 0) return;

			var marker = common_ctl.createGroupMarker(pg);
			GEvent.addListener(marker, "click", phoset_ctl.onGroupMarkerClick);
			phoset_ctl.__markers.push(marker);
			gmap.addOverlay(marker);
		});
	},

	fillPhotoList: function() {
		var innerpanel = common_ctl.formatPhotoList(phoset_ctl.curr_photo_list, settings_ctl.phoset_viewas, false);
		$("#phoset_photolist").empty().append(innerpanel).get(0).scrollTop = 0;
	},

	onGroupMarkerClick: function() {
		phoset_ctl.curr_photo_list = this.photos;
		phoset_ctl.fillPhotoList();
		ui_ctl.expendPanel();
	},

	hideGPX: function(is_clear) {
		$.each(phoset_ctl.curr_gpx, function(i,ov) { gmap.removeOverlay(ov); });
		if (is_clear)
		phoset_ctl.curr_gpx = [];
	},
	showGPX: function(gpx) {
		if (gpx) {
			phoset_ctl.hideGPX(true);

			var bound = common_ctl.parseGPX(gpx, phoset_ctl.curr_gpx);

			var zoom = gmap.getBoundsZoomLevel(bound);
			gmap.setCenter(bound.getCenter(), zoom);
		}

		$.each(phoset_ctl.curr_gpx, function(i,ov) { gmap.addOverlay(ov); });
	},


	onMapDragend: function() {},
	onMapZoomend: function() { phoset_ctl.regroupPhotos(); },
	onActive: function() {
		var val = $('#phoset_photoset_list').val();
		phoset_ctl.showGPX();
		phoset_ctl.loadGroupMarker();

		if (! /^set\-(\d+)$/.exec(val)) return;
		var photoset_id = RegExp.$1;
		$('.popup_panel').hide();
		$('#links_photoset').attr('href', '/show?fset='+photoset_id).show();
	},
	onDeActive: function() {
		$('#links_photoset').hide();
		ui_ctl.endLoading();
		phoset_ctl.hideGPX();
		phoset_ctl.clearGroupMarker();
	}
};


var show_ctl = {
	_photosets: [],
	curr_photo_list: null,
	_markers: [],

	create: function() {
		$(
		'<div id="show_tab" class="tab">'+
			'<div id="show_photolist" class="photolist" style="top:.5em;"></div>'+
		'</div>').appendTo('#tabs');
	},
	init: function() {
		$('#show_title_dropdn_toggle').click(function() {
			$('#show_title_dropdn').slideToggle('fast');
		});
		$('#show_title_dropdn').click(function(e) {
			var clickon = e.target.tagName+':'+e.target.className;

			switch (clickon) {
			case 'INPUT:photoset': {
				e.target.parentNode.photoset.show = e.target.checked;
				show_ctl.refreshTitle();
				show_ctl.regroupPhotos();
			}
			}
		});
		$('#show_tab').click(function(e) {
			var clickon = e.target.tagName+':'+e.target.className;

			switch (clickon) {
			case 'IMG:f_icon':
			case 'IMG:f_thumb':
			case 'DIV:imgtitle': {
				var p = e.target.parentNode.parentNode.parentNode.photo;
				if (!p) return;

				mod_ctl.showmode.showPhoto(p);
				return false;
			}
			}
		});
	},

	refreshTitle: function() {
		var t = '';
		$.each(show_ctl._photosets, function(i,photoset) {
			if (photoset.show) {
				t += '<a target="_blank" href="http://www.flickr.com/photos/'+photoset.owner+'/sets/'+photoset.id+'/">'+photoset.title+'</a>';
			}
		});
		$('#settitle').html(t);
	},

	loadPhotoSet: function(photoset_id) {
		var photoset = {id:photoset_id, title:'', owner:'', photos:[], show:true};

		ui_ctl.beginLoading();

		flickr.photosets.getInfo({_photoset:photoset, photoset_id:photoset_id}, function(rsp, params) {
			if (!rsp || !rsp.photoset || params._photoset.id != rsp.photoset.id) return;

			params._photoset.owner = rsp.photoset.owner;
			params._photoset.title = rsp.photoset.title._content;
			params._photoset.imgurl = 'http://farm'+rsp.photoset.farm+'.static.flickr.com/'+rsp.photoset.server+'/'+rsp.photoset.primary+'_'+rsp.photoset.secret+'_s.jpg';

			show_ctl._photosets.push(params._photoset);

			$phosel = $('<div><input class="photoset" type="checkbox" checked="true"></input> <img style="width:30px;height:30px;" src="'+params._photoset.imgurl+'"/> '+params._photoset.title+'</div>');
			$('#show_title_dropdn').append($phosel.get(0));
			$phosel.get(0).photoset = params._photoset;

			show_ctl.refreshTitle();

			params.page = 1;
			params.per_page = 200;

			flickr.photosets.getPhotos(params, function(rsp, params, api) {
				var isfinal = false;
				try {
					if (!rsp) return;

					var page = api.getPage(rsp);
					var pages = api.getPages(rsp);

					$.each(rsp.photoset.photo, function(i,p) { p.owner = rsp.photoset.owner; });
					api.parsePhotos(params._photoset.photos,rsp,true);

					show_ctl.regroupPhotos(true);

					if ( page < pages) {
						params.page = page + 1;
						flickr.photosets.getPhotos(params, arguments.callee);
						return;
					}

					isfinal = true;

					if (params._photoset.length === 0) {
						ui_ctl.on_error('This set have no geotagged photo.');
					}
				} finally {
					if (isfinal)
					ui_ctl.endLoading();
				}
			});
		});
	},

	clearGroupMarker: function() {
		$.each(this._markers, function(i,m) { gmap.removeOverlay(m); });
	},
	loadGroupMarker: function() {
		$.each(this._markers, function(i,m) { gmap.addOverlay(m); });
	},
	regroupPhotos: function(fit_view) {
		if (this._photosets.length == 0) return;

		var photos = [];
		$.each(this._photosets, function(i,photoset) {
			if (!photoset.show) return;

			$.each(photoset.photos, function(i,p) {
				photos.push(p);
			});
		});

		if (fit_view) {
			var n=-90,s=90,e=-180,w=180;
			$.each(photos, function(i,p) {
				if (!p.hasGeo()) return;

				if (n < p.lat) n = p.lat;
				if (s > p.lat) s = p.lat;
				if (e < p.lng) e = p.lng;
				if (w > p.lng) w = p.lng;
			});

			var dh = (n-s)/10;
			var bounds = new GLatLngBounds(new GLatLng(s,w), new GLatLng(n+dh,e-dh));
			var zoom = gmap.getBoundsZoomLevel(bounds);

			gmap.setCenter(bounds.getCenter(), zoom);
		}

		var pgrps = common_ctl.caculatePhotoGroups(photos);

		show_ctl.clearGroupMarker();
		this._markers = [];

		$.each(pgrps, function(i,pg) {
			if (pg.photos.length === 0) return;

			var marker = common_ctl.createGroupMarker(pg);
			GEvent.addListener(marker, "click", show_ctl.onGroupMarkerClick);
			show_ctl._markers.push(marker);
			gmap.addOverlay(marker);
		});
	},

	fillPhotoList: function() {
		var innerpanel = common_ctl.formatPhotoList(show_ctl.curr_photo_list, 'thumb');
		$("#show_photolist").empty().append(innerpanel).get(0).scrollTop = 0;
	},

	onGroupMarkerClick: function() {
		$.each(show_ctl._markers, function(i,m) {
			m.setImage(m.getIcon().image);
		});
		this.setImage(this.getIcon().image.replace('.png', 's.png'));

		show_ctl.curr_photo_list = this.photos;
		show_ctl.fillPhotoList();
		ui_ctl.expendPanel();
	},

	onMapDragend: function() {},
	onMapZoomend: function() { show_ctl.regroupPhotos(); },
	onActive: function() {
		show_ctl.loadGroupMarker();
	},
	onDeActive: function() {
		show_ctl.clearGroupMarker();
	}
};


mod_ctl = {
	mods: {common:common_ctl, browse:browse_ctl, recent:recent_ctl, geotag:geotag_ctl, phoset:phoset_ctl, show:show_ctl},
	shows: {showpanel:showpanel_ctl, embedpanel:embedpanel_ctl},
	showmode: null,
	last_mod: null,
	getModCtl: function(mod) { return this.mods[mod]; },
	getCurrentMod: function() { return this.last_mod; },
	getCurrentModCtl: function() { return this.mods[this.last_mod]; },
	init: function(mods) {
		$.each(mods, function(k,v) {
			mod_ctl.mods[v].create();
		});
	},
	init_show: function(mod) {
		if (mod === 'showpanel') {
			showpanel_ctl.init();
			mod_ctl.showmode = showpanel_ctl;
		} else if (mod === 'embedpanel') {
			embedpanel_ctl.init();
			mod_ctl.showmode = embedpanel_ctl;
		}
	},
	switchTo: function(mod) {
		if (mod === this.last_mod) return;
		$('.tab').hide();
		$('#'+mod+'_tab').show();
		$('.switch a').removeClass('sel');
		$('#'+mod+'_switch').addClass('sel');
		if (this.last_mod) {
			this.getCurrentModCtl().onDeActive();
		}
		this.last_mod = mod;
		if (!this.getCurrentModCtl().__inited) {
			this.getCurrentModCtl().__inited = true;
			this.getCurrentModCtl().init();
		}
		$('.popup_panel').hide();
		this.getCurrentModCtl().onActive();

		mod_ctl.showmode.hide();
		return this.getCurrentModCtl();
	}
};

})();
